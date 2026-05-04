import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';

const Chat = ({ socketRef, roomId, username, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, { ...data, isMe: false }]);
    };

    socketRef.current.on('receive-message', handleReceiveMessage);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('receive-message', handleReceiveMessage);
      }
    };
  }, [socketRef.current]);

  // Auto-scroll to the bottom of the chat when a new message arrives
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !socketRef.current) return;

    const messageData = {
      roomId,
      message: inputValue,
      username,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socketRef.current.emit('send-message', messageData);
    setMessages((prev) => [...prev, { ...messageData, isMe: true }]);
    setInputValue('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '320px',
            height: '100vh',
            backgroundColor: '#1e1e2e', // Dracula theme background matching editors
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#f8f8f2', fontSize: '16px', fontWeight: 'bold' }}>Room Chat</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#f8f8f2', cursor: 'pointer', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>
          
          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: '#6272a4', fontSize: '14px', marginTop: '20px' }}>
                No messages yet. Say hi!
              </p>
            )}
            {messages.map((msg, index) => (
              <div key={index} style={{ alignSelf: msg.isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <span style={{ fontSize: '11px', color: '#6272a4', marginLeft: msg.isMe ? 'auto' : '0', display: 'block', textAlign: msg.isMe ? 'right' : 'left', marginBottom: '4px' }}>
                  {msg.isMe ? 'You' : msg.username} • {msg.time}
                </span>
                <div style={{ 
                  backgroundColor: msg.isMe ? '#bd93f9' : '#44475a', 
                  color: msg.isMe ? '#282a36' : '#f8f8f2', 
                  padding: '10px 14px', 
                  borderRadius: '12px',
                  borderBottomRightRadius: msg.isMe ? '2px' : '12px',
                  borderBottomLeftRadius: msg.isMe ? '12px' : '2px',
                  wordBreak: 'break-word',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '10px', backgroundColor: '#282a36' }}>
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #6272a4', backgroundColor: '#1e1e2e', color: '#f8f8f2', outline: 'none', fontSize: '14px' }} />
            <button type="submit" style={{ backgroundColor: '#bd93f9', color: '#282a36', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}>
              <Send size={18} />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Chat;