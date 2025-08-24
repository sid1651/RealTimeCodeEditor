// src/pages/EditorPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import EditorHTML from '../components/Editorhtml';
import EditorCSS from '../components/Editorcss';
import { initSocketJS, initSocketHTML, initSocketCSS } from '../socket';
import { useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';
import Preview from '../components/preview';
import './editor-split.css';

const EditorPage = () => {
    const socketJSRef = useRef(null);
    const socketHTMLRef = useRef(null);
    const socketCSSRef = useRef(null);

    const codeRef = useRef({ javascript: '', htmlmixed: '', css: '' });
    const [jsCode, setJsCode] = useState('');
    const [htmlCode, setHtmlCode] = useState('');
    const [cssCode, setCssCode] = useState('');

    const location = useLocation();
    const reactNavigator = useNavigate();
    const { roomId } = useParams();
    const [clients, setClients] = useState([]);

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

                socketJSRef.current.on(ACTIONS.JOINED, ({ clients: joinedClients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} has joined the room!`);
                    }
                    setClients(joinedClients);
                    socketJSRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                });

                socketJSRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                    toast.success(`${username} has left the room`);
                    setClients(prev => prev.filter(client => client.socketId !== socketId));
                });

                // SYNC_CODE handlers
                socketJSRef.current.on(ACTIONS.SYNC_CODE, payload => {
                    if (!payload) return;
                    if (payload.javascript) {
                        codeRef.current.javascript = payload.javascript;
                        setJsCode(payload.javascript);
                    }
                });
                socketHTMLRef.current.on(ACTIONS.SYNC_CODE, payload => {
                    if (!payload) return;
                    if (payload.htmlmixed) {
                        codeRef.current.htmlmixed = payload.htmlmixed;
                        setHtmlCode(payload.htmlmixed);
                    }
                });
                socketCSSRef.current.on(ACTIONS.SYNC_CODE, payload => {
                    if (!payload) return;
                    if (payload.css) {
                        codeRef.current.css = payload.css;
                        setCssCode(payload.css);
                    }
                });

                // Live CODE_CHANGE handlers
                socketJSRef.current.on(ACTIONS.CODE_CHANGE, payload => {
                    if (!payload) return;
                    if (payload.javascript) {
                        codeRef.current.javascript = payload.javascript;
                        setJsCode(payload.javascript);
                    }
                });
                socketHTMLRef.current.on(ACTIONS.CODE_CHANGE, payload => {
                    if (!payload) return;
                    if (payload.htmlmixed) {
                        codeRef.current.htmlmixed = payload.htmlmixed;
                        setHtmlCode(payload.htmlmixed);
                    }
                });
                socketCSSRef.current.on(ACTIONS.CODE_CHANGE, payload => {
                    if (!payload) return;
                    if (payload.css) {
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
            if (socketJSRef.current) {
                socketJSRef.current.off();
                socketJSRef.current.disconnect();
            }
            if (socketHTMLRef.current) {
                socketHTMLRef.current.off();
                socketHTMLRef.current.disconnect();
            }
            if (socketCSSRef.current) {
                socketCSSRef.current.off();
                socketCSSRef.current.disconnect();
            }
        };
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied!');
        } catch (err) {
            toast.error('Failed to copy Room ID');
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrape row" style={{ overflowX: 'hidden' }}>
            <div className="col-12 p-0">
                <div className="aside" style={{ height: '100vh' }}>
                    <div className="asideInner">
                        <div className="logo">
                            <img src="/logo-dark.png" alt="logo" className="logo" />
                            <h2>Kódikos</h2>
                        </div>
                        <h3>Connected Users</h3>
                        <div className="clientList">
                            {clients.map((client) => (
                                <Client key={client.socketId} username={client.username} />
                            ))}
                        </div>
                    </div>

                    <div className="d-flex-row align-items-end justify-content-center">
                        <Preview htmlCode={htmlCode} cssCode={cssCode} jsCode={jsCode} />
                        <button className="btn copyBtn" onClick={copyRoomId}>
                            Copy Room Id
                        </button>
                        <button className="btn LeaveBtn" onClick={leaveRoom}>
                            Exit Room
                        </button>
                    </div>
                </div>
            </div>

            <div className="col-12" style={{ width: '100%' }}>
                <div className="editorWrap" style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ flex: 1 }} className="editorContainer">
                        <Editor
                            socketRef={socketJSRef}
                            roomId={roomId}
                            value={jsCode}
                            onCodeChange={(code) => {
                                codeRef.current.javascript = code;
                                setJsCode(code);
                            }}
                        />
                    </div>
                    <div style={{ flex: 1 }} className="editorContainer">
                        <EditorHTML
                            socketRef={socketHTMLRef}
                            roomId={roomId}
                            value={htmlCode}
                            onCodeChange={(code) => {
                                codeRef.current.htmlmixed = code;
                                setHtmlCode(code);
                            }}
                        />
                    </div>
                    <div style={{ flex: 1 }} className="editorContainer">
                        <EditorCSS
                            socketRef={socketCSSRef}
                            roomId={roomId}
                            value={cssCode}
                            onCodeChange={(code) => {
                                codeRef.current.css = code;
                                setCssCode(code);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
