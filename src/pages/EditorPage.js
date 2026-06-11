import React, { useEffect, useRef, useState } from 'react';
import Editor from '../components/Editor';
import EditorHTML from '../components/Editorhtml';
import EditorCSS from '../components/Editorcss';
import Chat from '../components/Chat';
import EditorSidebar from '../components/EditorSidebar';
import EditorTopbar from '../components/EditorTopbar';
import RoomCodeLoader from '../components/RoomCodeLoader';
import { initSocketJS, initSocketHTML, initSocketCSS } from '../socket';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';
import { ChevronDown, ChevronUp, Code2, LayoutTemplate, Play, TerminalSquare, Save, RotateCcw, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { getRoomById, inviteUserToRoom, updateRoom } from '../utils/roomApi';
import { checkoutRoomSnapshot, createRoomSnapshot, getRoomSnapshots } from '../utils/snapshotApi';


// 

const EditorPage = () => {
  const socketJSRef = useRef(null);
  const socketHTMLRef = useRef(null);
  const socketCSSRef = useRef(null);
  const roomLoadedRef = useRef(false);
  const latestCodeRef = useRef({ javascript: '', html: '', css: '' });

  const codeRef = useRef({ javascript: '', htmlmixed: '', css: '' });

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

  // ROOM-SPECIFIC LOCAL STORAGE STATE
  const [jsCode, setJsCode] = useState(localStorage.getItem(`jsCode_${roomId}`) || '');
  const [htmlCode, setHtmlCode] = useState(localStorage.getItem(`htmlCode_${roomId}`) || '');
  const [cssCode, setCssCode] = useState(localStorage.getItem(`cssCode_${roomId}`) || '');

  const [clients, setClients] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [socketsReady, setSocketsReady] = useState(false);
  const [joinStatus, setJoinStatus] = useState('connecting');
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState('');
  const [roomLoadRetryKey, setRoomLoadRetryKey] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false); // Sidebar collapsed
  const [Colaps] = useState(false); // Preview collapsed

  // ✅ New state for individual editor collapse
  const [collapseEditor, setCollapseEditor] = useState({
    js: false,
    html: false,
    css: false,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadChatMessage, setHasUnreadChatMessage] = useState(false);

  // ✅ Terminal & Code Execution State
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'terminal'
  const [output, setOutput] = useState('');
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

  const iframeRef = useRef(null);

  useEffect(() => {
    if (isChatOpen) {
      setHasUnreadChatMessage(false);
    }
  }, [isChatOpen]);

  const applyRoomCode = (nextCode = {}) => {
    const nextJs = nextCode.javascript || '';
    const nextHtml = nextCode.html || '';
    const nextCss = nextCode.css || '';

    codeRef.current.javascript = nextJs;
    codeRef.current.htmlmixed = nextHtml;
    codeRef.current.css = nextCss;
    latestCodeRef.current = {
      javascript: nextJs,
      html: nextHtml,
      css: nextCss,
    };

    setJsCode(nextJs);
    setHtmlCode(nextHtml);
    setCssCode(nextCss);
  };

  // --- SAVE CODE PER ROOM IN LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem(`jsCode_${roomId}`, jsCode);
    codeRef.current.javascript = jsCode;
    latestCodeRef.current.javascript = jsCode;
  }, [jsCode, roomId]);

  useEffect(() => {
    localStorage.setItem(`htmlCode_${roomId}`, htmlCode);
    codeRef.current.htmlmixed = htmlCode;
    latestCodeRef.current.html = htmlCode;
  }, [htmlCode, roomId]);

  useEffect(() => {
    localStorage.setItem(`cssCode_${roomId}`, cssCode);
    codeRef.current.css = cssCode;
    latestCodeRef.current.css = cssCode;
  }, [cssCode, roomId]);

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

        const nextCode = room.code || {};
        applyRoomCode(nextCode);
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
        console.error('Failed to load room snapshots', error);
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
            javascript: jsCode,
            html: htmlCode,
            css: cssCode,
          },
        });
      } catch (error) {
        console.error('Failed to persist room', error);
      }
    }, 900);

    return () => clearTimeout(timeout);
  }, [cssCode, htmlCode, jsCode, roomId]);

  useEffect(() => {
    const flushRoomState = async () => {
      if (!roomLoadedRef.current) {
        return;
      }

      try {
        await updateRoom(roomId, {
          lastOpenedAt: new Date().toISOString(),
          code: {
            javascript: latestCodeRef.current.javascript,
            html: latestCodeRef.current.html,
            css: latestCodeRef.current.css,
          },
        });
      } catch (error) {
        console.error('Failed to flush room state on exit', error);
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

  // --- INIT SOCKETS AND JOIN ROOM ---
  useEffect(() => {
    if (isRoomLoading || !roomLoadedRef.current) {
      return undefined;
    }

    let cancelled = false;

    const initSecondarySockets = async () => {
      if (socketHTMLRef.current && socketCSSRef.current) {
        setSocketsReady(true);
        return;
      }

      socketHTMLRef.current = await initSocketHTML();
      socketCSSRef.current = await initSocketCSS();

      if (cancelled) {
        return;
      }

      const handleErrors = (err) => {
        console.error('Socket connection error:', err);
        toast.error('Socket connection failed. Please try again.');
        navigate('/');
      };

      socketHTMLRef.current.on('connect_error', handleErrors);
      socketCSSRef.current.on('connect_error', handleErrors);

      // --- SYNC CODE FROM SERVER (HTML/CSS) ---
      socketHTMLRef.current.on(ACTIONS.SYNC_CODE, payload => {
        if (typeof payload?.code === 'string') {
          codeRef.current.htmlmixed = payload.code;
          setHtmlCode(payload.code);
        }
      });
      socketCSSRef.current.on(ACTIONS.SYNC_CODE, payload => {
        if (typeof payload?.code === 'string') {
          codeRef.current.css = payload.code;
          setCssCode(payload.code);
        }
      });

      // --- LIVE CODE CHANGES (HTML/CSS) ---
      socketHTMLRef.current.on(ACTIONS.CODE_CHANGE, payload => {
        if (typeof payload?.code === 'string') setHtmlCode(payload.code);
      });
      socketCSSRef.current.on(ACTIONS.CODE_CHANGE, payload => {
        if (typeof payload?.code === 'string') setCssCode(payload.code);
      });

      const joinPayload = { roomId, username, role: userRoleRef.current, participantId: participantIdRef.current, userId: user?.id || null };
      socketHTMLRef.current.emit(ACTIONS.JOIN, joinPayload);
      socketCSSRef.current.emit(ACTIONS.JOIN, joinPayload);
      setSocketsReady(true);
    };

    const initAll = async () => {
      try {
        socketJSRef.current = await initSocketJS();

        const handleErrors = (err) => {
          console.error('Socket connection error:', err);
          toast.error('Socket connection failed. Please try again.');
          navigate('/');
        };

        socketJSRef.current.on('connect_error', handleErrors);
        socketJSRef.current.on(ACTIONS.JOIN_ERROR, ({ message }) => {
          toast.error(message || 'Unable to join this room.');
          navigate('/home');
        });
        socketJSRef.current.on(ACTIONS.JOIN_PENDING, ({ pendingClients: incomingPendingClients }) => {
          setJoinStatus('pending');
          setPendingClients(incomingPendingClients || []);
        });
        socketJSRef.current.on(ACTIONS.JOIN_REQUEST, ({ pendingClients: incomingPendingClients }) => {
          setPendingClients(incomingPendingClients || []);
        });
        socketJSRef.current.on(ACTIONS.JOIN_APPROVED, async () => {
          setJoinStatus('approved');
          await initSecondarySockets();
        });

        const joinPayload = { roomId, username, role: initialRoleRef.current, participantId: participantIdRef.current, userId: user?.id || null };
        socketJSRef.current.emit(ACTIONS.JOIN, joinPayload);

        // --- JOINED EVENT ---
        socketJSRef.current.on(ACTIONS.JOINED, async ({ clients: joinedClients, pendingClients: incomingPendingClients, username: joinedUsername, socketId, participantId }) => {
          if (joinedUsername && joinedUsername !== username) {
            toast.success(`${joinedUsername} has joined the room!`);
          }
          setClients(joinedClients);
          setPendingClients(incomingPendingClients || []);

          if (joinedClients.some(client => client.participantId === participantIdRef.current)) {
            setJoinStatus('approved');
            await initSecondarySockets();
          }

          // Sync existing code
          socketJSRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.javascript, socketId, participantId, editorType: 'js' });
          if (socketHTMLRef.current && socketCSSRef.current) {
            socketHTMLRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.htmlmixed, socketId, participantId, editorType: 'html' });
            socketCSSRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.css, socketId, participantId, editorType: 'css' });
          }
        });

        // --- DISCONNECTED EVENT ---
        socketJSRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username, clients: updatedClients, pendingClients: incomingPendingClients }) => {
          toast.success(`${username} has left the room`);
          setPendingClients(incomingPendingClients || []);
          if (updatedClients) {
            setClients(updatedClients);
          } else {
            setClients(prev => prev.filter(client => client.socketId !== socketId));
          }
        });

        socketJSRef.current.on(ACTIONS.ROLE_CHANGED, ({ clients: updatedClients, pendingClients: incomingPendingClients, participantId, role, username: changedUsername }) => {
          setClients(updatedClients);
          setPendingClients(incomingPendingClients || []);

          if (participantId === participantIdRef.current) {
            setUserRole(role);
            toast.success(`You are now an ${role}.`);
            return;
          }

          toast.success(`${changedUsername} is now an ${role}.`);
        });

        // --- SYNC CODE FROM SERVER ---
        socketJSRef.current.on(ACTIONS.SYNC_CODE, payload => {
          if (typeof payload?.code === 'string') {
            codeRef.current.javascript = payload.code;
            setJsCode(payload.code);
          }
        });

        // --- LIVE CODE CHANGES ---
        socketJSRef.current.on(ACTIONS.CODE_CHANGE, payload => {
          if (typeof payload?.code === 'string') setJsCode(payload.code);
        });

        // --- LIVE TERMINAL OUTPUT (From other users) ---
        socketJSRef.current.on('code-output', ({ output: remoteOutput, username: remoteUsername }) => {
          setOutput(`--- Executed by ${remoteUsername} ---\n\n${remoteOutput}`);
          setActiveTab('terminal'); // Auto-switch to show what they executed
        });

      } catch (err) {
        console.error('Failed to init sockets', err);
        toast.error('Failed to connect to collaboration servers.');
        navigate('/');
      }
    };

    initAll();

    return () => {
      cancelled = true;
      setSocketsReady(false);
      setJoinStatus('connecting');
      socketJSRef.current?.disconnect();
      socketHTMLRef.current?.disconnect();
      socketCSSRef.current?.disconnect();
      socketJSRef.current = null;
      socketHTMLRef.current = null;
      socketCSSRef.current = null;
    };
  }, [isRoomLoading, navigate, roomId, username, user?.id]);

  const isLeader = clients.some(client => client.participantId === participantIdRef.current && client.isLeader);

  const handleRoleChange = (targetParticipantId, nextRole) => {
    if (!socketJSRef.current || !isLeader) {
      return;
    }

    socketJSRef.current.emit(ACTIONS.UPDATE_ROLE, {
      roomId,
      participantId: targetParticipantId,
      role: nextRole,
    });
  };

  const admitParticipant = (targetParticipantId) => {
    if (!socketJSRef.current || !isLeader) {
      return;
    }

    socketJSRef.current.emit(ACTIONS.ADMIT_PARTICIPANT, {
      roomId,
      participantId: targetParticipantId,
    });
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
      const payload = {
        message: nextMessage,
        authorName: username,
        code: {
          javascript: latestCodeRef.current.javascript,
          html: latestCodeRef.current.html,
          css: latestCodeRef.current.css,
        },
      };

      const data = await createRoomSnapshot(roomId, payload);
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
      applyRoomCode(data.room.code || snapshot.code || {});
      setCurrentSnapshotId(snapshot.snapshotId);

      if (socketJSRef.current) {
        socketJSRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: data.room.code?.javascript || snapshot.code?.javascript || '',
          editorType: 'js',
        });
      }

      if (socketHTMLRef.current) {
        socketHTMLRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: data.room.code?.html || snapshot.code?.html || '',
          editorType: 'html',
        });
      }

      if (socketCSSRef.current) {
        socketCSSRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: data.room.code?.css || snapshot.code?.css || '',
          editorType: 'css',
        });
      }

      toast.success(`Checked out "${snapshot.message}".`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to checkout snapshot.');
    } finally {
      setIsCheckingOutSnapshot(false);
    }
  };

  // --- LIVE PREVIEW UPDATE ---
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Live Preview</title>
          <style>${cssCode || ''}</style>
        </head>
        <body>
          ${htmlCode || ''}
          <script>${jsCode || ''}</script>
        </body>
        </html>
      `);
      doc.close();
    }
  }, [htmlCode, cssCode, jsCode]);

  // --- RUN CODE (PISTON API) ---
  const runCode = async () => {
    if (isSpectator) {
      toast.error('Spectators can watch live, but cannot run code.');
      return;
    }

    if (!jsCode.trim()) {
      setActiveTab('terminal');
      setOutput('No JavaScript code to execute.');
      return;
    }

    setIsRunning(true);
    setActiveTab('terminal');
    setOutput('Executing code...');
    try {
      const res = await api.post('/api/execute', {
        code: jsCode,
      });
      
      const finalOutput =
        res.data?.output ||
        res.data?.message ||
        'Execution finished with no output.';
      setOutput(finalOutput);

      // Broadcast output to everyone in the room
      if (socketJSRef.current) {
        socketJSRef.current.emit('code-output', { roomId, output: finalOutput, username });
      }

    } catch (error) {
      const errMsg = 'Error executing code: ' + (error.response?.data?.message || error.message);
      setOutput(errMsg);
    } finally {
      setIsRunning(false);
    }
  };

  // --- LEAVE ROOM ---
  const leaveRoom = () => {
    localStorage.removeItem(`jsCode_${roomId}`);
    localStorage.removeItem(`htmlCode_${roomId}`);
    localStorage.removeItem(`cssCode_${roomId}`);
    navigate('/');
  };

  // --- COPY SPECTATOR INVITE ---
  const copySpectatorInvite = async () => {
    try {
      const link = `${window.location.origin}/editor/${roomId}?role=spectator`;
      await navigator.clipboard.writeText(link);
      toast.success('Spectator Invite copied!');
    } catch {
      toast.error('Failed to copy invite');
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

    console.debug('[editor:invite:start]', {
      roomId,
      email: nextEmail,
      sender: user?.email || null,
    });

    try {
      const data = await inviteUserToRoom(roomId, { email: nextEmail });
      console.info('[editor:invite:success]', data);
      setInviteEmail('');
      setIsInviteModalOpen(false);
      toast.success(data.message || 'Invite sent successfully.');
    } catch (error) {
      console.error('[editor:invite:error]', {
        roomId,
        email: nextEmail,
        message: error.response?.data?.message || error.message,
        details: error.response?.data || null,
      });
      toast.error(error.response?.data?.message || 'Unable to send invite.');
    } finally {
      setIsInviteSending(false);
    }
  };

  if (isRoomLoading || roomLoadError) {
    return (
      <RoomCodeLoader
        title="Opening room"
        subtitle="Restoring the saved workspace before live collaboration starts."
        status="Loading saved room state"
        error={roomLoadError}
        onRetry={() => setRoomLoadRetryKey((key) => key + 1)}
        onBack={() => navigate('/dashboard')}
      />
    );
  }

  if (joinStatus !== 'approved') {
    const isWaitingForHost = joinStatus === 'pending';

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #1e293b 100%)',
        padding: '24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: '24px',
          padding: '32px',
          color: '#e2e8f0',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.45)',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: isWaitingForHost ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <UserPlus size={24} color={isWaitingForHost ? '#60a5fa' : '#34d399'} />
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.2 }}>
            {isWaitingForHost ? 'Waiting for the room leader' : 'Joining room'}
          </h1>
          <p style={{ margin: '14px 0 0', color: '#94a3b8', lineHeight: 1.6 }}>
            {isWaitingForHost
              ? `${username}, your request to join room ${roomId} has been sent. The room leader needs to admit you before the editor opens.`
              : `Connecting you to room ${roomId}. This should only take a moment.`}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={leaveRoom}
            style={{ marginTop: '24px', width: '100%' }}
          >
            Cancel And Go Back
          </button>
        </div>
      </div>
    );
  }

  // ✅ Calculate dynamic height based on collapse state
  const visibleEditors = Object.values(collapseEditor).filter(c => !c).length;
  const editorHeight = visibleEditors > 0 ? `${100 / visibleEditors}%` : '0';
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

  return (
    <div className={`mainWrape ${isCollapsed ? 'collapsed' : ''}`}>
      <EditorSidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((prev) => !prev)}
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

      {/* Editors + Preview */}
      <div className="workspacePane">
        <EditorTopbar
          roomId={roomId}
          eyebrow="Collaborative Workspace"
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenInvite={openInviteModal}
        />

        <div className="editorWrap">
          <div className='editorholder'>
            {/* JavaScript Editor */}
            {!collapseEditor.js && (
              <div style={{ height: editorHeight }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code2 size={16} color="#facc15" /> JavaScript</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor(prev => ({ ...prev, js: true }))}><ChevronUp size={18} /></button>
                </div>
                {socketsReady && (
                  <Editor
                    socketRef={socketJSRef}
                    roomId={roomId}
                    username={username}
                    value={jsCode}
                    readOnly={isSpectator}
                    isClientCollapsed={isCollapsed}
                    isPreviewCollapsed={Colaps}
                    onCodeChange={code => setJsCode(code)}
                  />
                )}
              </div>
            )}
            {collapseEditor.js && (
              <div className="collapsed-tab" onClick={() => setCollapseEditor(prev => ({ ...prev, js: false }))}>
                <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code2 size={16} color="#facc15" /> JS</span> <ChevronDown size={18} />
              </div>
            )}

            {/* HTML Editor */}
            {!collapseEditor.html && (
              <div style={{ height: editorHeight }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code2 size={16} color="#ef4444" /> HTML</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor(prev => ({ ...prev, html: true }))}><ChevronUp size={18} /></button>
                </div>
                {socketsReady && (
                  <EditorHTML
                    socketRef={socketHTMLRef}
                    roomId={roomId}
                    username={username}
                    value={htmlCode}
                    readOnly={isSpectator}
                    isClientCollapsed={isCollapsed}
                    isPreviewCollapsed={Colaps}
                    onCodeChange={code => setHtmlCode(code)}
                  />
                )}
              </div>
            )}
            {collapseEditor.html && (
              <div className="collapsed-tab" onClick={() => setCollapseEditor(prev => ({ ...prev, html: false }))}>
                <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code2 size={16} color="#ef4444" /> HTML</span> <ChevronDown size={18} />
              </div>
            )}

            {/* CSS Editor */}
            {!collapseEditor.css && (
              <div style={{ height: editorHeight }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code2 size={16} color="#3b82f6" /> CSS</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor(prev => ({ ...prev, css: true }))}><ChevronUp size={18} /></button>
                </div>
                {socketsReady && (
                  <EditorCSS
                    socketRef={socketCSSRef}
                    roomId={roomId}
                    username={username}
                    value={cssCode}
                    readOnly={isSpectator}
                    isClientCollapsed={isCollapsed}
                    isPreviewCollapsed={Colaps}
                    onCodeChange={code => setCssCode(code)}
                  />
                )}
              </div>
            )}
            {collapseEditor.css && (
              <div className="collapsed-tab" onClick={() => setCollapseEditor(prev => ({ ...prev, css: false }))}>
                <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code2 size={16} color="#3b82f6" /> CSS</span> <ChevronDown size={18} />
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className={`previwcolapsstyle ${Colaps ? 'collapsed' : ''}`}>
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={() => setActiveTab('preview')}
                  style={{ background: 'none', border: 'none', color: activeTab === 'preview' ? '#fff' : '#6272a4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                >
                  <LayoutTemplate size={18} /> Live Preview
                </button>
                <button
                  onClick={() => setActiveTab('terminal')}
                  style={{ background: 'none', border: 'none', color: activeTab === 'terminal' ? '#fff' : '#6272a4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                >
                  <TerminalSquare size={18} /> Terminal
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  className="btn-primary"
                  onClick={runCode}
                  disabled={isRunning || isSpectator}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: (isRunning || isSpectator) ? 0.7 : 1, width: 'auto' }}
                >
                  <Play size={14} /> {isSpectator ? 'Read Only' : isRunning ? 'Running...' : 'Run JS'}
                </button>
              </div>
            </h3>
            {!Colaps && activeTab === 'preview' && (
              <iframe ref={iframeRef} title="Live Preview" style={{ width: '100%', height: 'calc(100% - 50px)', border: 'none', backgroundColor: '#fff' }} />
            )}
            {!Colaps && activeTab === 'terminal' && (
              <div style={{ padding: '16px', backgroundColor: '#1e1e2e', color: '#f8f8f2', fontFamily: 'monospace', height: 'calc(100% - 50px)', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {output || 'Click "Run JS" to see the output here...'}
              </div>
            )}
          </div>
        </div>
      </div>

      {isInviteModalOpen && <div className="dashboardModalBackdrop" onClick={() => setIsInviteModalOpen(false)} />}
      {isInviteModalOpen && (
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
      )}

      {isHistoryOpen && <div className="historyDrawerBackdrop" onClick={() => setIsHistoryOpen(false)} />}
      {isHistoryOpen && (
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
            <button
              type="button"
              className="btn-primary snapshotSaveBtn"
              onClick={saveSnapshot}
              disabled={isSpectator || isSnapshotSaving}
            >
              <Save size={16} /> {isSnapshotSaving ? 'Saving...' : 'Save Snapshot'}
            </button>
          </div>

          <div className="historyTimeline">
            {isSnapshotsLoading ? (
              <div className="snapshotEmptyState">Loading history...</div>
            ) : snapshots.length ? snapshots.map((snapshot, index) => (
              <div key={snapshot.snapshotId} className="historyTimelineItem">
                <button
                  type="button"
                  className={`historyTimelineDot ${currentSnapshotId === snapshot.snapshotId ? 'active' : ''}`}
                  onClick={() => checkoutSnapshot(snapshot)}
                >
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
                  <button
                    type="button"
                    className="snapshotCheckoutBtn"
                    onClick={() => checkoutSnapshot(snapshot)}
                    disabled={isCheckingOutSnapshot}
                  >
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
      )}

      {/* Chat Drawer */}
      {socketsReady && (
        <Chat
          socketRef={socketJSRef}
          roomId={roomId}
          username={username}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onUnreadMessage={setHasUnreadChatMessage}
        />
      )}
    </div>
  );
};
export default EditorPage;
