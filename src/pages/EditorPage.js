import React, { useEffect, useRef, useState } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import { useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Actions from '../Actions';   // ✅ import Action

const EditorPage = () => {
    const socketRef = useRef(null);
    const location = useLocation();
    const reactNavigator = useNavigate();
    const { roomId } = useParams();
    console.log('roomId:', roomId);
     const [clients, setClients] = useState([
       
    ]);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();

            socketRef.current.on('connect_error', handleErrors);
            socketRef.current.on('connect_failed', handleErrors);

            function handleErrors(err) {
                console.log('Socket connection error:', err);
                toast.error('Socket connection error. Please try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(Actions.JOIN, {   // ✅ use Action.JOIN
                roomId,
                username: location.state?.username
            });

            socketRef.current.on(Actions.JOINED, ({ clients, username, socketId }) => {
                console.log('Joined:', clients, username, socketId);
                if(username!== location.state?.username) {
                    toast.success(`${username} has joined the room!`);
                    console.log(`${username} has joined the room!`);
                }
                setClients(clients);
            });
        };
        init();
    }, []);

   

    if (!location.state) {
        return <Navigate to="/" />;   // ✅ use Navigate with capital N
    }

    return (
        <div className='mainWrape'>
            <div className='aside'>
                <div className='asideInner'>
                    <div className='logo'>
                        <img src='/logo-dark.png' alt='logo' className='logo' />
                        <h2>Kódikos</h2>
                    </div>
                    <h3>conected</h3>
                    <div className='clientList'>
                        {clients.map((client) => (
                            <Client key={client.socket} username={client.username} />
                        ))}
                    </div>
                </div>
                <button className='btn copyBtn'>Copy Room Id</button>
                <button className='btn LeaveBtn'>Exit Room</button>
            </div>
            <div className='editorWrap'>
                <Editor />
            </div>
        </div>
    );
};

export default EditorPage;
