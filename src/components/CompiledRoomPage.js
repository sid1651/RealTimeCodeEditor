import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ChevronDown,
  ChevronUp,
  Code2,
  Play,
  RotateCcw,
  Save,
  TerminalSquare,
  UserPlus as UserPlusIcon,
} from 'lucide-react';
import ACTIONS from '../Actions';
import Chat from './Chat';
import CollaborativeCodeEditor from './CollaborativeCodeEditor';
import EditorSidebar from './EditorSidebar';
import EditorTopbar from './EditorTopbar';
import RoomCodeLoader from './RoomCodeLoader';
import { useAuth } from '../context/AuthContext';
import { initSocketJS } from '../socket';
import { executeCode } from '../utils/executeApi';
import { getRoomRoute } from '../utils/roomLanguage';
import { checkoutRoomSnapshot, createRoomSnapshot, getRoomSnapshots } from '../utils/snapshotApi';
import { getRoomById, inviteUserToRoom, updateRoom } from '../utils/roomApi';

const ROOM_CONFIG = {
  python: {
    routeLanguage: 'python',
    label: 'Python',
    roomTitle: 'Python room',
    compiler: 'python-3.14',
    codeKey: 'python',
    inputKey: 'pythonInput',
    localCodeKey: 'pythonCode',
    localInputKey: 'pythonInput',
    defaultCode: 'print("Hello, World!")',
    defaultInput: '',
    mode: { name: 'python', version: 3 },
    color: '#60a5fa',
    prompt: '$ python main.py',
  },
  c: {
    routeLanguage: 'c',
    label: 'C',
    roomTitle: 'C room',
    compiler: 'gcc-15',
    codeKey: 'c',
    inputKey: 'cInput',
    localCodeKey: 'cCode',
    localInputKey: 'cInput',
    defaultCode: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello, World!\\n");\n  return 0;\n}\n',
    defaultInput: '',
    mode: 'text/x-csrc',
    color: '#f59e0b',
    prompt: '$ gcc main.c && ./a.out',
  },
  cpp: {
    routeLanguage: 'cpp',
    label: 'C++',
    roomTitle: 'C++ room',
    compiler: 'g++-15',
    codeKey: 'cpp',
    inputKey: 'cppInput',
    localCodeKey: 'cppCode',
    localInputKey: 'cppInput',
    defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello, World!" << \'\\n\';\n  return 0;\n}\n',
    defaultInput: '',
    mode: 'text/x-c++src',
    color: '#a78bfa',
    prompt: '$ g++ main.cpp && ./a.out',
  },
};

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

const injectInputsIntoOutput = (output = '', input = '') => {
  if (!output || !input) {
    return output;
  }

  const inputLines = `${input}`
    .split(/\r?\n/)
    .filter((line, index, allLines) => line.length > 0 || index < allLines.length - 1);

  if (!inputLines.length) {
    return output;
  }

  let inputIndex = 0;

  return output.replace(/:\s*/g, (match) => {
    if (inputIndex >= inputLines.length) {
      return match;
    }

    const nextInput = inputLines[inputIndex];
    inputIndex += 1;
    return `${match}${nextInput}\n`;
  });
};

