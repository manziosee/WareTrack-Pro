import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', auth, AuthController.logout);
router.get('/me', auth, AuthController.getProfile);
router.put('/profile', auth, AuthController.updateProfile);
router.get('/activity', auth, AuthController.getUserActivity);
router.get('/dashboard-url', auth, AuthController.getDashboardUrl);
router.put('/change-password', auth, AuthController.changePassword);

export default router;