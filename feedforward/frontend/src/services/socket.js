import { io } from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
