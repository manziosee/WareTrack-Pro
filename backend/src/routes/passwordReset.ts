import { Router } from 'express';
import { PasswordResetController } from '../controllers/passwordResetController';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for password reset endpoints
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many password reset attempts. Please try again later.'
    }
  },
  standardHeaders: false,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 attempts per 5 minutes
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_OTP_ATTEMPTS',
      message: 'Too many OTP attempts. Please try again later.'
    }
  },
  standardHeaders: false,
  legacyHeaders: false
});

// Password reset routes
router.post('/request-reset', resetLimiter, PasswordResetController.requestPasswordReset);
router.post('/verify-otp', otpLimiter, PasswordResetController.verifyOTP);
router.post('/reset-password', resetLimiter, PasswordResetController.resetPassword);
router.post('/resend-otp', resetLimiter, PasswordResetController.resendOTP);

export default router;