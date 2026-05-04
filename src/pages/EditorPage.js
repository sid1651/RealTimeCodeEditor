import React, { useEffect, useRef, useState } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import EditorHTML from '../components/Editorhtml';
import EditorCSS from '../components/Editorcss';
import { initSocketJS, initSocketHTML, initSocketCSS } from '../socket';
import { useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Copy, LogOut, Code2, LayoutTemplate } from 'lucide-react';


// 

const EditorPage = () => {
  const socketJSRef = useRef(null);
  const socketHTMLRef = useRef(null);
  const socketCSSRef = useRef(null);

  const codeRef = useRef({ javascript: '', htmlmixed: '', css: '' });

  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ROOM-SPECIFIC LOCAL STORAGE STATE
  const [jsCode, setJsCode] = useState(localStorage.getItem(`jsCode_${roomId}`) || '');
  const [htmlCode, setHtmlCode] = useState(localStorage.getItem(`htmlCode_${roomId}`) || '');
  const [cssCode, setCssCode] = useState(localStorage.getItem(`cssCode_${roomId}`) || '');

  const [clients, setClients] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false); // Sidebar collapsed
  const [Colaps, setColaps] = useState(false); // Preview collapsed

  // ✅ New state for individual editor collapse
  const [collapseEditor, setCollapseEditor] = useState({
    js: false,
    html: false,
    css: false,
  });

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
    const initAll = async () => {
      try {
        socketJSRef.current = await initSocketJS();
        socketHTMLRef.current = await initSocketHTML();
        socketCSSRef.current = await initSocketCSS();

        const handleErrors = (err) => {
          console.error('Socket connection error:', err);
          toast.error('Socket connection failed. Please try again.');
          navigate('/');
        };

        socketJSRef.current.on('connect_error', handleErrors);
        socketHTMLRef.current.on('connect_error', handleErrors);
        socketCSSRef.current.on('connect_error', handleErrors);

        const joinPayload = { roomId, username: location.state?.username };
        socketJSRef.current.emit(ACTIONS.JOIN, joinPayload);
        socketHTMLRef.current.emit(ACTIONS.JOIN, joinPayload);
        socketCSSRef.current.emit(ACTIONS.JOIN, joinPayload);

        // --- JOINED EVENT ---
        socketJSRef.current.on(ACTIONS.JOINED, ({ clients: joinedClients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} has joined the room!`);
          }
          setClients(joinedClients);

          // Sync existing code
          socketJSRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.javascript, socketId });
          socketHTMLRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.htmlmixed, socketId });
          socketCSSRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.css, socketId });
        });

        // --- DISCONNECTED EVENT ---
        socketJSRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} has left the room`);
          setClients(prev => prev.filter(client => client.socketId !== socketId));
        });

        // --- SYNC CODE FROM SERVER ---
        socketJSRef.current.on(ACTIONS.SYNC_CODE, payload => {
          if (typeof payload?.code === 'string') {
            codeRef.current.javascript = payload.code;
            setJsCode(payload.code);
          }
        });
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

        // --- LIVE CODE CHANGES ---
        socketJSRef.current.on(ACTIONS.CODE_CHANGE, payload => {
          if (typeof payload?.code === 'string') setJsCode(payload.code);
        });
        socketHTMLRef.current.on(ACTIONS.CODE_CHANGE, payload => {
          if (typeof payload?.code === 'string') setHtmlCode(payload.code);
        });
        socketCSSRef.current.on(ACTIONS.CODE_CHANGE, payload => {
          if (typeof payload?.code === 'string') setCssCode(payload.code);
        });

      } catch (err) {
        console.error('Failed to init sockets', err);
        toast.error('Failed to connect to collaboration servers.');
        navigate('/');
      }
    };

    initAll();

    return () => {
      socketJSRef.current?.disconnect();
      socketHTMLRef.current?.disconnect();
      socketCSSRef.current?.disconnect();
    };
  }, [roomId, location.state, navigate]);

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

  // --- COPY ROOM ID ---
  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied!');
    } catch {
      toast.error('Failed to copy Room ID');
    }
  };

  // --- LEAVE ROOM ---
  const leaveRoom = () => {
    localStorage.removeItem(`jsCode_${roomId}`);
    localStorage.removeItem(`htmlCode_${roomId}`);
    localStorage.removeItem(`cssCode_${roomId}`);
    navigate('/');
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
            <div className="clientList" style={{ padding: '20px 0' }}>
              <AnimatePresence>
              {clients.map(client => <Client key={client.socketId} username={client.username} />)}
              </AnimatePresence>
            </div>
          )}
          <div className="actionButtons">
            {!isCollapsed && <button className="btn-primary copyBtn" onClick={copyRoomId}><Copy size={16} /> Copy ID</button>}
            <button className={`btn-primary LeaveBtn ${isCollapsed ? 'collapsed-btn' : ''}`} onClick={leaveRoom}><LogOut size={16} /> {!isCollapsed && 'Leave'}</button>
          </div>
        </div>
      </aside>

      {/* Editors + Preview */}
      <div>
        <div className="editorWrap">
          <div className='editorholder' style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* JavaScript Editor */}
            {!collapseEditor.js && (
              <div style={{ height: editorHeight }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code2 size={16} color="#facc15" /> JavaScript</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor(prev => ({ ...prev, js: true }))}><ChevronUp size={18} /></button>
                </div>
                <Editor
                  socketRef={socketJSRef}
                  roomId={roomId}
                  value={jsCode}
                  isClientCollapsed={isCollapsed}
                  isPreviewCollapsed={Colaps}
                  onCodeChange={code => setJsCode(code)}
                />
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
                <EditorHTML
                  socketRef={socketHTMLRef}
                  roomId={roomId}
                  value={htmlCode}
                  isClientCollapsed={isCollapsed}
                  isPreviewCollapsed={Colaps}
                  onCodeChange={code => setHtmlCode(code)}
                />
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
                <EditorCSS
                  socketRef={socketCSSRef}
                  roomId={roomId}
                  value={cssCode}
                  isClientCollapsed={isCollapsed}
                  isPreviewCollapsed={Colaps}
                  onCodeChange={code => setCssCode(code)}
                />
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
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
              <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><LayoutTemplate size={18}/> Live Preview</span>
            </h3>
            {!Colaps && <iframe ref={iframeRef} title="Live Preview" />}
          </div>
        </div>
      </div>
    </div>
  );
};
export default EditorPage;
 