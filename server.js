const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const ACTIONS = require('./src/Actions');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
});

const corsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.static('build'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

const userSocketMap = {};
const roomStateMap = {};

function getNamespaceAdapterRoom(namespace, roomId) {
  return io.of(namespace).adapter.rooms.get(roomId);
}

function getAllConnectedClients(roomId, namespace) {
  return Array.from(getNamespaceAdapterRoom(namespace, roomId) || []).map((socketId) => {
    const info = userSocketMap[socketId] || {};
    return {
      socketId,
      username: info.username,
      role: info.role,
      participantId: info.participantId,
      isLeader: info.isLeader,
    };
  });
}

function getRoomState(roomId) {
  if (!roomStateMap[roomId]) {
    roomStateMap[roomId] = {
      leaderParticipantId: null,
      pendingClients: [],
    };
  }

  return roomStateMap[roomId];
}

function getPendingClients(roomId) {
  return getRoomState(roomId).pendingClients;
}

function emitJoinRequest(roomId) {
  const roomState = getRoomState(roomId);
  const clients = getAllConnectedClients(roomId, '/js');
  const leader = clients.find((client) => client.participantId === roomState.leaderParticipantId && client.isLeader);

  if (!leader) {
    return;
  }

  io.of('/js').to(leader.socketId).emit(ACTIONS.JOIN_REQUEST, {
    pendingClients: roomState.pendingClients,
  });
}

function broadcastRoomSnapshot(roomId, trigger = {}) {
  const clients = getAllConnectedClients(roomId, '/js');
  const pendingClients = getPendingClients(roomId);

  clients.forEach(({ socketId: clientId }) => {
    io.of('/js').to(clientId).emit(ACTIONS.JOINED, {
      clients,
      pendingClients,
      ...trigger,
    });
  });
}

function promoteNextLeader(roomId) {
  const roomState = roomStateMap[roomId];
  if (!roomState) {
    return;
  }

  const clients = getAllConnectedClients(roomId, '/js');
  const nextLeader = clients[0];

  roomState.leaderParticipantId = nextLeader ? nextLeader.participantId : null;

  clients.forEach((client) => {
    const info = userSocketMap[client.socketId];
    if (info) {
      info.isLeader = client.participantId === roomState.leaderParticipantId;
    }
  });
}

function cleanupRoomIfEmpty(roomId) {
  const clients = getAllConnectedClients(roomId, '/js');
  const roomState = roomStateMap[roomId];

  if (!roomState) {
    return;
  }

  if (clients.length === 0 && roomState.pendingClients.length === 0) {
    delete roomStateMap[roomId];
  }
}

function setupNamespace(namespace) {
  io.of(namespace).on('connection', (socket) => {
    socket.on(ACTIONS.JOIN, ({ roomId, username, role, participantId }) => {
      if (namespace === '/js') {
        const roomState = getRoomState(roomId);
        const clientsInRoom = getNamespaceAdapterRoom(namespace, roomId);
        const isFirst = !clientsInRoom || clientsInRoom.size === 0;

        if (!isFirst) {
          const alreadyPending = roomState.pendingClients.some((client) => client.participantId === participantId);
          if (!alreadyPending) {
            roomState.pendingClients.push({
              socketId: socket.id,
              username,
              role,
              participantId,
            });
          }

          userSocketMap[socket.id] = { username, role, participantId, isLeader: false };
          socket.emit(ACTIONS.JOIN_PENDING, {
            pendingClients: roomState.pendingClients,
          });
          emitJoinRequest(roomId);
          return;
        }

        roomState.leaderParticipantId = participantId;
      }

      const roomState = getRoomState(roomId);
      const isLeader = namespace === '/js'
        ? participantId === roomState.leaderParticipantId
        : false;

      userSocketMap[socket.id] = { username, role, participantId, isLeader };
      socket.join(roomId);

      const clients = getAllConnectedClients(roomId, namespace);

      clients.forEach(({ socketId: clientId }) => {
        io.of(namespace).to(clientId).emit(ACTIONS.JOINED, {
          clients,
          pendingClients: namespace === '/js' ? roomState.pendingClients : [],
          username,
          socketId: socket.id,
          participantId,
        });
      });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, editorType }) => {
      socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code, editorType });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, editorType }) => {
      io.of(namespace).to(socketId).emit(ACTIONS.CODE_CHANGE, { code, editorType });
    });

    socket.on('cursor-change', ({ roomId, username, color, cursor, editorType }) => {
      socket.in(roomId).emit('cursor-change', {
        socketId: socket.id,
        username,
        color,
        cursor,
        editorType,
      });
    });

    socket.on(ACTIONS.UPDATE_ROLE, ({ roomId, participantId, role }) => {
      const requester = userSocketMap[socket.id];
      const roomState = getRoomState(roomId);

      if (namespace !== '/js' || !requester?.isLeader || requester.participantId !== roomState.leaderParticipantId) {
        return;
      }

      let targetUsername = '';
      for (const [, info] of Object.entries(userSocketMap)) {
        if (info.participantId === participantId) {
          info.role = role;
          targetUsername = info.username;
        }
      }

      const clients = getAllConnectedClients(roomId, namespace);
      io.of(namespace).to(roomId).emit(ACTIONS.ROLE_CHANGED, {
        clients,
        pendingClients: roomState.pendingClients,
        participantId,
        role,
        username: targetUsername,
      });
    });

    socket.on(ACTIONS.ADMIT_PARTICIPANT, ({ roomId, participantId }) => {
      if (namespace !== '/js') {
        return;
      }

      const requester = userSocketMap[socket.id];
      const roomState = getRoomState(roomId);

      if (!requester?.isLeader || requester.participantId !== roomState.leaderParticipantId) {
        return;
      }

      const pendingIndex = roomState.pendingClients.findIndex((client) => client.participantId === participantId);
      if (pendingIndex === -1) {
        return;
      }

      const [pendingClient] = roomState.pendingClients.splice(pendingIndex, 1);
      const pendingInfo = userSocketMap[pendingClient.socketId];

      if (!pendingInfo) {
        emitJoinRequest(roomId);
        broadcastRoomSnapshot(roomId);
        return;
      }

      pendingInfo.isLeader = false;
      const pendingSocket = io.of('/js').sockets.get(pendingClient.socketId);

      if (!pendingSocket) {
        emitJoinRequest(roomId);
        broadcastRoomSnapshot(roomId);
        return;
      }

      pendingSocket.join(roomId);
      io.of('/js').to(pendingClient.socketId).emit(ACTIONS.JOIN_APPROVED, {
        roomId,
      });

      broadcastRoomSnapshot(roomId, {
        username: pendingClient.username,
        socketId: pendingClient.socketId,
        participantId: pendingClient.participantId,
      });
      emitJoinRequest(roomId);
    });

    socket.on('send-message', ({ roomId, message, username, time }) => {
      socket.in(roomId).emit('receive-message', { message, username, time });
    });

    socket.on('code-output', ({ roomId, output, username }) => {
      socket.in(roomId).emit('code-output', { output, username });
    });

    socket.on('disconnecting', () => {
      const rooms = [...socket.rooms];
      const info = userSocketMap[socket.id] || {};

      Object.entries(roomStateMap).forEach(([roomId, roomState]) => {
        const pendingIndex = roomState.pendingClients.findIndex((client) => client.socketId === socket.id);
        if (pendingIndex !== -1) {
          roomState.pendingClients.splice(pendingIndex, 1);
          emitJoinRequest(roomId);
          broadcastRoomSnapshot(roomId);
          cleanupRoomIfEmpty(roomId);
        }
      });

      rooms.forEach((roomId) => {
        if (roomId === socket.id) {
          return;
        }

        const roomState = getRoomState(roomId);
        const wasLeader = info.participantId && roomState.leaderParticipantId === info.participantId && namespace === '/js';

        if (wasLeader) {
          roomState.leaderParticipantId = null;
        }

        delete userSocketMap[socket.id];

        if (wasLeader) {
          promoteNextLeader(roomId);
        }

        const clients = namespace === '/js' ? getAllConnectedClients(roomId, namespace) : undefined;
        const pendingClients = namespace === '/js' ? getPendingClients(roomId) : undefined;

        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: info.username,
          clients,
          pendingClients,
        });

        if (namespace === '/js') {
          emitJoinRequest(roomId);
          cleanupRoomIfEmpty(roomId);
        }
      });

      delete userSocketMap[socket.id];
    });
  });
}

setupNamespace('/');
setupNamespace('/js');
setupNamespace('/html');
setupNamespace('/css');

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
