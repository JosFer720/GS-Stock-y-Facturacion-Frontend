import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  // assumes same host and port where backend serves socket.io
  socket = io({ transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });
  socket.on('connect_error', (err) => {
    console.warn('Socket connect error:', err.message || err);
  });
  return socket;
}

export function getSocket() {
  return socket;
}
