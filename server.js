const express = require('express');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: "*" },
});
require('dotenv').config(); 
app.use(express.static('build'));


const userSocketMap = {};
const ACTIONS = require('./src/Actions'); // adjust path if needed
const path = require('path');
app.use((req,res,next)=>{
res.sendFile(path.join(__dirname,'build','index.html'))
})

function getAllConnectedClients(roomId, namespace) {
  return Array.from(io.of(namespace).adapter.rooms.get(roomId) || []).map((socketId) => {
    return {
      socketId,
      username: userSocketMap[socketId]
    };
  });
}

// Helper to attach listeners per namespace
function setupNamespace(namespace) {
  io.of(namespace).on('connection', (socket) => {
    console.log(`socket connected to ${namespace}`, socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
      userSocketMap[socket.id] = username;
      socket.join(roomId);

      const clients = getAllConnectedClients(roomId, namespace);
      console.log(`${username} joined room ${roomId} in ${namespace}`);

      clients.forEach(({ socketId }) => {
        io.of(namespace).to(socketId).emit(ACTIONS.JOINED, {
          clients,
          username,
          socketId: socket.id
        });
      });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, editorType }) => {
      socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code, editorType });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, editorType }) => {
      io.of(namespace).to(socketId).emit(ACTIONS.CODE_CHANGE, { code, editorType });
    });

    socket.on('cursor-change', ({ roomId, username, color, cursor }) => {
      socket.in(roomId).emit('cursor-change', {
        socketId: socket.id,
        username,
        color,
        cursor,
      });
    });

    socket.on('send-message', ({ roomId, message, username, time }) => {
      socket.in(roomId).emit('receive-message', { message, username, time });
    });

    socket.on('code-output', ({ roomId, output, username }) => {
      socket.in(roomId).emit('code-output', { output, username });
    });

    socket.on('disconnecting', () => {
      const rooms = [...socket.rooms];
      rooms.forEach((roomId) => {
        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: userSocketMap[socket.id],
        });
      });
      delete userSocketMap[socket.id];
    });
  });
}

// Setup namespaces
setupNamespace('/');
setupNamespace('/js');
setupNamespace('/html');
setupNamespace('/css');
const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
