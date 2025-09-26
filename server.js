const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.static('build'));

const userSocketMap = {};
const ACTIONS = require('./src/Actions'); // adjust path if needed

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

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
      socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
      io.of(namespace).to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
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
setupNamespace('/js');
setupNamespace('/html');
setupNamespace('/css');

const PORT =  5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
