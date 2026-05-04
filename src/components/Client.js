import React from 'react';
import Avatar from 'react-avatar'; // Assuming Avatar is a component that renders the user's avatar
import { motion } from 'framer-motion';

const Client=({username})=>{
    return(
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className='client'
        >
            <Avatar name={username} size={50} round='14px'/>
            <span className='username'>{username}</span>
        </motion.div>
    )
}
export default Client;