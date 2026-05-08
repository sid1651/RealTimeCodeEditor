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


const userSocketMap = {}; // Maps socketId to { username, role, participantId, isLeader }
const ACTIONS = require('./src/Actions'); // adjust path if needed
const path = require('path');
app.use((req,res,next)=>{
res.sendFile(path.join(__dirname,'build','index.html'))
})

function getAllConnectedClients(roomId, namespace) {
  return Array.from(io.of(namespace).adapter.rooms.get(roomId) || []).map((socketId) => {
    const info = userSocketMap[socketId] || {};
    return {
      socketId,
      username: info.username,
      role: info.role,
      participantId: info.participantId,
      isLeader: info.isLeader
    };
  });
}

// Helper to attach listeners per namespace
function setupNamespace(namespace) {
  io.of(namespace).on('connection', (socket) => {
    console.log(`socket connected to ${namespace}`, socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username, role, participantId }) => {
      const clientsInRoom = io.of(namespace).adapter.rooms.get(roomId);
      const isFirst = !clientsInRoom || clientsInRoom.size === 0;

      userSocketMap[socket.id] = { username, role, participantId, isLeader: isFirst };
      socket.join(roomId);

      const clients = getAllConnectedClients(roomId, namespace);
      console.log(`${username} joined room ${roomId} in ${namespace}`);

      clients.forEach(({ socketId: clientId }) => {
        io.of(namespace).to(clientId).emit(ACTIONS.JOINED, {
          clients,
          username,
          socketId: socket.id,
          participantId
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

    socket.on(ACTIONS.UPDATE_ROLE, ({ roomId, participantId, role }) => {
      let targetUsername = '';
      for (const [sId, info] of Object.entries(userSocketMap)) {
        if (info.participantId === participantId) {
          info.role = role;
          targetUsername = info.username;
          break;
        }
      }
      const clients = getAllConnectedClients(roomId, namespace);
      io.of(namespace).to(roomId).emit(ACTIONS.ROLE_CHANGED, {
        clients,
        participantId,
        role,
        username: targetUsername
      });
    });

    socket.on('send-message', ({ roomId, message, username, time }) => {
      socket.in(roomId).emit('receive-message', { message, username, time });
    });

    socket.on('disconnecting', () => {
      const rooms = [...socket.rooms];
      const info = userSocketMap[socket.id] || {};
      rooms.forEach((roomId) => {
        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: info.username,
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
