import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret, getAllowedOrigins } from '../config/env';
import { prisma } from '../lib/prisma';
import { getTenantContext, runWithTenant } from '../lib/tenantContext';

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
      const user = await prisma.user.findUnique({ where: { id: Number(payload.userId) }, select: { id: true, status: true, name: true } });
      if (!user || user.status !== 'ACTIVE') return next(new Error('unauthorized'));
      const requestedCompany = Number(socket.handshake.auth?.companyId) || undefined;
      let membership = requestedCompany
        ? await prisma.companyMembership.findUnique({ where: { companyId_userId: { companyId: requestedCompany, userId: user.id } } })
        : await prisma.companyMembership.findFirst({ where: { userId: user.id, active: true }, orderBy: { companyId: 'asc' } });
      if (!membership?.active) return next(new Error('company access denied'));
      let branchId: number | null = null;
      let role = membership.role;
      const branches = await prisma.branchMembership.findMany({ where: { companyMembershipId: membership.id, active: true, branch: { active: true } }, select: { branchId: true, roleOverride: true } });
      const requestedBranch = Number(socket.handshake.auth?.branchId) || undefined;
      const branch = requestedBranch ? branches.find((entry) => entry.branchId === requestedBranch) : branches[0];
      if (requestedBranch && !branch) return next(new Error('branch access denied'));
      if (branch) { branchId = branch.branchId; role = branch.roleOverride || role; }
      socket.data.user = { ...user, role };
      socket.data.tenant = { companyId: membership.companyId, branchId };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const tenant = socket.data.tenant;
    socket.join(companyRoom(tenant.companyId));
    socket.join(companyUserRoom(user.id, tenant.companyId));
    if (tenant.branchId) socket.join(branchRoom(tenant.branchId));
    socket.join(userRoom(user.id, tenant.companyId, tenant.branchId));
    socket.join(roleRoom(user.role, tenant.companyId, tenant.branchId));
    socket.emit('ready', { userId: user.id, companyId: tenant.companyId, branchId: tenant.branchId });

    // Drivers share their position while on duty (see driver app)
    socket.on('driver:location', async (data: { lat: number; lng: number }) => {
      if (user.role !== 'DRIVER' || typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return;
      await runWithTenant(tenant, async () => {
      const driver = await prisma.driver.findUnique({ where: { userId: user.id }, select: { id: true, name: true } });
      if (!driver) return;
      await prisma.driver.update({ where: { id: driver.id }, data: { currentLat: data.lat, currentLng: data.lng, lastLocationAt: new Date() } }).catch(() => undefined);
      const update = { driverId: driver.id, name: driver.name, lat: data.lat, lng: data.lng, at: new Date().toISOString() };
      io?.to(roleRoom('ADMIN', tenant.companyId, tenant.branchId)).to(roleRoom('DISPATCH_OFFICER', tenant.companyId, tenant.branchId)).emit('driver:location', update);
      });
    });

    socket.on('chat:typing', (data: { to: number }) => {
      if (data?.to) io?.to(userRoom(data.to, tenant.companyId, tenant.branchId)).emit('chat:typing', { from: user.id });
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
  const tenant = getTenantContext();
  if (!tenant) return;
  let target = io.to(roleRoom(roles[0], tenant.companyId, tenant.branchId));
  for (const role of roles.slice(1)) target = target.to(roleRoom(role, tenant.companyId, tenant.branchId));
  target.emit(event, payload);
}

export function emitToUser(userId: number, event: string, payload: unknown) {
  const tenant = getTenantContext();
  if (tenant) io?.to(userRoom(userId, tenant.companyId, tenant.branchId)).emit(event, payload);
}

export function emitTenantNotification(userId: number | null, companyId: number, branchId: number | null, event: string, payload: unknown) {
  if (!io) return;
  const room = userId === null
    ? (branchId === null ? companyRoom(companyId) : branchRoom(branchId))
    : (branchId === null ? companyUserRoom(userId, companyId) : userRoom(userId, companyId, branchId));
  io.to(room).emit(event, payload);
}

export const companyRoom = (companyId: number) => `company-${companyId}`;
export const branchRoom = (branchId: number) => `branch-${branchId}`;
export const userRoom = (userId: number, companyId: number, branchId: number | null) => `user-${userId}-company-${companyId}-branch-${branchId ?? 'all'}`;
export const companyUserRoom = (userId: number, companyId: number) => `user-${userId}-company-${companyId}`;
export const roleRoom = (role: string, companyId: number, branchId: number | null) => `role-${role}-company-${companyId}-branch-${branchId ?? 'all'}`;
