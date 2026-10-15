import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret, getAllowedOrigins } from '../config/env';
import { prisma } from '../lib/prisma';

let io: Server | null = null;

/**
 * Real-time channel for notifications, chat, live driver locations and order
 * updates. Each connection authenticates with the same JWT as the REST API and
 * joins rooms for its user and role.
 */
export function initRealtime(server: HttpServer) {
  const origins = getAllowedOrigins();
  io = new Server(server, {
    cors: { origin: origins.length ? origins : true, credentials: true },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string);
      if (!token) return next(new Error('unauthorized'));
      const payload: any = jwt.verify(token, getJwtSecret());
      if (payload?.type === 'refresh' || !payload?.userId) return next(new Error('unauthorized'));
      const user = await prisma.user.findUnique({ where: { id: Number(payload.userId) }, select: { id: true, role: true, status: true, name: true } });
      if (!user || user.status !== 'ACTIVE') return next(new Error('unauthorized'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user-${user.id}`);
    socket.join(`role-${user.role}`);
    socket.emit('ready', { userId: user.id });

    // Drivers share their position while on duty (see driver app)
    socket.on('driver:location', async (data: { lat: number; lng: number }) => {
      if (user.role !== 'DRIVER' || typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return;
      const driver = await prisma.driver.findUnique({ where: { userId: user.id }, select: { id: true, name: true } });
      if (!driver) return;
      await prisma.driver.update({ where: { id: driver.id }, data: { currentLat: data.lat, currentLng: data.lng, lastLocationAt: new Date() } }).catch(() => undefined);
      const update = { driverId: driver.id, name: driver.name, lat: data.lat, lng: data.lng, at: new Date().toISOString() };
      io?.to('role-ADMIN').to('role-DISPATCH_OFFICER').emit('driver:location', update);
    });

    socket.on('chat:typing', (data: { to: number }) => {
      if (data?.to) io?.to(`user-${data.to}`).emit('chat:typing', { from: user.id });
    });
  });

  // Existing services look for a global io instance
  (global as any).io = io;
  return io;
}

export function getIO() {
  return io;
}

/** Send an event to everyone with one of the given roles. */
export function emitToRoles(roles: string[], event: string, payload: unknown) {
  if (!io) return;
  let target = io.to(`role-${roles[0]}`);
  for (const role of roles.slice(1)) target = target.to(`role-${role}`);
  target.emit(event, payload);
}

export function emitToUser(userId: number, event: string, payload: unknown) {
  io?.to(`user-${userId}`).emit(event, payload);
}