const CompiledRoomPage = ({ language }) => {
  const config = ROOM_CONFIG[language] || ROOM_CONFIG.python;

  const socketRef = useRef(null);
  const roomLoadedRef = useRef(false);
  const codeRef = useRef({ [config.codeKey]: '', [config.inputKey]: '' });
  const latestCodeRef = useRef({ [config.codeKey]: '', [config.inputKey]: '' });
  const terminalResizeStateRef = useRef({ active: false, startY: 0, startHeight: 260 });

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

  const [sourceCode, setSourceCode] = useState(localStorage.getItem(`${config.localCodeKey}_${roomId}`) || config.defaultCode);
  const [programInput, setProgramInput] = useState(localStorage.getItem(`${config.localInputKey}_${roomId}`) || config.defaultInput);
  const [clients, setClients] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [socketsReady, setSocketsReady] = useState(false);
  const [joinStatus, setJoinStatus] = useState('connecting');
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState('');
  const [roomLoadRetryKey, setRoomLoadRetryKey] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapseEditor, setCollapseEditor] = useState({ source: false });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadChatMessage, setHasUnreadChatMessage] = useState(false);
  const [output, setOutput] = useState(`Run ${config.label} to see the output here...`);
  const [runMeta, setRunMeta] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(260);
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

  useEffect(() => {
    if (isChatOpen) {
      setHasUnreadChatMessage(false);
    }
  }, [isChatOpen]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!terminalResizeStateRef.current.active) {
        return;
      }

      const delta = terminalResizeStateRef.current.startY - event.clientY;
      const maxHeight = Math.max(220, Math.floor(window.innerHeight * 0.7));
      const nextHeight = Math.min(maxHeight, Math.max(180, terminalResizeStateRef.current.startHeight + delta));
      setTerminalHeight(nextHeight);
    };

    const handlePointerUp = () => {
      if (!terminalResizeStateRef.current.active) {
        return;
      }

      terminalResizeStateRef.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const applyRoomCode = useCallback((nextCode = {}) => {
    const nextSource = nextCode[config.codeKey] || config.defaultCode;
    const nextInput = nextCode[config.inputKey] || config.defaultInput;

    codeRef.current[config.codeKey] = nextSource;
    codeRef.current[config.inputKey] = nextInput;
    latestCodeRef.current = {
      [config.codeKey]: nextSource,
      [config.inputKey]: nextInput,
    };

    setSourceCode(nextSource);
    setProgramInput(nextInput);
  }, [config.codeKey, config.defaultCode, config.defaultInput, config.inputKey]);

  useEffect(() => {
    localStorage.setItem(`${config.localCodeKey}_${roomId}`, sourceCode);
    codeRef.current[config.codeKey] = sourceCode;
    latestCodeRef.current[config.codeKey] = sourceCode;
  }, [config.codeKey, config.localCodeKey, roomId, sourceCode]);

  useEffect(() => {
    localStorage.setItem(`${config.localInputKey}_${roomId}`, programInput);
    codeRef.current[config.inputKey] = programInput;
    latestCodeRef.current[config.inputKey] = programInput;
  }, [config.inputKey, config.localInputKey, programInput, roomId]);

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
  }, [applyRoomCode, roomId, roomLoadRetryKey]);

  useEffect(() => {
    const loadSnapshots = async () => {
      setIsSnapshotsLoading(true);
      try {
        const data = await getRoomSnapshots(roomId);
        setSnapshots(data.snapshots || []);
        setCurrentSnapshotId(data.headSnapshotId || null);
      } catch (error) {
        console.error(`Failed to load ${config.label} room snapshots`, error);
      } finally {
        setIsSnapshotsLoading(false);
      }
    };

    loadSnapshots();
  }, [config.label, roomId]);

  useEffect(() => {
    if (!roomLoadedRef.current) {
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        await updateRoom(roomId, {
          lastOpenedAt: new Date().toISOString(),
          code: {
            [config.codeKey]: sourceCode,
            [config.inputKey]: programInput,
          },
        });
      } catch (error) {
        console.error(`Failed to persist ${config.label} room`, error);
      }
    }, 900);

    return () => clearTimeout(timeout);
  }, [config.codeKey, config.inputKey, config.label, programInput, roomId, sourceCode]);

  useEffect(() => {
    const flushRoomState = async () => {
      if (!roomLoadedRef.current) {
        return;
      }

      try {
        await updateRoom(roomId, {
          lastOpenedAt: new Date().toISOString(),
          code: {
            [config.codeKey]: latestCodeRef.current[config.codeKey],
            [config.inputKey]: latestCodeRef.current[config.inputKey],
          },
        });
      } catch (error) {
        console.error(`Failed to flush ${config.label} room state on exit`, error);
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
  }, [config.codeKey, config.inputKey, config.label, roomId]);

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
            code: codeRef.current[config.codeKey],
            socketId,
            participantId,
            editorType: config.codeKey,
          });
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current[config.inputKey],
            socketId,
            participantId,
            editorType: config.inputKey,
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
          if (payload?.editorType === config.codeKey && typeof payload?.code === 'string') {
            codeRef.current[config.codeKey] = payload.code;
            setSourceCode(payload.code);
          }

          if (payload?.editorType === config.inputKey && typeof payload?.code === 'string') {
            codeRef.current[config.inputKey] = payload.code;
            setProgramInput(payload.code);
          }
        });

        socketRef.current.on(ACTIONS.CODE_CHANGE, (payload) => {
          if (payload?.editorType === config.codeKey && typeof payload?.code === 'string') {
            setSourceCode(payload.code);
          }

          if (payload?.editorType === config.inputKey && typeof payload?.code === 'string') {
            setProgramInput(payload.code);
          }
        });

        socketRef.current.on('code-output', ({ output: remoteOutput, username: remoteUsername, metadata }) => {
          const remoteText = remoteOutput || 'Execution finished with no output.';
          setOutput(`${remoteUsername || 'A collaborator'} ran ${config.label}:\n\n${remoteText}`);
          setRunMeta(metadata || null);
        });
      } catch (error) {
        if (!cancelled) {
          console.error(`Failed to init ${config.label} room socket`, error);
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
  }, [config.codeKey, config.inputKey, config.label, isRoomLoading, navigate, roomId, user?.id, username]);

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

    if (!sourceCode.trim()) {
      setRunMeta(null);
      setOutput(`No ${config.label} code to execute.`);
      return;
    }

    setIsRunning(true);
    setRunMeta(null);
    setOutput(`Running ${config.label}...`);

    try {
      const result = await executeCode({
        language,
        compiler: config.compiler,
        code: sourceCode,
        input: programInput,
      });

      const formatted = buildTerminalTranscript(result, programInput);
      const metadata = {
        status: result.status || 'unknown',
        exitCode: result.exitCode,
        time: result.time || '',
        total: result.total || '',
        memory: result.memory || '',
        input: programInput,
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
      const message = error.response?.data?.message || `Unable to run ${config.label} code right now.`;
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
          [config.codeKey]: latestCodeRef.current[config.codeKey],
          [config.inputKey]: latestCodeRef.current[config.inputKey],
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
        code: nextCode[config.codeKey] || '',
        editorType: config.codeKey,
      });
      socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: nextCode[config.inputKey] || '',
        editorType: config.inputKey,
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
    localStorage.removeItem(`${config.localCodeKey}_${roomId}`);
    localStorage.removeItem(`${config.localInputKey}_${roomId}`);
    navigate('/');
  };

  const copySpectatorInvite = async () => {
    try {
      const link = `${window.location.origin}${getRoomRoute(config.routeLanguage, roomId)}?role=spectator`;
      await navigator.clipboard.writeText(link);
      toast.success('Spectator invite copied!');
    } catch {
      toast.error('Failed to copy invite');
    }
  };

  const handleInputChange = (event) => {
    const nextInput = event.target.value;
    setProgramInput(nextInput);

    if (!isSpectator && socketRef.current) {
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: nextInput,
        editorType: config.inputKey,
      });
    }
  };

  const buildTerminalTranscript = (result, stdinValue) => {
    const base = formatExecutionResult(result);
    const [header, ...bodyParts] = base.split('\n\n');
    const body = bodyParts.join('\n\n');
    const decoratedBody = injectInputsIntoOutput(body, stdinValue);
    return `${header}\n\n${decoratedBody}`;
  };

  const startTerminalResize = (event) => {
    if (isTerminalCollapsed) {
      return;
    }

    terminalResizeStateRef.current = {
      active: true,
      startY: event.clientY,
      startHeight: terminalHeight,
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
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
        title={`Opening ${config.roomTitle}`}
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
            <UserPlusIcon size={24} color={isWaitingForHost ? '#60a5fa' : '#34d399'} />
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.2 }}>
            {isWaitingForHost ? 'Waiting for the room leader' : 'Joining room'}
          </h1>
          <p style={{ margin: '14px 0 0', color: '#94a3b8', lineHeight: 1.6 }}>
            {isWaitingForHost
              ? `${username}, your request to join room ${roomId} has been sent. The room leader needs to admit you before the ${config.roomTitle} opens.`
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
      <EditorSidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((current) => !current)}
        roomId={roomId}
        isSpectator={isSpectator}
        isLeader={isLeader}
        pendingClients={pendingClients}
        clients={clients}
        hasUnreadChatMessage={hasUnreadChatMessage}
        onOpenChat={() => setIsChatOpen(true)}
        onCopyInvite={copySpectatorInvite}
        onLeaveRoom={leaveRoom}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onAdmitParticipant={admitParticipant}
        onToggleRole={(client) => handleRoleChange(client.participantId, client.role === 'spectator' ? 'editor' : 'spectator')}
      />

      <div className="workspacePane compiledWorkspacePane">
        <EditorTopbar
          roomId={roomId}
          eyebrow="Collaborative Workspace"
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenInvite={openInviteModal}
        />

        <div className="editorWrap compiledEditorWrap">
          <div className="compiledEditorMain">
            <div className="editorholder">
              {!collapseEditor.source ? (
                <div style={{ height: editorHeight }} className="editorContainer">
                  <div className="editorHeader">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color={config.color} /> {config.label}</span>
                    <button className="collapse-editor-btn" onClick={() => setCollapseEditor((current) => ({ ...current, source: true }))}><ChevronUp size={18} /></button>
                  </div>
                  {socketsReady ? (
                    <CollaborativeCodeEditor
                      socketRef={socketRef}
                      roomId={roomId}
                      username={username}
                      value={sourceCode}
                      readOnly={isSpectator}
                      onCodeChange={setSourceCode}
                      editorType={config.codeKey}
                      mode={config.mode}
                      enableCloseTags={false}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="collapsed-tab" onClick={() => setCollapseEditor((current) => ({ ...current, source: false }))}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color={config.color} /> {config.label}</span> <ChevronDown size={18} />
                </div>
              )}
            </div>

            <div
              className={`pythonTerminalDock ${isTerminalCollapsed ? 'collapsed' : ''}`}
              style={isTerminalCollapsed ? undefined : { height: `${terminalHeight}px` }}
            >
              <button
                type="button"
                className="pythonTerminalResizeHandle"
                onMouseDown={startTerminalResize}
                aria-label="Resize terminal"
              />

              <div className="pythonTerminalTabs">
                <button type="button" className="pythonTerminalTab active">TERMINAL</button>
                <button type="button" className="pythonTerminalTab" tabIndex={-1}>OUTPUT</button>
                <button type="button" className="pythonTerminalTab" tabIndex={-1}>DEBUG CONSOLE</button>
              </div>

              <h3 className="pythonTerminalHeader">
                <div className="pythonTerminalTitle">
                  <TerminalSquare size={18} /> {config.label.toLowerCase()} session
                </div>
                <div className="pythonTerminalHeaderActions">
                  <button
                    type="button"
                    className="pythonTerminalCollapseBtn"
                    onClick={() => setIsTerminalCollapsed((current) => !current)}
                  >
                    {isTerminalCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={runCode}
                    disabled={isRunning || isSpectator}
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: (isRunning || isSpectator) ? 0.7 : 1, width: 'auto' }}
                  >
                    <Play size={14} /> {isSpectator ? 'Read Only' : isRunning ? 'Running...' : `Run ${config.label}`}
                  </button>
                </div>
              </h3>

              {!isTerminalCollapsed ? (
                <>
                  <div className="pythonTerminalMeta">
                    <div className="pythonTerminalDots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="pythonTerminalMetaText">
                      <span>Compiler: `{config.compiler}`</span>
                      <span>Status: {runMeta?.status || 'idle'}</span>
                      <span>Exit: {typeof runMeta?.exitCode !== 'undefined' ? runMeta.exitCode : '-'}</span>
                      <span>Time: {runMeta?.time || '-'}</span>
                      <span>Memory: {runMeta?.memory || '-'}</span>
                    </div>
                  </div>

                  <div className="pythonTerminalOutput">
                    <div className="pythonTerminalPrompt">{config.prompt}</div>
                    <div className="pythonTerminalContent">
                      {output}
                    </div>
                    <div className="pythonTerminalComposer">
                      <span className="pythonTerminalComposerPrompt">{'>'}</span>
                      <textarea
                        id={`${config.routeLanguage}-room-input`}
                        className="pythonTerminalInput"
                        value={programInput}
                        onChange={handleInputChange}
                        placeholder="Type stdin here, one value per line."
                        readOnly={isSpectator}
                        rows={3}
                        spellCheck={false}
                      />
                    </div>
                  </div>
                </>
              ) : null}
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
              <UserPlusIcon size={16} /> {isInviteSending ? 'Sending Invite...' : 'Send Invite'}
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

export default CompiledRoomPage;
