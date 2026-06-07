import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioLines, Mic, Send, Square, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_RECORDING_MS = 90000;

const formatClock = (value) => {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const Chat = ({ socketRef, roomId, username, isOpen, onClose, onUnreadMessage }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [pendingVoiceNote, setPendingVoiceNote] = useState(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(null);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    const activeSocket = socketRef.current;
    if (!activeSocket) {
      return undefined;
    }

    const handleReceiveMessage = (data) => {
      if (!isOpen) {
        onUnreadMessage?.(true);
      }

      setMessages((prev) => [...prev, { ...data, isMe: false }]);
    };

    activeSocket.on('receive-message', handleReceiveMessage);

    return () => {
      activeSocket.off('receive-message', handleReceiveMessage);
    };
  }, [socketRef, isOpen, onUnreadMessage]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, pendingVoiceNote]);

  useEffect(() => () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
  }, []);

  const emitMessage = (messageData) => {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit('send-message', messageData);
    setMessages((prev) => [...prev, { ...messageData, isMe: true }]);
  };

  const sendTextMessage = (event) => {
    event.preventDefault();
    if (!inputValue.trim() || !socketRef.current) {
      return;
    }

    const messageData = {
      roomId,
      kind: 'text',
      message: inputValue.trim(),
      username,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    emitMessage(messageData);
    setInputValue('');
  };

  const stopRecording = () => {
    if (!isRecording) {
      return;
    }

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    mediaRecorderRef.current?.stop?.();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setPendingVoiceNote(null);
      setRecordingDurationMs(0);
      setIsRecording(true);

      recorder.ondataavailable = (recordingEvent) => {
        if (recordingEvent.data?.size) {
          recordingChunksRef.current.push(recordingEvent.data);
        }
      };

      recorder.onstop = async () => {
        const durationMs = Math.max(0, Date.now() - (recordingStartedAtRef.current || Date.now()));
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (!blob.size) {
          return;
        }

        const audioDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Unable to read the voice note.'));
          reader.readAsDataURL(blob);
        });

        setPendingVoiceNote({
          audioDataUrl,
          durationMs,
        });
      };

      recorder.start();

      recordingTimerRef.current = window.setInterval(() => {
        const nextDuration = Date.now() - (recordingStartedAtRef.current || Date.now());
        setRecordingDurationMs(nextDuration);

        if (nextDuration >= MAX_RECORDING_MS) {
          stopRecording();
        }
      }, 250);
    } catch (error) {
      toast.error(error.message || 'Unable to start recording.');
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = () => {
    if (!pendingVoiceNote || !socketRef.current) {
      return;
    }

    const messageData = {
      roomId,
      kind: 'voice',
      audioDataUrl: pendingVoiceNote.audioDataUrl,
      durationMs: pendingVoiceNote.durationMs,
      username,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    emitMessage(messageData);
    setPendingVoiceNote(null);
    setRecordingDurationMs(0);
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
            width: '340px',
            height: '100vh',
            backgroundColor: '#1e1e2e',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#f8f8f2', fontSize: '16px', fontWeight: 'bold' }}>Room Chat</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#f8f8f2', cursor: 'pointer', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: '#6272a4', fontSize: '14px', marginTop: '20px' }}>
                No messages yet. Send text or a voice note.
              </p>
            )}
            {messages.map((msg, index) => (
              <div key={index} style={{ alignSelf: msg.isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <span style={{ fontSize: '11px', color: '#6272a4', marginLeft: msg.isMe ? 'auto' : '0', display: 'block', textAlign: msg.isMe ? 'right' : 'left', marginBottom: '4px' }}>
                  {msg.isMe ? 'You' : msg.username} • {msg.time}
                </span>
                <div
                  style={{
                    backgroundColor: msg.isMe ? '#bd93f9' : '#44475a',
                    color: msg.isMe ? '#282a36' : '#f8f8f2',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    borderBottomRightRadius: msg.isMe ? '2px' : '12px',
                    borderBottomLeftRadius: msg.isMe ? '12px' : '2px',
                    wordBreak: 'break-word',
                    fontSize: '14px',
                    lineHeight: '1.4',
                  }}
                >
                  {msg.kind === 'voice' ? (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                        <AudioLines size={16} />
                        <span>Voice message</span>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.8 }}>
                          {formatClock(msg.durationMs || 0)}
                        </span>
                      </div>
                      <audio controls preload="metadata" src={msg.audioDataUrl} style={{ width: '100%' }} />
                    </div>
                  ) : (
                    msg.message
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {pendingVoiceNote && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: '#232533', display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8f8f2', fontSize: '13px', fontWeight: 700 }}>
                <AudioLines size={16} />
                <span>Voice note ready</span>
                <span style={{ marginLeft: 'auto', color: '#8be9fd' }}>{formatClock(pendingVoiceNote.durationMs)}</span>
              </div>
              <audio controls src={pendingVoiceNote.audioDataUrl} style={{ width: '100%' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setPendingVoiceNote(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#f8f8f2', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Trash2 size={16} /> Discard
                </button>
                <button type="button" onClick={sendVoiceMessage} style={{ flex: 1, backgroundColor: '#50fa7b', color: '#102116', border: 'none', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700 }}>
                  <Send size={16} /> Send Voice
                </button>
              </div>
            </div>
          )}

          {isRecording && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: '#232533', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '999px', backgroundColor: '#ff5555', boxShadow: '0 0 0 6px rgba(255,85,85,0.16)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#f8f8f2' }}>
                <strong style={{ fontSize: '13px' }}>Recording voice note</strong>
                <span style={{ fontSize: '12px', color: '#8be9fd' }}>{formatClock(recordingDurationMs)}</span>
              </div>
              <button type="button" onClick={stopRecording} style={{ marginLeft: 'auto', backgroundColor: '#ff5555', color: '#fff5f5', border: 'none', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <Square size={15} /> Stop
              </button>
            </div>
          )}

          <form onSubmit={sendTextMessage} style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '10px', backgroundColor: '#282a36' }}>
            <button
              type="button"
              onClick={startRecording}
              disabled={isRecording || Boolean(pendingVoiceNote)}
              style={{
                backgroundColor: isRecording ? '#ff5555' : '#44475a',
                color: '#f8f8f2',
                border: 'none',
                padding: '10px',
                borderRadius: '6px',
                cursor: pendingVoiceNote ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pendingVoiceNote ? 0.55 : 1,
              }}
              title="Record voice message"
            >
              <Mic size={18} />
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={isRecording ? 'Stop recording to type again...' : 'Type a message...'}
              disabled={isRecording}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #6272a4', backgroundColor: '#1e1e2e', color: '#f8f8f2', outline: 'none', fontSize: '14px', opacity: isRecording ? 0.65 : 1 }}
            />
            <button type="submit" style={{ backgroundColor: '#bd93f9', color: '#282a36', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s', opacity: isRecording || !inputValue.trim() ? 0.6 : 1 }} disabled={isRecording || !inputValue.trim()}>
              <Send size={18} />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Chat;
