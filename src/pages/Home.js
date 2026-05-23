/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Eye, KeyRound, LogIn, PencilLine, User } from 'lucide-react';
import { createRoom } from '../utils/roomApi';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrlCandidates, getApiBaseUrl } from '../utils/api';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('editor');
    const [mode, setMode] = useState('vanilla');
    const [createdRoomId, setCreatedRoomId] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const inviteRoomId = params.get('roomId');
        const inviteRole = params.get('role');
        const inviteMode = params.get('mode');

        if (inviteRoomId) {
            setRoomId(inviteRoomId);
        }

        if (inviteRole === 'spectator' || inviteRole === 'editor') {
            setRole(inviteRole);
        }

        if (inviteMode === 'react' || inviteMode === 'vanilla') {
            setMode(inviteMode);
        }
    }, [location.search]);

    const inviteLinks = useMemo(() => {
        if (!createdRoomId) {
            return null;
        }

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return {
            editor: `${baseUrl}/home?roomId=${createdRoomId}&role=editor&mode=${mode}`,
            spectator: `${baseUrl}/home?roomId=${createdRoomId}&role=spectator&mode=${mode}`,
        };
    }, [createdRoomId, mode]);

    const CreateNewRoom = async (e) => {
        e.preventDefault();

        if (!user) {
            const id = uuidV4();
            setRoomId(id);
            setCreatedRoomId(id);
            setRole('editor');
            toast.success('Created a new room (Local fallback)');
            return;
        }

        try {
            console.debug('[Home:create-room]', {
                activeBaseUrl: getApiBaseUrl(),
                candidateBaseUrls: getApiBaseUrlCandidates(),
                mode,
                userId: user.id,
                hasUser: Boolean(user),
                locationOrigin: typeof window !== 'undefined' ? window.location.origin : null,
            });

            const data = await createRoom({
                title: `New ${mode === 'react' ? 'React' : 'Vanilla'} Project`,
                language: mode,
                privacy: 'shared',
                template: 'blank'
            });

            const id = data.room.roomId;
            console.debug('[Home:create-room:success]', {
                roomId: id,
                room: data.room,
            });
            setRoomId(id);
            setCreatedRoomId(id);
            setRole('editor');
            toast.success('Created a new room');
            navigate('/dashboard', {
                state: {
                    createdRoomId: id,
                },
            });
        } catch (error) {
            console.error('Failed to create room via API.', error.response || error);
            toast.error(
                error.response?.data?.message
                || error.message
                || 'Unable to create room right now.'
            );
        }
    };

    const joinRoom = () => {
        if(!roomId || !username){
            toast.error('Room ID and Username are required');
            return;
        }

        const destination = mode === 'react' ? `/react-studio/${roomId}` : `/editor/${roomId}`;

        navigate(destination, {
                state: {
                    username,
                    role,
                    mode,
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
                    <div className="modeSelectWrapper">
                        <label htmlFor="workspace-mode" className="modeLabel">Workspace</label>
                        <select
                            id="workspace-mode"
                            className="modeSelect"
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                        >
                            <option value="vanilla">HTML, CSS and JavaScript</option>
                            <option value="react">React Studio</option>
                        </select>
                    </div>
                    <p className='roleHint'>
                        {role === 'spectator'
                            ? 'Spectators can join and watch changes live, but cannot edit the code.'
                            : mode === 'react'
                                ? 'Editors can build React components together with a live JSX and CSS preview.'
                                : 'Editors can type, run JavaScript, and collaborate live in the room.'}
                    </p>
                    <button onClick={joinRoom} className='btn-primary joinBtn'>
                        <LogIn size={18} /> Join {mode === 'react' ? 'React Studio' : 'Editor'} as {role === 'spectator' ? 'Spectator' : 'Editor'}
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
