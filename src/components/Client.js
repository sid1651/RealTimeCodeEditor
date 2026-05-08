import React from 'react';
import Avatar from 'react-avatar'; // Assuming Avatar is a component that renders the user's avatar
import { motion } from 'framer-motion';
import { Eye, PencilLine } from 'lucide-react';

const Client = ({ username, role = 'editor', isLeader = false, canManageRole = false, onToggleRole }) => {
    return(
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className='client'
        >
            <div className='clientMain'>
                <Avatar name={username} size={50} round='14px'/>
                <div className='clientMeta'>
                    <span className='username'>{username}</span>
                    <div className='clientBadges'>
                        <span className={`clientRole ${role === 'spectator' ? 'spectator' : ''}`}>
                            {role === 'spectator' ? 'Spectator' : 'Editor'}
                        </span>
                        {isLeader && <span className='clientRole leader'>Leader</span>}
                    </div>
                </div>
            </div>
            {canManageRole && (
                <button
                    type="button"
                    className={`promoteBtn ${role === 'spectator' ? 'promote' : 'demote'}`}
                    onClick={onToggleRole}
                >
                    {role === 'spectator' ? <PencilLine size={14} /> : <Eye size={14} />}
                    {role === 'spectator' ? 'Allow Editing' : 'Switch To Spectator'}
                </button>
            )}
        </motion.div>
    )
}
export default Client;
