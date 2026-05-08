/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Eye, KeyRound, LogIn, PencilLine, User } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('editor');
    const [createdRoomId, setCreatedRoomId] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const inviteRoomId = params.get('roomId');
        const inviteRole = params.get('role');

        if (inviteRoomId) {
            setRoomId(inviteRoomId);
        }

        if (inviteRole === 'spectator' || inviteRole === 'editor') {
            setRole(inviteRole);
        }
    }, [location.search]);

    const inviteLinks = useMemo(() => {
        if (!createdRoomId) {
            return null;
        }

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return {
            editor: `${baseUrl}/home?roomId=${createdRoomId}&role=editor`,
            spectator: `${baseUrl}/home?roomId=${createdRoomId}&role=spectator`,
        };
    }, [createdRoomId]);

    const CreateNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        setCreatedRoomId(id);
        setRole('editor');
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if(!roomId || !username){
            toast.error('Room ID and Username are required');
            return;
        }

        navigate(`/editor/${roomId}`, {
                state: {
                    username,
                    role,
                    participantId: uuidV4(),
                }
            });
    };

    const copyInvite = async (inviteRole) => {
        if (!inviteLinks) {
            return;
        }

        try {
            await navigator.clipboard.writeText(inviteLinks[inviteRole]);
            toast.success(`${inviteRole === 'editor' ? 'Editor' : 'Spectator'} invite copied`);
        } catch {
            toast.error('Failed to copy invite');
        }
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className='homePageWrapper'>
            <motion.div 
                className='formWrapper'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <div className='logoContainer'>
                    <img src='/logo-dark.png' alt='logo' className='logo' />
                    <h2>Kódikos</h2>
                </div>

                <h4 className='mainlabel'>Paste invitation room ID</h4>
                <div className='inputGroup'>
                    <div className="inputWrapper">
                        <KeyRound className="inputIcon" size={18} />
                        <input onKeyUp={handleInputEnter} onChange={(e)=>setRoomId(e.target.value)} value ={roomId} type='text' className='inputBox' placeholder='Room ID' />
                    </div>
                    <div className="inputWrapper">
                        <User className="inputIcon" size={18} />
                        <input onChange={(e)=>setUsername(e.target.value)} value={username} type='text' className='inputBox' placeholder='Username' />
                    </div>
                    <div className="roleSelector">
                        <button
                            type="button"
                            className={`roleOption ${role === 'editor' ? 'active' : ''}`}
                            onClick={() => setRole('editor')}
                        >
                            <PencilLine size={16} />
                            <span>Editor</span>
                        </button>
                        <button
                            type="button"
                            className={`roleOption ${role === 'spectator' ? 'active' : ''}`}
                            onClick={() => setRole('spectator')}
                        >
                            <Eye size={16} />
                            <span>Spectator</span>
                        </button>
                    </div>
                    <p className='roleHint'>
                        {role === 'spectator'
                            ? 'Spectators can join and watch changes live, but cannot edit the code.'
                            : 'Editors can type, run JavaScript, and collaborate live in the room.'}
                    </p>
                    <button onClick={joinRoom} className='btn-primary joinBtn'>
                        <LogIn size={18} /> Join as {role === 'spectator' ? 'Spectator' : 'Editor'}
                    </button>
                    {inviteLinks && (
                        <div className="invitePanel">
                            <p className="inviteTitle">Share this room</p>
                            <div className="inviteCard">
                                <div>
                                    <span className="inviteBadge">Editors</span>
                                    <p className="inviteText">Full access for collaborative coding.</p>
                                </div>
                                <button type="button" className="btn-outline inviteCopyBtn" onClick={() => copyInvite('editor')}>
                                    <Copy size={16} /> Copy Invite
                                </button>
                            </div>
                            <div className="inviteCard">
                                <div>
                                    <span className="inviteBadge spectator">Spectators</span>
                                    <p className="inviteText">Read-only access for teaching and interviews.</p>
                                </div>
                                <button type="button" className="btn-outline inviteCopyBtn" onClick={() => copyInvite('spectator')}>
                                    <Copy size={16} /> Copy Invite
                                </button>
                            </div>
                        </div>
                    )}
                    <span className='createInfo'> Don't have an invite? Create a <a onClick={(e)=>{e.preventDefault();CreateNewRoom(e);}} href='#' className='createNewBtn'>new room</a></span>
                </div>
            </motion.div>
            <footer>
                <p>© 2025 Kódikos — Built for collaborative learning & building.</p>
            </footer>
        </div>
    )
}
export default Home;
