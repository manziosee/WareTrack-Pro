import { Router } from 'express';
import { forgetTrustedDevices, listTrustedDevices } from '../services/trustedDevices';
import { AuthController } from '../controllers/authController';
import { auth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Each successful password check sends an OTP email, so cap login attempts
const loginLimiter = rateLimit({
  // Automated tests sign in many times in a row
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.LOGIN_RATE_LIMIT_PER_15_MIN) || 5, // 5 attempts per 15 minutes by default
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
  // Automated tests sign in many times in a row
  skip: () => process.env.NODE_ENV === 'test',
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

/**
 * @swagger
 * /api/auth/trusted-devices:
 *   get:
 *     tags: [Authentication]
 *     summary: Browsers that skip the emailed sign-in code
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Trusted devices } }
 *   delete:
 *     tags: [Authentication]
 *     summary: Forget all trusted browsers (next sign-in everywhere needs a code)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Done } }
 */
router.get('/trusted-devices', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await listTrustedDevices(Number(req.user!.userId)) });
  } catch (error) {
    next(error);
  }
});
router.delete('/trusted-devices', auth, async (req, res, next) => {
  try {
    const { count } = await forgetTrustedDevices(Number(req.user!.userId));
    res.json({ success: true, data: { removed: count } });
  } catch (error) {
    next(error);
  }
});
router.delete('/trusted-devices/:id', auth, async (req, res, next) => {
  try {
    const { count } = await forgetTrustedDevices(Number(req.user!.userId), Number(req.params.id));
    res.json({ success: true, data: { removed: count } });
  } catch (error) {
    next(error);
  }
});

export default router;