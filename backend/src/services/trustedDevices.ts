import crypto from 'crypto';
import { prisma } from '../lib/prisma';

const DAYS = 30;
const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/** Trust this browser for 30 days; returns the token to keep on the device. */
export async function trustDevice(userId: number, label?: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.trustedDevice.create({
    data: { userId, tokenHash: hash(token), label: label?.slice(0, 120) || null, expiresAt: new Date(Date.now() + DAYS * 86400000) },
  });
  return token;
}

/** Is this token a valid trusted device of this user? Updates its last use. */
export async function isTrustedDevice(userId: number, token: unknown) {
  if (typeof token !== 'string' || token.length < 20) return false;
  const device = await prisma.trustedDevice.findUnique({ where: { tokenHash: hash(token) } });
  if (!device || device.userId !== userId || device.expiresAt < new Date()) return false;
  await prisma.trustedDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });
  return true;
}

export const listTrustedDevices = (userId: number) =>
  prisma.trustedDevice.findMany({ where: { userId, expiresAt: { gt: new Date() } }, orderBy: { lastUsedAt: 'desc' }, select: { id: true, label: true, lastUsedAt: true, expiresAt: true, createdAt: true } });

export const forgetTrustedDevices = (userId: number, id?: number) =>
  prisma.trustedDevice.deleteMany({ where: { userId, ...(id ? { id } : {}) } });
