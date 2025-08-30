import React, { useEffect, useRef, useState } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import EditorHTML from '../components/Editorhtml';
import EditorCSS from '../components/Editorcss';
import { initSocketJS, initSocketHTML, initSocketCSS } from '../socket';
import { useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';

const EditorPage = () => {
  const socketJSRef = useRef(null);
  const socketHTMLRef = useRef(null);
  const socketCSSRef = useRef(null);

  const codeRef = useRef({ javascript: '', htmlmixed: '', css: '' });
  const [jsCode, setJsCode] = useState(localStorage.getItem("jsCode") || "");
  const [htmlCode, setHtmlCode] = useState(localStorage.getItem("htmlCode") || "");
  const [cssCode, setCssCode] = useState(localStorage.getItem("cssCode") || "");
  const [isCollapsed, setIsCollapsed] = useState(false); // sidebar collapsed
  const [Colaps, setColaps] = useState(false); // preview collapsed

  const location = useLocation();
  const reactNavigator = useNavigate();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);
  useEffect(() => {
    localStorage.setItem("jsCode", jsCode);
  }, [jsCode]);

  useEffect(() => {
    localStorage.setItem("htmlCode", htmlCode);
  }, [htmlCode]);

  useEffect(() => {
    localStorage.setItem("cssCode", cssCode);
  }, [cssCode]);
  const iframeRef = useRef(null);

  useEffect(() => {
    const initAll = async () => {
      try {
        socketJSRef.current = await initSocketJS();
        socketHTMLRef.current = await initSocketHTML();
        socketCSSRef.current = await initSocketCSS();

        function handleErrors(err) {
          console.error('Socket connection error:', err);
          toast.error('Socket connection failed. Please try again later.');
          reactNavigator('/');
        }

        socketJSRef.current.on('connect_error', handleErrors);
        socketHTMLRef.current.on('connect_error', handleErrors);
        socketCSSRef.current.on('connect_error', handleErrors);

        const joinPayload = { roomId, username: location.state?.username };
        socketJSRef.current.emit(ACTIONS.JOIN, joinPayload);
        socketHTMLRef.current.emit(ACTIONS.JOIN, joinPayload);
        socketCSSRef.current.emit(ACTIONS.JOIN, joinPayload);

        socketJSRef.current.on(
          ACTIONS.JOINED,
          ({ clients: joinedClients, username, socketId }) => {
            if (username !== location.state?.username) {
              toast.success(`${username} has joined the room!`);
            }
            setClients(joinedClients);

            socketJSRef.current.emit(ACTIONS.SYNC_CODE, {
              javascript: codeRef.current.javascript,
              socketId,
            });
            socketHTMLRef.current.emit(ACTIONS.SYNC_CODE, {
              htmlmixed: codeRef.current.htmlmixed,
              socketId,
            });
            socketCSSRef.current.emit(ACTIONS.SYNC_CODE, {
              css: codeRef.current.css,
              socketId,
            });
          }
        );

        socketJSRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} has left the room`);
          setClients(prev => prev.filter(client => client.socketId !== socketId));
        });

        // Sync handlers
        socketJSRef.current.on(ACTIONS.SYNC_CODE, payload => {
          if (payload?.javascript) {
            codeRef.current.javascript = payload.javascript;
            setJsCode(payload.javascript);
          }
        });
        socketHTMLRef.current.on(ACTIONS.SYNC_CODE, payload => {
          if (payload?.htmlmixed) {
            codeRef.current.htmlmixed = payload.htmlmixed;
            setHtmlCode(payload.htmlmixed);
          }
        });
        socketCSSRef.current.on(ACTIONS.SYNC_CODE, payload => {
          if (payload?.css) {
            codeRef.current.css = payload.css;
            setCssCode(payload.css);
          }
        });

        // Code change handlers
        socketJSRef.current.on(ACTIONS.CODE_CHANGE, payload => {
          if (payload?.javascript) {
            codeRef.current.javascript = payload.javascript;
            setJsCode(payload.javascript);
          }
        });
        socketHTMLRef.current.on(ACTIONS.CODE_CHANGE, payload => {
          if (payload?.htmlmixed) {
            codeRef.current.htmlmixed = payload.htmlmixed;
            setHtmlCode(payload.htmlmixed);
          }
        });
        socketCSSRef.current.on(ACTIONS.CODE_CHANGE, payload => {
          if (payload?.css) {
            codeRef.current.css = payload.css;
            setCssCode(payload.css);
          }
        });
      } catch (e) {
        console.error('Failed to init sockets', e);
        toast.error('Failed to connect to collaboration servers.');
        reactNavigator('/');
      }
    };

    initAll();

    return () => {
      socketJSRef.current?.disconnect();
      socketHTMLRef.current?.disconnect();
      socketCSSRef.current?.disconnect();
    };
  }, [roomId, location.state, reactNavigator]);

  useEffect(() => {
    if (iframeRef.current) {
      const documentContent = `
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
          <script>${jsCode || ''}<\/script>
        </body>
        </html>
      `;
      const iframeDoc =
        iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(documentContent);
      iframeDoc.close();
    }
  }, [htmlCode, cssCode, jsCode]);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied!');
    } catch {
      toast.error('Failed to copy Room ID');
    }
  }

  function leaveRoom() {
    reactNavigator('/');
  }

  if (!location.state) return <Navigate to="/" />;

  return (
    <div className="mainWrape row" style={{ overflowX: 'hidden', display: 'flex' }}>
      {/* Sidebar */}
      <aside className={`aside ${isCollapsed ? 'collapsed' : ''}`} style={{ height: '100vh' }}>
        <button className="toggle-btn" onClick={() => setIsCollapsed(prev => !prev)}>
          {isCollapsed ? '>' : '<'}
        </button>

        {!isCollapsed && (
          <div className="asideInner">
            <div className="logo">
              <img src="/logo-dark.png" alt="logo" className="logo" />
              <h2>Kódikos</h2>
            </div>

            <h3>Connected Users</h3>
            <div className="clientList">
              {clients.map(client => (
                <Client key={client.socketId} username={client.username} />
              ))}
            </div>

            <div className="d-flex-row align-items-end justify-content-center">
              <button className="btn copyBtn" onClick={copyRoomId}>
                Copy Room Id
              </button>
              <button className="btn LeaveBtn" onClick={leaveRoom}>
                Exit Room
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Editors + Preview */}
      <div className="col-12" style={{ flex: 1 }}>
        <div
          className={`editorWrap ${/* optional fullscreen helper */ ''}`}
          style={{ display: 'flex', gap: '4px', position: 'relative', height: '100vh' }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ flex: 1 }} className="editorContainer">
              <Editor
                socketRef={socketJSRef}
                roomId={roomId}
                value={jsCode}
                isClientCollapsed={isCollapsed}
                isPreviewCollapsed={Colaps}
                onCodeChange={code => {
                  codeRef.current.javascript = code;
                  setJsCode(code);
                }}
              />
              <h6 style ={{display:"flex"}}>Javascript</h6>
            </div>

            <div style={{ flex: 1 }} className="editorContainer">
              <EditorHTML
                socketRef={socketHTMLRef}
                roomId={roomId}
                value={htmlCode}
                isClientCollapsed={isCollapsed}
                isPreviewCollapsed={Colaps}
                onCodeChange={code => {
                  codeRef.current.htmlmixed = code;
                  setHtmlCode(code);
                }}
              />
              <h6 style ={{display:"flex"}}>Html</h6>
            </div>

            <div style={{ flex: 1 }} className="editorContainer">
              <EditorCSS
                socketRef={socketCSSRef}
                roomId={roomId}
                value={cssCode}
                isClientCollapsed={isCollapsed}
                isPreviewCollapsed={Colaps}
                onCodeChange={code => {
                  codeRef.current.css = code;
                  setCssCode(code);
                }}
              />
              <h6 style ={{display:"flex"}}>Css</h6>
            </div>
          </div>

          {/* Live Preview */}
          <div className={`previwcolapsstyle ${Colaps ? 'collapsed' : ''}`}>
            <button className="collapse-btn" onClick={() => setColaps(prev => !prev)}>
              {Colaps ? '<' : '>'}
            </button>
            <h3>Live Preview</h3>
            {!Colaps && (
              <>
                <div className="preview-header" />
                <iframe ref={iframeRef} title="Live Preview" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
