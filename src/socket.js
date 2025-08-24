// src/socket.js
import { io } from 'socket.io-client';

const baseOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnectionAttempts: Infinity,
  timeout: 10000,
};

export const initSocketJS = async () => {
  const backend = process.env.REACT_APP_BACKEND_JS || 'http://localhost:5000';
  return io(backend, baseOptions);
};

export const initSocketHTML = async () => {
  const backend = process.env.REACT_APP_BACKEND_HTML || 'http://localhost:5001';
  return io(backend, baseOptions);
};

export const initSocketCSS = async () => {
  const backend = process.env.REACT_APP_BACKEND_CSS || 'http://localhost:5002';
  return io(backend, baseOptions);
};
