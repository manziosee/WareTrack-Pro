import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { forgetTrustedDevices } from '../services/trustedDevices';
import { EmailService } from '../services/emailService';
import { generateCode, saveOtp, checkOtp, clearOtp } from '../services/otpStore';
import { recordAudit } from '../middleware/audit';

const RESET_TTL_MS = 10 * 60 * 1000;

// Same answer whether or not the email has an account, so the endpoint can't be
// used to discover which addresses are registered.
const GENERIC_SENT = 'If an account exists for this email, a reset code has been sent to it.';

const otpError = (reason: string) => {
  const map: Record<string, [string, string]> = {
    missing: ['INVALID_OTP', 'Invalid or expired code. Please request a new one.'],
    expired: ['OTP_EXPIRED', 'This code has expired. Please request a new one.'],
    invalid: ['INVALID_OTP', 'That code is not correct.'],
    locked: ['OTP_LOCKED', 'Too many wrong codes. Please request a new one.'],
  };
  const [code, message] = map[reason] || map.invalid;
  return { success: false, error: { code, message } };
};

const strongEnough = (password: string) => typeof password === 'string' && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

async function sendResetCode(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.status !== 'ACTIVE') return;
  const code = generateCode();
  await saveOtp(email, 'RESET', code, user.id, RESET_TTL_MS);
  const sent = await EmailService.sendPasswordResetOTP(user.email, user.name, code);
  if (!sent && process.env.NODE_ENV !== 'production') console.log(`🔐 [dev] Password reset code for ${user.email}: ${code}`);
}

export class PasswordResetController {
  static async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'Email is required' } });
      }
      await sendResetCode(String(email));
      res.json({ success: true, message: GENERIC_SENT, data: { email: String(email).toLowerCase() } });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
    }
  }

  static async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body || {};
      if (!email || !otp) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Email and code are required' } });
      }
      // Don't consume: the same code is needed again to set the new password
      const check = await checkOtp(String(email), 'RESET', String(otp), false);
      if (!check.ok) return res.status(400).json(otpError((check as { reason: string }).reason));
      res.json({ success: true, message: 'Code verified', data: { email: String(email).toLowerCase(), verified: true } });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { email, otp, newPassword } = req.body || {};
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Email, code and new password are required' } });
      }
      if (!strongEnough(newPassword)) {
        return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters and include letters and numbers' } });
      }
      const check = await checkOtp(String(email), 'RESET', String(otp));
      if (!check.ok) return res.status(400).json(otpError((check as { reason: string }).reason));
      const userId = (check as { userId: number | null }).userId;
      if (!userId) return res.status(400).json(otpError('missing'));

      const user = await prisma.user.update({
        where: { id: userId },
        data: { password: await bcrypt.hash(newPassword, 12) },
      });
      await clearOtp(String(email), 'LOGIN');
      // A reset password means nobody's old trusted browser keeps skipping codes
      await forgetTrustedDevices(user.id);
      recordAudit({ userId: user.id, action: 'UPDATE', entityType: 'User', entityId: user.id, summary: `${user.name} reset their password`, ipAddress: req.ip });
      EmailService.sendPasswordResetConfirmation(user.email, user.name).catch(() => undefined);

      res.json({ success: true, message: 'Password reset successfully', data: { email: user.email } });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
    }
  }

  static async resendOTP(req: Request, res: Response) {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'Email is required' } });
      }
      await sendResetCode(String(email));
      res.json({ success: true, message: GENERIC_SENT, data: { email: String(email).toLowerCase() } });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
    }
  }
}
