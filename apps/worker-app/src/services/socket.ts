import { io, Socket } from 'socket.io-client';
import { WorkerApiClient } from './api';

let socket: Socket | null = null;

const SOCKET_URL =
  (import.meta as any).env?.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://discharge-emma-glucose-download.trycloudflare.com'
    : '/');

export const getWorkerSocket = (): Socket => {
  const token = WorkerApiClient.getAccessToken();
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling']
    });
  } else if (token && (socket.auth as any)?.token !== token) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const connectWorkerSocket = () => {
  const s = getWorkerSocket();
  const token = WorkerApiClient.getAccessToken();
  if (token) {
    s.auth = { token };
    if (!s.connected) {
      s.connect();
    }
  }
};

export const disconnectWorkerSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
