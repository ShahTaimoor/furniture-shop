import { io } from 'socket.io-client';

let socket;

const resolveSocketUrl = () => {
  const raw =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000';
  return raw.replace(/\/api\/?$/, '');
};

export const getSocket = () => {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};

