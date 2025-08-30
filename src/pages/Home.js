/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import {useNavigate} from 'react-router-dom';
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
            <div className='formWrapper'>
                <div className='logoContainer'>
                    <img src='/logo-dark.png' alt='logo' className='logo' />
                    <h2>Kódikos</h2>
                </div>

                <h4 className='mainlabel'>Paste invitation room ID</h4>
                <div className='inputGroup'>
                    <input onKeyUp={handleInputEnter} onChange={(e)=>setRoomId(e.target.value)} value ={roomId} type='text' className='inputBox' placeholder='Room ID' />
                    <input onChange={(e)=>setUsername(e.target.value)}value={username}type='text' className='inputBox' placeholder='Username' />
                    <button onClick={joinRoom} className='btn joinBtn'>Join</button>
                    <span className='createInfo'> if you  don't have an invite then create  <a onClick={(e)=>{e.preventDefault();CreateNewRoom(e);}} href='#' className='createNewBtn'>new room</a></span>
                </div>
            </div>
            <foter>
                <h7>© 2025 Kódikos — Built for collaborative learning & building.</h7>
            </foter>
        </div>
    )
}
export default Home;