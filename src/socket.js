import { io } from "socket.io-client";

const baseOptions = {
  transports: ["websocket"],
  forceNew: true,
  reconnectionAttempts: Infinity,
  timeout: 10000,
};

const backend = process.env.REACT_APP_BACKEND; // one backend only

export const initSocketJS = async () => io(`${backend}/js`, baseOptions);
export const initSocketHTML = async () => io(`${backend}/html`, baseOptions);
export const initSocketCSS = async () => io(`${backend}/css`, baseOptions);
