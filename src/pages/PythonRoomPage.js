import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code2,
  Copy,
  Eye,
  History,
  LogOut,
  MessageSquare,
  PencilLine,
  Play,
  RotateCcw,
  Save,
  TerminalSquare,
  UserPlus,
} from 'lucide-react';
import ACTIONS from '../Actions';
import Chat from '../components/Chat';
import Client from '../components/Client';
import CollaborativeCodeEditor from '../components/CollaborativeCodeEditor';
import RoomCodeLoader from '../components/RoomCodeLoader';
import { useAuth } from '../context/AuthContext';
import { initSocketJS } from '../socket';
import { executeCode } from '../utils/executeApi';
import { getRoomRoute } from '../utils/roomLanguage';
import { checkoutRoomSnapshot, createRoomSnapshot, getRoomSnapshots } from '../utils/snapshotApi';
import { getRoomById, inviteUserToRoom, updateRoom } from '../utils/roomApi';

const DEFAULT_PYTHON_CODE = `print("Hello, World!")`;

const formatExecutionResult = ({ output = '', error = '', status = 'unknown', exitCode, time = '', total = '', memory = '' }) => {
  const sections = [];

  sections.push(`status: ${status}`);
  if (typeof exitCode !== 'undefined') {
    sections.push(`exit_code: ${exitCode}`);
  }
  if (time) {
    sections.push(`time: ${time}s`);
  }
  if (total) {
    sections.push(`total: ${total}s`);
  }
  if (memory) {
    sections.push(`memory: ${memory} KB`);
  }

  const header = sections.join(' | ');
  const body = output || error || 'Execution finished with no output.';

  if (output && error) {
    return `${header}\n\nstdout:\n${output}\n\nstderr:\n${error}`;
  }

  return `${header}\n\n${body}`;
};

