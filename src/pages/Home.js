/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import {useNavigate} from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, User, LogIn } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();
     const[roomId, setRoomId] = useState('');
     const[username, setUsername] = useState('');
    const CreateNewRoom = (e) => {
       e.preventDefault();
       const id=uuidV4();
         setRoomId(id);
         toast.success('Created a new room');
       
    }
    const joinRoom=()=>{
        if(!roomId || !username){
            toast.error('Room ID and Username are required');
            return;
        }
            navigate(`/editor/${roomId}`,{
                state:{
                    username,
                    
                }
            } )
        
    }
    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    }
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
                    <button onClick={joinRoom} className='btn-primary joinBtn'><LogIn size={18} /> Join Room</button>
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