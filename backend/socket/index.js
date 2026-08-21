const { Server } = require('socket.io');
const {
  authenticateSocket,
  registerOrderTrackingHandlers,
  setOrderTrackingSocketServer,
} = require('./orderTracking');
const { registerChatHandlers, setChatSocketServer } = require('./chat');

let io;

const buildCorsOrigins = () => {
  const origins = [process.env.CLIENT_URL, process.env.ADMIN_URL]
    .flatMap((value) => (value || '').split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length ? origins : true;
};

const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: buildCorsOrigins(),
      credentials: true,
    },
  });

  setOrderTrackingSocketServer(io);
  setChatSocketServer(io);

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    registerOrderTrackingHandlers(socket);
    registerChatHandlers(socket);
  });

  return io;
};

const getSocketServer = () => {
  if (!io) {
    throw new Error('Socket server is not initialized');
  }
  return io;
};

module.exports = {
  initSocketServer,
  getSocketServer,
};