const PythonRoomPage = () => {
  const socketRef = useRef(null);
  const roomLoadedRef = useRef(false);
  const codeRef = useRef({ python: '', pythonInput: '' });
  const latestCodeRef = useRef({ python: '', pythonInput: '' });

  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryRole = new URLSearchParams(location.search).get('role');
  const username = location.state?.username || user?.name || 'Anonymous';
  const initialRoleRef = useRef(location.state?.role === 'spectator' || queryRole === 'spectator' ? 'spectator' : 'editor');
  const participantIdRef = useRef(location.state?.participantId || `participant-${Date.now()}`);
  const [userRole, setUserRole] = useState(initialRoleRef.current);
  const userRoleRef = useRef(initialRoleRef.current);
  const isSpectator = userRole === 'spectator';

  const [pythonCode, setPythonCode] = useState(localStorage.getItem(`pythonCode_${roomId}`) || DEFAULT_PYTHON_CODE);
  const [pythonInput, setPythonInput] = useState(localStorage.getItem(`pythonInput_${roomId}`) || '');
  const [clients, setClients] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [socketsReady, setSocketsReady] = useState(false);
  const [joinStatus, setJoinStatus] = useState('connecting');
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState('');
  const [roomLoadRetryKey, setRoomLoadRetryKey] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapseEditor, setCollapseEditor] = useState({
    python: false,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadChatMessage, setHasUnreadChatMessage] = useState(false);
  const [output, setOutput] = useState('Run Python to see the output here...');
  const [runMeta, setRunMeta] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(false);
  const [isSnapshotSaving, setIsSnapshotSaving] = useState(false);
  const [isCheckingOutSnapshot, setIsCheckingOutSnapshot] = useState(false);
  const [currentSnapshotId, setCurrentSnapshotId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteSending, setIsInviteSending] = useState(false);
  const pythonMode = useMemo(() => ({ name: 'python', version: 3 }), []);

  useEffect(() => {
    if (isChatOpen) {
      setHasUnreadChatMessage(false);
    }
  }, [isChatOpen]);

  const applyRoomCode = (nextCode = {}) => {
    const nextPython = nextCode.python || DEFAULT_PYTHON_CODE;
    const nextPythonInput = nextCode.pythonInput || '';

    codeRef.current.python = nextPython;
    codeRef.current.pythonInput = nextPythonInput;
    latestCodeRef.current = {
      python: nextPython,
      pythonInput: nextPythonInput,
    };

    setPythonCode(nextPython);
    setPythonInput(nextPythonInput);
  };

  useEffect(() => {
    localStorage.setItem(`pythonCode_${roomId}`, pythonCode);
    codeRef.current.python = pythonCode;
    latestCodeRef.current.python = pythonCode;
  }, [pythonCode, roomId]);

  useEffect(() => {
    localStorage.setItem(`pythonInput_${roomId}`, pythonInput);
    codeRef.current.pythonInput = pythonInput;
    latestCodeRef.current.pythonInput = pythonInput;
  }, [pythonInput, roomId]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    let cancelled = false;

    const loadRoom = async () => {
      roomLoadedRef.current = false;
      setRoomLoadError('');
      setIsRoomLoading(true);

      try {
        const data = await getRoomById(roomId);
        if (cancelled) {
          return;
        }

        const room = data.room;
        if (!room) {
          setRoomLoadError('This room could not be found. Please check the link or go back to the dashboard.');
          return;
        }

        applyRoomCode(room.code || {});
        roomLoadedRef.current = true;
      } catch (error) {
        if (!cancelled) {
          const message = error.response?.data?.message || 'Unable to load room data.';
          setRoomLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setIsRoomLoading(false);
        }
      }
    };

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId, roomLoadRetryKey]);

  useEffect(() => {
    const loadSnapshots = async () => {
      setIsSnapshotsLoading(true);
      try {
        const data = await getRoomSnapshots(roomId);
        setSnapshots(data.snapshots || []);
        setCurrentSnapshotId(data.headSnapshotId || null);
      } catch (error) {
        console.error('Failed to load Python room snapshots', error);
      } finally {
        setIsSnapshotsLoading(false);
      }
    };

    loadSnapshots();
  }, [roomId]);

  useEffect(() => {
    if (!roomLoadedRef.current) {
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        await updateRoom(roomId, {
          lastOpenedAt: new Date().toISOString(),
          code: {
            python: pythonCode,
            pythonInput,
          },
        });
      } catch (error) {
        console.error('Failed to persist Python room', error);
      }
    }, 900);

    return () => clearTimeout(timeout);
  }, [pythonCode, pythonInput, roomId]);

  useEffect(() => {
    const flushRoomState = async () => {
      if (!roomLoadedRef.current) {
        return;
      }

      try {
        await updateRoom(roomId, {
          lastOpenedAt: new Date().toISOString(),
          code: {
            python: latestCodeRef.current.python,
            pythonInput: latestCodeRef.current.pythonInput,
          },
        });
      } catch (error) {
        console.error('Failed to flush Python room state on exit', error);
      }
    };

    const handlePageHide = () => {
      flushRoomState();
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      flushRoomState();
    };
  }, [roomId]);

  useEffect(() => {
    if (isRoomLoading || !roomLoadedRef.current) {
      return undefined;
    }

    let cancelled = false;

    const initSocket = async () => {
      try {
        socketRef.current = await initSocketJS();

        const handleErrors = (err) => {
          console.error('Socket connection error:', err);
          toast.error('Socket connection failed. Please try again.');
          navigate('/');
        };

        socketRef.current.on('connect_error', handleErrors);
        socketRef.current.on(ACTIONS.JOIN_ERROR, ({ message }) => {
          toast.error(message || 'Unable to join this room.');
          navigate('/home');
        });
        socketRef.current.on(ACTIONS.JOIN_PENDING, ({ pendingClients: incomingPendingClients }) => {
          setJoinStatus('pending');
          setPendingClients(incomingPendingClients || []);
        });
        socketRef.current.on(ACTIONS.JOIN_REQUEST, ({ pendingClients: incomingPendingClients }) => {
          setPendingClients(incomingPendingClients || []);
        });
        socketRef.current.on(ACTIONS.JOIN_APPROVED, () => {
          setJoinStatus('approved');
          setSocketsReady(true);
        });

        const joinPayload = {
          roomId,
          username,
          role: initialRoleRef.current,
          participantId: participantIdRef.current,
          userId: user?.id || null,
        };
        socketRef.current.emit(ACTIONS.JOIN, joinPayload);

        socketRef.current.on(ACTIONS.JOINED, ({ clients: joinedClients, pendingClients: incomingPendingClients, username: joinedUsername, socketId, participantId }) => {
          if (joinedUsername && joinedUsername !== username) {
            toast.success(`${joinedUsername} has joined the room!`);
          }

          setClients(joinedClients);
          setPendingClients(incomingPendingClients || []);

          if (joinedClients.some((client) => client.participantId === participantIdRef.current)) {
            setJoinStatus('approved');
            setSocketsReady(true);
          }

          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current.python,
            socketId,
            participantId,
            editorType: 'python',
          });
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current.pythonInput,
            socketId,
            participantId,
            editorType: 'python-input',
          });
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftUsername, clients: updatedClients, pendingClients: incomingPendingClients }) => {
          toast.success(`${leftUsername} has left the room`);
          setPendingClients(incomingPendingClients || []);
          if (updatedClients) {
            setClients(updatedClients);
          } else {
            setClients((current) => current.filter((client) => client.socketId !== socketId));
          }
        });

        socketRef.current.on(ACTIONS.ROLE_CHANGED, ({ clients: updatedClients, pendingClients: incomingPendingClients, participantId, role, username: changedUsername }) => {
          setClients(updatedClients);
          setPendingClients(incomingPendingClients || []);

          if (participantId === participantIdRef.current) {
            setUserRole(role);
            toast.success(`You are now an ${role}.`);
            return;
          }

          toast.success(`${changedUsername} is now an ${role}.`);
        });

        socketRef.current.on(ACTIONS.SYNC_CODE, (payload) => {
          if (payload?.editorType === 'python' && typeof payload?.code === 'string') {
            codeRef.current.python = payload.code;
            setPythonCode(payload.code);
          }

          if (payload?.editorType === 'python-input' && typeof payload?.code === 'string') {
            codeRef.current.pythonInput = payload.code;
            setPythonInput(payload.code);
          }
        });

        socketRef.current.on(ACTIONS.CODE_CHANGE, (payload) => {
          if (payload?.editorType === 'python' && typeof payload?.code === 'string') {
            setPythonCode(payload.code);
          }

          if (payload?.editorType === 'python-input' && typeof payload?.code === 'string') {
            setPythonInput(payload.code);
          }
        });

        socketRef.current.on('code-output', ({ output: remoteOutput, username: remoteUsername, metadata }) => {
          const remoteText = remoteOutput || 'Execution finished with no output.';
          setOutput(`${remoteUsername || 'A collaborator'} ran Python:\n\n${remoteText}`);
          setRunMeta(metadata || null);
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to init Python room socket', error);
          toast.error('Failed to connect to collaboration servers.');
          navigate('/');
        }
      }
    };

    initSocket();

    return () => {
      cancelled = true;
      setSocketsReady(false);
      setJoinStatus('connecting');
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isRoomLoading, navigate, roomId, username, user?.id]);

  const isLeader = clients.some((client) => client.participantId === participantIdRef.current && client.isLeader);

  const handleRoleChange = (targetParticipantId, nextRole) => {
    if (!socketRef.current || !isLeader) {
      return;
    }

    socketRef.current.emit(ACTIONS.UPDATE_ROLE, {
      roomId,
      participantId: targetParticipantId,
      role: nextRole,
    });
  };

  const admitParticipant = (targetParticipantId) => {
    if (!socketRef.current || !isLeader) {
      return;
    }

    socketRef.current.emit(ACTIONS.ADMIT_PARTICIPANT, {
      roomId,
      participantId: targetParticipantId,
    });
  };

  const runCode = async () => {
    if (isSpectator) {
      toast.error('Spectators can watch runs, but cannot execute code.');
      return;
    }

    if (!pythonCode.trim()) {
      setRunMeta(null);
      setOutput('No Python code to execute.');
      return;
    }

    setIsRunning(true);
    setRunMeta(null);
    setOutput('Running Python...');

    try {
      const result = await executeCode({
        language: 'python',
        compiler: 'python-3.14',
        code: pythonCode,
        input: pythonInput,
      });

      const formatted = formatExecutionResult(result);
      const metadata = {
        status: result.status || 'unknown',
        exitCode: result.exitCode,
        time: result.time || '',
        total: result.total || '',
        memory: result.memory || '',
      };

      setOutput(formatted);
      setRunMeta(metadata);

      socketRef.current?.emit('code-output', {
        roomId,
        username,
        output: formatted,
        metadata,
      });
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to run Python code right now.';
      const details = error.response?.data?.details;
      const formattedError = details
        ? `${message}\n\n${typeof details === 'string' ? details : JSON.stringify(details, null, 2)}`
        : message;

      setOutput(formattedError);
      setRunMeta({ status: 'error' });
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleInputChange = (event) => {
    const nextInput = event.target.value;
    setPythonInput(nextInput);

    if (!isSpectator && socketRef.current) {
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: nextInput,
        editorType: 'python-input',
      });
    }
  };

  const saveSnapshot = async () => {
    const nextMessage = commitMessage.trim();

    if (isSpectator) {
      toast.error('Spectators can review history, but cannot create snapshots.');
      return;
    }

    if (!nextMessage) {
      toast.error('Write a commit message before saving a snapshot.');
      return;
    }

    setIsSnapshotSaving(true);

    try {
      const data = await createRoomSnapshot(roomId, {
        message: nextMessage,
        authorName: username,
        code: {
          python: latestCodeRef.current.python,
          pythonInput: latestCodeRef.current.pythonInput,
        },
      });
      setSnapshots((current) => [data.snapshot, ...current]);
      setCurrentSnapshotId(data.snapshot.snapshotId);
      setCommitMessage('');
      toast.success('Snapshot saved.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save snapshot.');
    } finally {
      setIsSnapshotSaving(false);
    }
  };

  const checkoutSnapshot = async (snapshot) => {
    setIsCheckingOutSnapshot(true);

    try {
      const data = await checkoutRoomSnapshot(roomId, snapshot.snapshotId);
      const nextCode = data.room.code || snapshot.code || {};
      applyRoomCode(nextCode);
      setCurrentSnapshotId(snapshot.snapshotId);

      socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: nextCode.python || '',
        editorType: 'python',
      });
      socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: nextCode.pythonInput || '',
        editorType: 'python-input',
      });

      toast.success(`Checked out "${snapshot.message}".`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to checkout snapshot.');
    } finally {
      setIsCheckingOutSnapshot(false);
    }
  };

  const openInviteModal = () => {
    if (!user?.email) {
      toast.error('Sign in to send room invites.');
      return;
    }

    if (isSpectator) {
      toast.error('Spectators can view the room, but cannot send invites.');
      return;
    }

    setIsInviteModalOpen(true);
  };

  const submitEmailInvite = async (event) => {
    event.preventDefault();

    const nextEmail = inviteEmail.trim().toLowerCase();

    if (!nextEmail) {
      toast.error('Enter an email address to invite.');
      return;
    }

    setIsInviteSending(true);

    try {
      const data = await inviteUserToRoom(roomId, { email: nextEmail });
      setInviteEmail('');
      setIsInviteModalOpen(false);
      toast.success(data.message || 'Invite sent successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send invite.');
    } finally {
      setIsInviteSending(false);
    }
  };

  const leaveRoom = () => {
    localStorage.removeItem(`pythonCode_${roomId}`);
    localStorage.removeItem(`pythonInput_${roomId}`);
    navigate('/');
  };

  const copySpectatorInvite = async () => {
    try {
      const link = `${window.location.origin}${getRoomRoute('python', roomId)}?role=spectator`;
      await navigator.clipboard.writeText(link);
      toast.success('Spectator invite copied!');
    } catch {
      toast.error('Failed to copy invite');
    }
  };

  const formatSnapshotTime = (timestamp) => {
    const created = new Date(timestamp).getTime();
    const diffMinutes = Math.max(1, Math.floor((Date.now() - created) / 60000));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (isRoomLoading || roomLoadError) {
    return (
      <RoomCodeLoader
        title="Opening Python room"
        subtitle="Restoring the saved workspace before live collaboration starts."
        status="Loading saved room state"
        error={roomLoadError}
        onRetry={() => setRoomLoadRetryKey((current) => current + 1)}
        onBack={() => navigate('/dashboard')}
      />
    );
  }

  if (joinStatus !== 'approved') {
    const isWaitingForHost = joinStatus === 'pending';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #1e293b 100%)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '520px', background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: '24px', padding: '32px', color: '#e2e8f0', boxShadow: '0 24px 80px rgba(15, 23, 42, 0.45)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: isWaitingForHost ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <UserPlus size={24} color={isWaitingForHost ? '#60a5fa' : '#34d399'} />
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.2 }}>
            {isWaitingForHost ? 'Waiting for the room leader' : 'Joining room'}
          </h1>
          <p style={{ margin: '14px 0 0', color: '#94a3b8', lineHeight: 1.6 }}>
            {isWaitingForHost
              ? `${username}, your request to join room ${roomId} has been sent. The room leader needs to admit you before the Python room opens.`
              : `Connecting you to room ${roomId}. This should only take a moment.`}
          </p>
          <button type="button" className="btn-primary" onClick={leaveRoom} style={{ marginTop: '24px', width: '100%' }}>
            Cancel And Go Back
          </button>
        </div>
      </div>
    );
  }

  const visibleEditors = Object.values(collapseEditor).filter((collapsed) => !collapsed).length;
  const editorHeight = visibleEditors > 0 ? `${100 / visibleEditors}%` : '0';

  return (
    <div className={`mainWrape ${isCollapsed ? 'collapsed' : ''}`}>
      <aside className={`aside ${isCollapsed ? 'collapsed' : ''}`} style={{ height: '100vh' }}>
        <button className="toggle-btn" onClick={() => setIsCollapsed((current) => !current)}>
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <div className="asideInner">
          <div className="logo">
            <img src="/logo-dark.png" alt="logo" />
            {!isCollapsed && <h2>Kódikos</h2>}
          </div>

          {!isCollapsed && (
            <div className="roomMeta">
              <p className="roomIdLabel">Room ID</p>
              <p className="roomIdValue">{roomId}</p>
              <div className={`rolePill ${isSpectator ? 'spectator' : ''}`}>
                {isSpectator ? <Eye size={14} /> : <PencilLine size={14} />}
                <span>{isSpectator ? 'Spectator Mode' : 'Editor Mode'}</span>
              </div>
              {isLeader ? <p className="leaderHint">You can switch members between spectator and editor at any time.</p> : null}
            </div>
          )}

          {!isCollapsed && isLeader && pendingClients.length > 0 ? (
            <div style={{
              marginBottom: '18px',
              padding: '16px',
              borderRadius: '18px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(96, 165, 250, 0.18)',
            }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Join Requests
              </p>
              <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
                {pendingClients.map((client) => (
                  <div
                    key={client.participantId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: 'rgba(15, 23, 42, 0.72)',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 600 }}>{client.username}</p>
                      <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>
                        Wants to join as {client.role === 'spectator' ? 'spectator' : 'editor'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: 'auto', padding: '10px 12px' }}
                      onClick={() => admitParticipant(client.participantId)}
                    >
                      Admit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isCollapsed && (
            <div className="clientList" style={{ padding: '20px 0' }}>
              <AnimatePresence>
                {clients.map((client) => (
                  <Client
                    key={client.socketId}
                    username={client.username}
                    role={client.role}
                    isLeader={client.isLeader}
                    canManageRole={isLeader && !client.isLeader}
                    onToggleRole={() => handleRoleChange(client.participantId, client.role === 'spectator' ? 'editor' : 'spectator')}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="actionButtons">
            {!isCollapsed && (
              <button
                className="btn-primary"
                style={{ marginBottom: '10px', position: 'relative' }}
                onClick={() => setIsChatOpen(true)}
              >
                <MessageSquare size={16} /> Chat
                {hasUnreadChatMessage ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '10px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '999px',
                      background: '#ef4444',
                      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.18)',
                    }}
                  />
                ) : null}
              </button>
            )}
            {!isCollapsed && <button className="btn-primary copyBtn" onClick={copySpectatorInvite}><Copy size={16} /> Copy Invite</button>}
            <button className={`btn-primary LeaveBtn ${isCollapsed ? 'collapsed-btn' : ''}`} onClick={leaveRoom}><LogOut size={16} /> {!isCollapsed && 'Leave'}</button>
          </div>
        </div>
        {isCollapsed && (
          <div className="collapsedSidebarRail">
            <button
              type="button"
              className="collapsedRailBtn"
              onClick={() => setIsHistoryOpen(true)}
              title="Open history"
            >
              <History size={16} />
            </button>
            <button className="btn-primary LeaveBtn collapsed-btn" onClick={leaveRoom}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      <div className="workspacePane">
        <div className="editorTopbar">
          <div className="editorTopbarMeta">
            <p className="editorTopbarEyebrow">Collaborative Workspace</p>
            <h2>{roomId}</h2>
          </div>

          <div className="editorTopbarActions">
            <button type="button" className="btn-outline editorTopbarBtn" onClick={() => setIsHistoryOpen(true)}>
              <History size={16} /> History
            </button>
            <button type="button" className="btn-primary editorTopbarBtn editorInviteTopbarBtn" onClick={openInviteModal}>
              <UserPlus size={16} /> Invite Email
            </button>
          </div>
        </div>

        <div className="editorWrap">
          <div className="editorholder">
            {!collapseEditor.python ? (
              <div style={{ height: editorHeight }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#60a5fa" /> Python</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor((current) => ({ ...current, python: true }))}><ChevronUp size={18} /></button>
                </div>
                {socketsReady ? (
                  <CollaborativeCodeEditor
                    socketRef={socketRef}
                    roomId={roomId}
                    username={username}
                    value={pythonCode}
                    readOnly={isSpectator}
                    onCodeChange={setPythonCode}
                    editorType="python"
                    mode={pythonMode}
                    enableCloseTags={false}
                  />
                ) : null}
              </div>
            ) : (
              <div className="collapsed-tab" onClick={() => setCollapseEditor((current) => ({ ...current, python: false }))}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#60a5fa" /> Python</span> <ChevronDown size={18} />
              </div>
            )}

          </div>

          <div className="previwcolapsstyle pythonTerminalShell">
            <h3 className="pythonTerminalHeader">
              <div className="pythonTerminalTitle">
                <TerminalSquare size={18} /> Terminal
              </div>
              <button
                className="btn-primary"
                onClick={runCode}
                disabled={isRunning || isSpectator}
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: (isRunning || isSpectator) ? 0.7 : 1, width: 'auto' }}
              >
                <Play size={14} /> {isSpectator ? 'Read Only' : isRunning ? 'Running...' : 'Run Python'}
              </button>
            </h3>

            <div className="pythonTerminalMeta">
              <div className="pythonTerminalDots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="pythonTerminalMetaText">
                <span>Compiler: `python-3.14`</span>
                <span>Status: {runMeta?.status || 'idle'}</span>
                <span>Exit: {typeof runMeta?.exitCode !== 'undefined' ? runMeta.exitCode : '-'}</span>
                <span>Time: {runMeta?.time || '-'}</span>
                <span>Memory: {runMeta?.memory || '-'}</span>
              </div>
            </div>

            <div className="pythonTerminalInputWrap">
              <label className="pythonTerminalInputLabel" htmlFor="python-room-input">
                Shared stdin
              </label>
              <textarea
                id="python-room-input"
                className="pythonTerminalInput"
                value={pythonInput}
                onChange={handleInputChange}
                placeholder="Type stdin here. Everyone in the room sees the same input."
                readOnly={isSpectator}
                rows={4}
              />
            </div>

            <div className="pythonTerminalOutput">
              <div className="pythonTerminalPrompt">$ python main.py</div>
              <div className="pythonTerminalContent">
                {output}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isInviteModalOpen ? <div className="dashboardModalBackdrop" onClick={() => setIsInviteModalOpen(false)} /> : null}
      {isInviteModalOpen ? (
        <div className="dashboardModal inviteRoomModal">
          <div className="dashboardModalHead">
            <div>
              <p className="dashboardEyebrow">Room Access</p>
              <h3>Invite By Email</h3>
            </div>
            <button type="button" className="dashboardIconBtn" onClick={() => setIsInviteModalOpen(false)}>×</button>
          </div>

          <form className="dashboardModalForm" onSubmit={submitEmailInvite}>
            <label>
              Account Email
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@example.com"
                autoFocus
              />
            </label>

            <p className="editorInviteHint">
              If this email already has a Kodikos account, they will get a dashboard notification to join this room.
            </p>

            <button type="submit" className="btn-primary" disabled={isInviteSending}>
              <UserPlus size={16} /> {isInviteSending ? 'Sending Invite...' : 'Send Invite'}
            </button>
          </form>
        </div>
      ) : null}

      {isHistoryOpen ? <div className="historyDrawerBackdrop" onClick={() => setIsHistoryOpen(false)} /> : null}
      {isHistoryOpen ? (
        <aside className="historyDrawer">
          <div className="historyDrawerHead">
            <div>
              <p className="snapshotPanelEyebrow">Version Control</p>
              <h3>Room History</h3>
            </div>
            <button type="button" className="dashboardIconBtn historyCloseBtn" onClick={() => setIsHistoryOpen(false)}>×</button>
          </div>

          <div className="snapshotComposer historyComposer">
            <textarea
              className="snapshotMessageInput"
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="Write a commit message for this snapshot..."
              rows={3}
              disabled={isSpectator || isSnapshotSaving}
            />
            <button type="button" className="btn-primary snapshotSaveBtn" onClick={saveSnapshot} disabled={isSpectator || isSnapshotSaving}>
              <Save size={16} /> {isSnapshotSaving ? 'Saving...' : 'Save Snapshot'}
            </button>
          </div>

          <div className="historyTimeline">
            {isSnapshotsLoading ? (
              <div className="snapshotEmptyState">Loading history...</div>
            ) : snapshots.length ? snapshots.map((snapshot, index) => (
              <div key={snapshot.snapshotId} className="historyTimelineItem">
                <button type="button" className={`historyTimelineDot ${currentSnapshotId === snapshot.snapshotId ? 'active' : ''}`} onClick={() => checkoutSnapshot(snapshot)}>
                  <span className="historyDotTooltip">
                    <strong>{snapshot.message}</strong>
                    <span>{snapshot.authorName} · {formatSnapshotTime(snapshot.createdAt)}</span>
                  </span>
                </button>
                {index < snapshots.length - 1 ? <div className="historyTimelineConnector" /> : null}
                <div className={`historyTimelineCard ${currentSnapshotId === snapshot.snapshotId ? 'active' : ''}`}>
                  <div className="snapshotTreeTopline">
                    <p>{snapshot.message}</p>
                    <span>{formatSnapshotTime(snapshot.createdAt)}</span>
                  </div>
                  <div className="snapshotTreeMeta">
                    <span>{snapshot.authorName}</span>
                    {currentSnapshotId === snapshot.snapshotId ? <strong>Current</strong> : null}
                  </div>
                  <button type="button" className="snapshotCheckoutBtn" onClick={() => checkoutSnapshot(snapshot)} disabled={isCheckingOutSnapshot}>
                    <RotateCcw size={14} /> Checkout
                  </button>
                </div>
              </div>
            )) : (
              <div className="snapshotEmptyState">
                Save your first snapshot to build a Git-like room history.
              </div>
            )}
          </div>
        </aside>
      ) : null}

      {socketsReady ? (
        <Chat
          socketRef={socketRef}
          roomId={roomId}
          username={username}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onUnreadMessage={setHasUnreadChatMessage}
        />
      ) : null}
    </div>
  );
};

export default PythonRoomPage;
