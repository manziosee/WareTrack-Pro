import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/emailService';

// In-memory OTP storage (in production, use Redis)
const otpStore = new Map<string, { otp: string; expires: Date; userId: number }>();

export class PasswordResetController {
  // Generate 6-digit OTP
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Request password reset - send OTP to email
  static async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_EMAIL', message: 'Email is required' }
        });
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User with this email does not exist' }
        });
      }

      // Generate OTP
      const otp = PasswordResetController.generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      otpStore.set(email.toLowerCase(), {
        otp,
        expires,
        userId: user.id
      });

      // Send OTP via email
      const emailSent = await EmailService.sendPasswordResetOTP(email, user.name, otp);

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          error: { code: 'EMAIL_FAILED', message: 'Failed to send reset email' }
        });
      }

      res.json({
        success: true,
        message: 'Password reset OTP sent to your email',
        data: { email: email.toLowerCase() }
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // Verify OTP
  static async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Email and OTP are required' }
        });
      }

      const storedData = otpStore.get(email.toLowerCase());

      if (!storedData) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' }
        });
      }

      // Check if OTP is expired
      if (new Date() > storedData.expires) {
        otpStore.delete(email.toLowerCase());
        return res.status(400).json({
          success: false,
          error: { code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one' }
        });
      }

      // Verify OTP
      if (storedData.otp !== otp) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Invalid OTP' }
        });
      }

      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: { email: email.toLowerCase(), verified: true }
      });

    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // Reset password with verified OTP
  static async resetPassword(req: Request, res: Response) {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Email, OTP, and new password are required' }
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long' }
        });
      }

      const storedData = otpStore.get(email.toLowerCase());

      if (!storedData) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' }
        });
      }

      // Check if OTP is expired
      if (new Date() > storedData.expires) {
        otpStore.delete(email.toLowerCase());
        return res.status(400).json({
          success: false,
          error: { code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one' }
        });
      }

      // Verify OTP
      if (storedData.otp !== otp) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Invalid OTP' }
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      await prisma.user.update({
        where: { id: storedData.userId },
        data: { password: hashedPassword }
      });

      // Remove OTP from store
      otpStore.delete(email.toLowerCase());

      // Send confirmation email
      const user = await prisma.user.findUnique({ where: { id: storedData.userId } });
      if (user) {
        await EmailService.sendPasswordResetConfirmation(user.email, user.name);
      }

      res.json({
        success: true,
        message: 'Password reset successfully',
        data: { email: email.toLowerCase() }
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  // Resend OTP
  static async resendOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_EMAIL', message: 'Email is required' }
        });
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User with this email does not exist' }
        });
      }

      // Generate new OTP
      const otp = PasswordResetController.generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update OTP in store
      otpStore.set(email.toLowerCase(), {
        otp,
        expires,
        userId: user.id
      });

      // Send new OTP via email
      const emailSent = await EmailService.sendPasswordResetOTP(email, user.name, otp);

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          error: { code: 'EMAIL_FAILED', message: 'Failed to send reset email' }
        });
      }

      res.json({
        success: true,
        message: 'New OTP sent to your email',
        data: { email: email.toLowerCase() }
      });

    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}