import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { auth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Each successful password check sends an OTP email, so cap login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Too many login attempts. Please try again later.'
    }
  },
  standardHeaders: false,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 attempts per 5 minutes
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

router.post('/register', AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/verify-login-otp', otpLimiter, AuthController.verifyLoginOTP);
router.post('/refresh', AuthController.refresh);
router.post('/logout', auth, AuthController.logout);
router.get('/me', auth, AuthController.getProfile);
router.put('/profile', auth, AuthController.updateProfile);
router.get('/activity', auth, AuthController.getUserActivity);
router.get('/dashboard-url', auth, AuthController.getDashboardUrl);
router.put('/change-password', auth, AuthController.changePassword);

export default router;