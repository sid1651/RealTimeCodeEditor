import React, { useEffect, useRef, useState } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import EditorHTML from '../components/Editorhtml';
import EditorCSS from '../components/Editorcss';
import Chat from '../components/Chat';
import { initSocketJS, initSocketHTML, initSocketCSS } from '../socket';
import { useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, LogOut, Code2, LayoutTemplate, MessageSquare, PencilLine, Play, TerminalSquare, UserPlus, Copy } from 'lucide-react';
import axios from 'axios';


// 

const EditorPage = () => {
  const socketJSRef = useRef(null);
  const socketHTMLRef = useRef(null);
  const socketCSSRef = useRef(null);

  const codeRef = useRef({ javascript: '', htmlmixed: '', css: '' });

  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username || 'Anonymous';
  const initialRoleRef = useRef(location.state?.role === 'spectator' ? 'spectator' : 'editor');
  const participantIdRef = useRef(location.state?.participantId || `participant-${Date.now()}`);
  const [userRole, setUserRole] = useState(initialRoleRef.current);
  const isSpectator = userRole === 'spectator';

  // ROOM-SPECIFIC LOCAL STORAGE STATE
  const [jsCode, setJsCode] = useState(localStorage.getItem(`jsCode_${roomId}`) || '');
  const [htmlCode, setHtmlCode] = useState(localStorage.getItem(`htmlCode_${roomId}`) || '');
  const [cssCode, setCssCode] = useState(localStorage.getItem(`cssCode_${roomId}`) || '');

  const [clients, setClients] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [socketsReady, setSocketsReady] = useState(false);
  const [joinStatus, setJoinStatus] = useState('connecting');
  const [isCollapsed, setIsCollapsed] = useState(false); // Sidebar collapsed
  const [Colaps] = useState(false); // Preview collapsed

  // ✅ New state for individual editor collapse
  const [collapseEditor, setCollapseEditor] = useState({
    js: false,
    html: false,
    css: false,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ✅ Terminal & Code Execution State
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'terminal'
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const iframeRef = useRef(null);

  // --- SAVE CODE PER ROOM IN LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem(`jsCode_${roomId}`, jsCode);
    codeRef.current.javascript = jsCode;
  }, [jsCode, roomId]);

  useEffect(() => {
    localStorage.setItem(`htmlCode_${roomId}`, htmlCode);
    codeRef.current.htmlmixed = htmlCode;
  }, [htmlCode, roomId]);

  useEffect(() => {
    localStorage.setItem(`cssCode_${roomId}`, cssCode);
    codeRef.current.css = cssCode;
  }, [cssCode, roomId]);

  // --- INIT SOCKETS AND JOIN ROOM ---
  useEffect(() => {
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

      const joinPayload = { roomId, username, role: userRole, participantId: participantIdRef.current };
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
        socketJSRef.current.on(ACTIONS.JOIN_PENDING, () => {
          setJoinStatus('pending');
        });
        socketJSRef.current.on(ACTIONS.JOIN_REQUEST, ({ pendingClients: incomingPendingClients }) => {
          setPendingClients(incomingPendingClients || []);
        });
        socketJSRef.current.on(ACTIONS.JOIN_APPROVED, async () => {
          setJoinStatus('approved');
          await initSecondarySockets();
        });

        const joinPayload = { roomId, username, role: initialRoleRef.current, participantId: participantIdRef.current };
        socketJSRef.current.emit(ACTIONS.JOIN, joinPayload);

        // --- JOINED EVENT ---
        socketJSRef.current.on(ACTIONS.JOINED, async ({ clients: joinedClients, pendingClients: incomingPendingClients, username: joinedUsername, socketId, participantId }) => {
          if (joinedUsername !== username) {
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
  }, [navigate, roomId, userRole, username]);

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

    setIsRunning(true);
    setActiveTab('terminal');
    setOutput('Executing code...');
    try {
      const res = await axios.post('https://emacs.piston.rs/api/v2/execute', {
        language: 'javascript',
        version: '18.15.0',
        files: [{ content: jsCode }],
      });
      
      let finalOutput = res.data.run?.output || res.data.message || 'Execution finished with no output.';
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
      const link = `${window.location.origin}/home?roomId=${roomId}&role=spectator`;
      await navigator.clipboard.writeText(link);
      toast.success('Spectator Invite copied!');
    } catch {
      toast.error('Failed to copy invite');
    }
  };

  if (!location.state) return <Navigate to="/" />;

  // ✅ Calculate dynamic height based on collapse state
  const visibleEditors = Object.values(collapseEditor).filter(c => !c).length;
  const editorHeight = visibleEditors > 0 ? `${100 / visibleEditors}%` : '0';

  return (
    <div className={`mainWrape ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`aside ${isCollapsed ? 'collapsed' : ''}`} style={{ height: '100vh' }}>
        <button className="toggle-btn" onClick={() => setIsCollapsed(prev => !prev)}>
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
              {isLeader && <p className="leaderHint">You can switch members between spectator and editor at any time.</p>}
            </div>
          )}
          {!isCollapsed && (
            <div className="clientList" style={{ padding: '20px 0' }}>
              <AnimatePresence>
              {clients.map(client => (
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
            {!isCollapsed && <button className="btn-primary copyBtn" onClick={copySpectatorInvite}><Copy size={16} /> Copy Spectator Invite</button>}
            <button className={`btn-primary LeaveBtn ${isCollapsed ? 'collapsed-btn' : ''}`} onClick={leaveRoom}><LogOut size={16} /> {!isCollapsed && 'Leave'}</button>
          </div>
        </div>
      </aside>

      {/* Editors + Preview */}
      <div className="workspacePane">
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
              <button
                className="btn-primary"
                onClick={runCode}
                disabled={isRunning || isSpectator}
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: (isRunning || isSpectator) ? 0.7 : 1, width: 'auto' }}
              >
                <Play size={14} /> {isSpectator ? 'Read Only' : isRunning ? 'Running...' : 'Run JS'}
              </button>
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

      {/* Chat Drawer */}
      {socketsReady && (
        <Chat
          socketRef={socketJSRef}
          roomId={roomId}
          username={username}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
};
export default EditorPage;
 
