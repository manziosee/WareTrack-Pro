import crypto from 'crypto';
import { prisma } from '../lib/prisma';

/**
 * One-time codes (login, password reset) stored hashed in the database, so a
 * server restart doesn't invalidate a code someone is about to type.
 */

export type OtpPurpose = 'LOGIN' | 'RESET';
export const MAX_OTP_ATTEMPTS = 5;

const hash = (email: string, code: string) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET || 'otp').update(`${email.toLowerCase()}:${code}`).digest('hex');

export function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function saveOtp(email: string, purpose: OtpPurpose, code: string, userId: number, ttlMs: number) {
  const key = email.toLowerCase();
  await prisma.otpCode.upsert({
    where: { email_purpose: { email: key, purpose } },
    update: { codeHash: hash(key, code), userId, attempts: 0, expiresAt: new Date(Date.now() + ttlMs), createdAt: new Date() },
    create: { email: key, purpose, codeHash: hash(key, code), userId, expiresAt: new Date(Date.now() + ttlMs) },
  });
}

export type OtpCheck =
  | { ok: true; userId: number | null }
  | { ok: false; reason: 'missing' | 'expired' | 'invalid' | 'locked' };

/**
 * Check a code. Wrong guesses count against a limit; after MAX_OTP_ATTEMPTS the
 * code is deleted. A correct code is deleted unless `consume` is false.
 */
export async function checkOtp(email: string, purpose: OtpPurpose, code: string, consume = true): Promise<OtpCheck> {
  const key = email.toLowerCase();
  const record = await prisma.otpCode.findUnique({ where: { email_purpose: { email: key, purpose } } });
  if (!record) return { ok: false, reason: 'missing' };
  if (record.expiresAt < new Date()) {
    await prisma.otpCode.delete({ where: { id: record.id } }).catch(() => undefined);
    return { ok: false, reason: 'expired' };
  }
  const expected = Buffer.from(record.codeHash);
  const given = Buffer.from(hash(key, String(code || '')));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    if (record.attempts + 1 >= MAX_OTP_ATTEMPTS) {
      await prisma.otpCode.delete({ where: { id: record.id } }).catch(() => undefined);
      return { ok: false, reason: 'locked' };
    }
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } }).catch(() => undefined);
    return { ok: false, reason: 'invalid' };
  }
  if (consume) await prisma.otpCode.delete({ where: { id: record.id } }).catch(() => undefined);
  return { ok: true, userId: record.userId };
}

export async function clearOtp(email: string, purpose: OtpPurpose) {
  await prisma.otpCode.deleteMany({ where: { email: email.toLowerCase(), purpose } });
}

/** Remove expired codes (run from the job scheduler). */
export async function purgeExpiredOtps() {
  await prisma.otpCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
