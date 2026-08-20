import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { SOCKET_EVENTS } from '@nearwork/types';

let ioInstance: SocketIOServer | null = null;

export const getIO = (): SocketIOServer | null => ioInstance;

export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // In production, restrict to CLIENT_URL, WORKER_APP_URL, ADMIN_URL
      methods: ['GET', 'POST']
    }
  });

  // Socket Authentication Middleware
  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      const decoded = verifyAccessToken(token);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  ioInstance.on('connection', async (socket) => {
    const user = (socket as any).user;
    if (!user) return;

    // Auto-join private user room
    socket.join(`user:${user.userId}`);
    if (user.role === 'CUSTOMER') {
      socket.join(`customer:${user.userId}`);
    } else if (user.role === 'WORKER') {
      socket.join(`worker:${user.userId}`);
      socket.join('workers:all');

      // Auto lookup and join workerProfile ID
      try {
        const { prisma } = await import('./db');
        const profile = await prisma.workerProfile.findUnique({
          where: { userId: user.userId },
          select: { id: true }
        });
        if (profile) {
          socket.join(`worker:${profile.id}`);
        }
      } catch (err) {
        // Fallback
      }
    } else if (user.role === 'ADMIN') {
      socket.join('admin:room');
    }

    // Explicit worker room join
    socket.on('worker:join', (data: any) => {
      if (data?.workerId) socket.join(`worker:${data.workerId}`);
      if (data?.userId) socket.join(`worker:${data.userId}`);
    });

    // Join specific booking room
    socket.on('booking:join', ({ bookingId }) => {
      if (bookingId) {
        socket.join(`booking:${bookingId}`);
      }
    });

    // Worker periodic GPS update
    socket.on(SOCKET_EVENTS.WORKER_LOCATION_UPDATE, async (data) => {
      const { bookingId, latitude, longitude, heading, speed } = data || {};
      const workerId = user.workerId || user.userId;
      const realSpeed = typeof speed === 'number' ? speed : 0;
      const realAccuracy = typeof data?.accuracy === 'number' ? data.accuracy : 3.5;
      const realAltitude = typeof data?.altitude === 'number' ? data.altitude : 128;

      // Broadcast real-time location to booking room & admin live tracking
      ioInstance?.to(`booking:${bookingId}`).emit(SOCKET_EVENTS.TRACKING_UPDATE, {
        workerId,
        bookingId,
        latitude,
        longitude,
        heading: heading || 0,
        speed: realSpeed,
        accuracy: realAccuracy,
        altitude: realAltitude,
        timestamp: Date.now()
      });

      ioInstance?.to('admin:room').emit(SOCKET_EVENTS.ADMIN_LIVE_UPDATE, {
        workerId,
        latitude,
        longitude,
        timestamp: Date.now()
      });

      // Persist in DB
      try {
        const { prisma } = await import('./db');
        await prisma.workerProfile.updateMany({
          where: { OR: [{ id: workerId }, { userId: user.userId }] },
          data: { currentLat: latitude, currentLng: longitude }
        });
      } catch (e) {
        // non-blocking
      }
    });

    socket.on('disconnect', () => {
      // Clean up connection
    });
  });

  return ioInstance;
};

export const getSocketIO = (): SocketIOServer | null => {
  return ioInstance;
};
