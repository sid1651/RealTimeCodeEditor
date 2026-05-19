import React, { useEffect, useMemo, useRef, useState } from 'react';
import Client from '../components/Client';
import CollaborativeCodeEditor from '../components/CollaborativeCodeEditor';
import Chat from '../components/Chat';
import { initSocketJS, initSocketCSS } from '../socket';
import { useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, LogOut, Code2, LayoutTemplate, MessageSquare, PencilLine, TerminalSquare, UserPlus, Copy } from 'lucide-react';

const DEFAULT_REACT_CODE = `function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="demo-shell">
      <div className="demo-card">
        <p className="eyebrow">Collaborative React Studio</p>
        <h1>Build React UI together.</h1>
        <p className="lede">
          Edit JSX and CSS with your team and watch the interface render live.
        </p>
        <button className="demo-button" onClick={() => setCount((value) => value + 1)}>
          Shared component click count: {count}
        </button>
      </div>
    </div>
  );
}`;

const DEFAULT_CSS_CODE = `.demo-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, rgba(34, 211, 238, 0.22), transparent 30%),
    linear-gradient(160deg, #07111f 0%, #111827 52%, #030712 100%);
  padding: 24px;
  font-family: Inter, system-ui, sans-serif;
}

.demo-card {
  width: min(540px, 100%);
  padding: 32px;
  border-radius: 28px;
  color: #e5eefc;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.42);
}

.eyebrow {
  margin: 0 0 10px;
  color: #67e8f9;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.demo-card h1 {
  margin: 0;
  font-size: clamp(2rem, 6vw, 3rem);
  line-height: 1.05;
}

.lede {
  margin: 14px 0 22px;
  color: #94a3b8;
  line-height: 1.65;
}

.demo-button {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #22d3ee, #6366f1);
  color: white;
  font-size: 0.96rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(34, 211, 238, 0.22);
}`;

