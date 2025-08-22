import React, { useEffect, useRef, useState } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import { useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef=useRef(null)
    const location = useLocation();
    const reactNavigator = useNavigate();
    const { roomId } = useParams();

    const [clients, setClients] = useState([]);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();

            // ✅ Reset clients when connected (prevents duplicates after server restart)
            socketRef.current.on('connect', () => {
                console.log('Connected to server:', socketRef.current.id);
                setClients([]); // Clear old clients
            });

            socketRef.current.on('connect_error', handleErrors);
            socketRef.current.on('connect_failed', handleErrors);

            function handleErrors(err) {
                console.error('Socket connection error:', err);
                toast.error('Socket connection failed. Please try again later.');
                reactNavigator('/');
            }

            // ✅ Emit JOIN event
            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // ✅ When a user joins
            socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                console.log('Joined:', clients);
                if (username !== location.state?.username) {
                    toast.success(`${username} has joined the room!`);
                }
                setClients(clients); 
                socketRef.current.emit(ACTIONS.SYNC_CODE,{
                    code:codeRef.current,
                    socketId,
                })
            });

            // ✅ When a user disconnects
            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} has left the room`);
                setClients((prev) => prev.filter((client) => client.socketId !== socketId));
            });
        };

        init();

        // ✅ Cleanup to prevent duplicate listeners & stale connections
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect(); // Proper disconnect
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
            }
        };
    }, []);

    // ✅ Copy Room ID
    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied!');
        } catch (err) {
            toast.error('Failed to copy Room ID');
        }
    }

    // ✅ Leave Room
    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrape row">
            <div className='col-12'>
            <div className="aside" style={{height: "100vh"}}>
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
                <div className='d-flex-row align-items-end justify-content-center'>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy Room Id
                </button>
                <button className="btn LeaveBtn" onClick={leaveRoom}>
                    Exit Room
                </button>
                </div>
            </div>
            </div>
            <div className='col-12'>
            <div className="editorWrap">
                <Editor socketRef={socketRef} roomId={roomId} onCodeChange={(code)=>{
                    codeRef.current=code
                }} />
            </div>
            </div>
        </div>
    );
};

export default EditorPage;
