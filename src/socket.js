// src/socket.js
import { io } from 'socket.io-client';

const baseOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnectionAttempts: Infinity,
  timeout: 10000,
};

export const initSocketJS = async () => {
  const backend = process.env.REACT_APP_BACKEND_JS ;
  return io(backend, baseOptions);
};

export const initSocketHTML = async () => {
  const backend = process.env.REACT_APP_BACKEND_HTML ;
  return io(backend, baseOptions);
};

export const initSocketCSS = async () => {
  const backend = process.env.REACT_APP_BACKEND_CSS ;
  return io(backend, baseOptions);
};