const normalizeReactSource = (source) => {
  const withoutImports = source
    .replace(/^\s*import\s.+?;?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '');

  const trimmed = withoutImports.trim();
  const runtimePrelude = `const {
  Fragment,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition
} = React;
const { createRoot } = ReactDOM;`;

  if (!trimmed) {
    return `${runtimePrelude}\nfunction App() { return <div />; }\ncreateRoot(document.getElementById('root')).render(<App />);`;
  }

  const hasRenderCall = /ReactDOM\.createRoot|ReactDOM\.render|createRoot\s*\(/.test(trimmed);

  if (hasRenderCall) {
    return `${runtimePrelude}\n${trimmed}`;
  }

  return `${runtimePrelude}\n${trimmed}\n\nconst __reactStudioRoot = createRoot(document.getElementById('root'));\n__reactStudioRoot.render(<App />);`;
};

const buildPreviewDocument = (reactCode, cssCode) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Studio Preview</title>
    <style>
      html, body, #root {
        margin: 0;
        min-height: 100%;
      }

      body {
        background: #020617;
      }

      ${cssCode}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      const emitMessage = (payload) => {
        window.parent.postMessage({ source: 'react-studio-preview', ...payload }, '*');
      };

      const formatConsoleValue = (value) => {
        if (typeof value === 'string') return value;
        try {
          return JSON.stringify(value, null, 2);
        } catch (error) {
          return String(value);
        }
      };

      ['log', 'warn', 'error', 'info'].forEach((method) => {
        const original = console[method];
        console[method] = (...args) => {
          emitMessage({
            type: method === 'log' ? 'console' : method,
            payload: args.map(formatConsoleValue).join(' ')
          });
          original.apply(console, args);
        };
      });

      window.addEventListener('error', (event) => {
        emitMessage({
          type: 'runtime-error',
          payload: event.message
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        emitMessage({
          type: 'runtime-error',
          payload: event.reason?.message || String(event.reason)
        });
      });

      emitMessage({
        type: 'status',
        payload: 'Preview refreshed successfully.'
      });
    </script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script type="text/babel" data-presets="react">
      ${normalizeReactSource(reactCode)}
    </script>
  </body>
</html>`;

const ReactStudioPage = () => {
  const socketReactRef = useRef(null);
  const socketCssRef = useRef(null);
  const codeRef = useRef({ react: '', reactCss: '' });
  const iframeRef = useRef(null);

  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || 'Anonymous';
  const initialRoleRef = useRef(location.state?.role === 'spectator' ? 'spectator' : 'editor');
  const participantIdRef = useRef(location.state?.participantId || `participant-${Date.now()}`);
  const [userRole, setUserRole] = useState(initialRoleRef.current);
  const userRoleRef = useRef(initialRoleRef.current);
  const isSpectator = userRole === 'spectator';

  const [reactCode, setReactCode] = useState(localStorage.getItem(`reactCode_${roomId}`) || DEFAULT_REACT_CODE);
  const [cssCode, setCssCode] = useState(localStorage.getItem(`reactStudioCss_${roomId}`) || DEFAULT_CSS_CODE);
  const [clients, setClients] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [socketsReady, setSocketsReady] = useState(false);
  const [joinStatus, setJoinStatus] = useState('connecting');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [Colaps] = useState(false);
  const [collapseEditor, setCollapseEditor] = useState({
    react: false,
    css: false,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [consoleLines, setConsoleLines] = useState(['Preview ready.']);
  const reactEditorMode = useMemo(() => ({ name: 'javascript', json: false, jsx: true }), []);

  useEffect(() => {
    localStorage.setItem(`reactCode_${roomId}`, reactCode);
    codeRef.current.react = reactCode;
  }, [reactCode, roomId]);

  useEffect(() => {
    localStorage.setItem(`reactStudioCss_${roomId}`, cssCode);
    codeRef.current.reactCss = cssCode;
  }, [cssCode, roomId]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    let cancelled = false;

    const initSecondarySocket = async () => {
      if (socketCssRef.current) {
        setSocketsReady(true);
        return;
      }

      socketCssRef.current = await initSocketCSS();
      if (cancelled) {
        return;
      }

      const handleErrors = (err) => {
        console.error('Socket connection error:', err);
        toast.error('Socket connection failed. Please try again.');
        navigate('/');
      };

      socketCssRef.current.on('connect_error', handleErrors);
      socketCssRef.current.on(ACTIONS.SYNC_CODE, (payload) => {
        if (payload?.editorType === 'react-css' && typeof payload?.code === 'string') {
          codeRef.current.reactCss = payload.code;
          setCssCode(payload.code);
        }
      });
      socketCssRef.current.on(ACTIONS.CODE_CHANGE, (payload) => {
        if (payload?.editorType === 'react-css' && typeof payload?.code === 'string') {
          setCssCode(payload.code);
        }
      });

      const joinPayload = { roomId, username, role: userRoleRef.current, participantId: participantIdRef.current };
      socketCssRef.current.emit(ACTIONS.JOIN, joinPayload);
      setSocketsReady(true);
    };

    const initAll = async () => {
      try {
        socketReactRef.current = await initSocketJS();

        const handleErrors = (err) => {
          console.error('Socket connection error:', err);
          toast.error('Socket connection failed. Please try again.');
          navigate('/');
        };

        socketReactRef.current.on('connect_error', handleErrors);
        socketReactRef.current.on(ACTIONS.JOIN_ERROR, ({ message }) => {
          toast.error(message || 'Unable to join this room.');
          navigate('/home');
        });
        socketReactRef.current.on(ACTIONS.JOIN_PENDING, ({ pendingClients: incomingPendingClients }) => {
          setJoinStatus('pending');
          setPendingClients(incomingPendingClients || []);
        });
        socketReactRef.current.on(ACTIONS.JOIN_REQUEST, ({ pendingClients: incomingPendingClients }) => {
          setPendingClients(incomingPendingClients || []);
        });
        socketReactRef.current.on(ACTIONS.JOIN_APPROVED, async () => {
          setJoinStatus('approved');
          await initSecondarySocket();
        });

        const joinPayload = { roomId, username, role: initialRoleRef.current, participantId: participantIdRef.current };
        socketReactRef.current.emit(ACTIONS.JOIN, joinPayload);

        socketReactRef.current.on(ACTIONS.JOINED, async ({ clients: joinedClients, pendingClients: incomingPendingClients, username: joinedUsername, socketId, participantId }) => {
          if (joinedUsername && joinedUsername !== username) {
            toast.success(`${joinedUsername} has joined the room!`);
          }
          setClients(joinedClients);
          setPendingClients(incomingPendingClients || []);

          if (joinedClients.some((client) => client.participantId === participantIdRef.current)) {
            setJoinStatus('approved');
            await initSecondarySocket();
          }

          socketReactRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.react, socketId, participantId, editorType: 'react' });
          if (socketCssRef.current) {
            socketCssRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.reactCss, socketId, participantId, editorType: 'react-css' });
          }
        });

        socketReactRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftUsername, clients: updatedClients, pendingClients: incomingPendingClients }) => {
          toast.success(`${leftUsername} has left the room`);
          setPendingClients(incomingPendingClients || []);
          if (updatedClients) {
            setClients(updatedClients);
          } else {
            setClients((prev) => prev.filter((client) => client.socketId !== socketId));
          }
        });

        socketReactRef.current.on(ACTIONS.ROLE_CHANGED, ({ clients: updatedClients, pendingClients: incomingPendingClients, participantId, role, username: changedUsername }) => {
          setClients(updatedClients);
          setPendingClients(incomingPendingClients || []);

          if (participantId === participantIdRef.current) {
            setUserRole(role);
            toast.success(`You are now an ${role}.`);
            return;
          }

          toast.success(`${changedUsername} is now an ${role}.`);
        });

        socketReactRef.current.on(ACTIONS.SYNC_CODE, (payload) => {
          if (payload?.editorType === 'react' && typeof payload?.code === 'string') {
            codeRef.current.react = payload.code;
            setReactCode(payload.code);
          }
        });

        socketReactRef.current.on(ACTIONS.CODE_CHANGE, (payload) => {
          if (payload?.editorType === 'react' && typeof payload?.code === 'string') {
            setReactCode(payload.code);
          }
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
      socketReactRef.current?.disconnect();
      socketCssRef.current?.disconnect();
      socketReactRef.current = null;
      socketCssRef.current = null;
    };
  }, [navigate, roomId, username]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.source !== 'react-studio-preview') {
        return;
      }

      const prefixMap = {
        console: '[log]',
        info: '[info]',
        warn: '[warn]',
        error: '[error]',
        'runtime-error': '[runtime-error]',
        status: '[status]',
      };

      const nextLine = `${prefixMap[event.data.type] || '[preview]'} ${event.data.payload}`;
      setConsoleLines((current) => [...current.slice(-24), nextLine]);

      if (event.data.type === 'runtime-error' || event.data.type === 'error') {
        setActiveTab('terminal');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const previewDocument = useMemo(() => buildPreviewDocument(reactCode, cssCode), [reactCode, cssCode]);

  useEffect(() => {
    setConsoleLines(['Preview rebuilding...']);
  }, [previewDocument]);

  const isLeader = clients.some((client) => client.participantId === participantIdRef.current && client.isLeader);

  const handleRoleChange = (targetParticipantId, nextRole) => {
    if (!socketReactRef.current || !isLeader) {
      return;
    }

    socketReactRef.current.emit(ACTIONS.UPDATE_ROLE, {
      roomId,
      participantId: targetParticipantId,
      role: nextRole,
    });
  };

  const admitParticipant = (targetParticipantId) => {
    if (!socketReactRef.current || !isLeader) {
      return;
    }

    socketReactRef.current.emit(ACTIONS.ADMIT_PARTICIPANT, {
      roomId,
      participantId: targetParticipantId,
    });
  };

  const leaveRoom = () => {
    localStorage.removeItem(`reactCode_${roomId}`);
    localStorage.removeItem(`reactStudioCss_${roomId}`);
    navigate('/');
  };

  const copySpectatorInvite = async () => {
    try {
      const link = `${window.location.origin}/home?roomId=${roomId}&role=spectator&mode=react`;
      await navigator.clipboard.writeText(link);
      toast.success('Spectator Invite copied!');
    } catch {
      toast.error('Failed to copy invite');
    }
  };

  if (!location.state) return <Navigate to="/" />;

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
              ? `${username}, your request to join room ${roomId} has been sent. The room leader needs to admit you before the React studio opens.`
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

  const visibleEditors = Object.values(collapseEditor).filter((collapsed) => !collapsed).length;
  const editorHeight = visibleEditors > 0 ? `${100 / visibleEditors}%` : '0';

  return (
    <div className={`mainWrape ${isCollapsed ? 'collapsed' : ''}`}>
      <aside className={`aside ${isCollapsed ? 'collapsed' : ''}`} style={{ height: '100vh' }}>
        <button className="toggle-btn" onClick={() => setIsCollapsed((prev) => !prev)}>
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
              <div className="rolePill" style={{ marginTop: '10px' }}>
                <Code2 size={14} />
                <span>React Studio</span>
              </div>
              {isLeader && <p className="leaderHint">You can switch members between spectator and editor at any time.</p>}
            </div>
          )}
          {!isCollapsed && isLeader && pendingClients.length > 0 && (
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
                      onClick={() => admitParticipant(client.participantId)}
                      style={{ width: 'auto', padding: '10px 12px' }}
                    >
                      Admit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              <button className="btn-primary" style={{ marginBottom: '10px' }} onClick={() => setIsChatOpen(true)}>
                <MessageSquare size={16} /> Chat
              </button>
            )}
            {!isCollapsed && <button className="btn-primary copyBtn" onClick={copySpectatorInvite}><Copy size={16} /> Copy Invite</button>}
            <button className={`btn-primary LeaveBtn ${isCollapsed ? 'collapsed-btn' : ''}`} onClick={leaveRoom}><LogOut size={16} /> {!isCollapsed && 'Leave'}</button>
          </div>
        </div>
      </aside>

      <div className="workspacePane">
        <div className="editorWrap">
          <div className="editorholder">
            {!collapseEditor.react && (
              <div style={{ height: editorHeight }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#67e8f9" /> React JSX</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor((prev) => ({ ...prev, react: true }))}><ChevronUp size={18} /></button>
                </div>
                {socketsReady && (
                  <CollaborativeCodeEditor
                    socketRef={socketReactRef}
                    roomId={roomId}
                    username={username}
                    value={reactCode}
                    readOnly={isSpectator}
                    editorType="react"
                    mode={reactEditorMode}
                    enableCloseTags
                    enableCloseBrackets
                    onCodeChange={setReactCode}
                  />
                )}
              </div>
            )}
            {collapseEditor.react && (
              <div className="collapsed-tab" onClick={() => setCollapseEditor((prev) => ({ ...prev, react: false }))}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#67e8f9" /> React</span> <ChevronDown size={18} />
              </div>
            )}

            {!collapseEditor.css && (
              <div style={{ height: editorHeight }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#3b82f6" /> CSS</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor((prev) => ({ ...prev, css: true }))}><ChevronUp size={18} /></button>
                </div>
                {socketsReady && (
                  <CollaborativeCodeEditor
                    socketRef={socketCssRef}
                    roomId={roomId}
                    username={username}
                    value={cssCode}
                    readOnly={isSpectator}
                    editorType="react-css"
                    mode="css"
                    enableCloseBrackets
                    onCodeChange={setCssCode}
                  />
                )}
              </div>
            )}
            {collapseEditor.css && (
              <div className="collapsed-tab" onClick={() => setCollapseEditor((prev) => ({ ...prev, css: false }))}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#3b82f6" /> CSS</span> <ChevronDown size={18} />
              </div>
            )}
          </div>

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
                  <TerminalSquare size={18} /> Console
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 700 }}>
                <Code2 size={14} /> Live React
              </div>
            </h3>
            {!Colaps && activeTab === 'preview' && (
              <iframe
                ref={iframeRef}
                title="React Live Preview"
                style={{ width: '100%', height: 'calc(100% - 50px)', border: 'none', backgroundColor: '#fff' }}
                srcDoc={previewDocument}
                sandbox="allow-scripts"
              />
            )}
            {!Colaps && activeTab === 'terminal' && (
              <div style={{ padding: '16px', backgroundColor: '#1e1e2e', color: '#f8f8f2', fontFamily: 'monospace', height: 'calc(100% - 50px)', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {consoleLines.join('\n')}
              </div>
            )}
          </div>
        </div>
      </div>

      {socketsReady && (
        <Chat
          socketRef={socketReactRef}
          roomId={roomId}
          username={username}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
};

export default ReactStudioPage;
