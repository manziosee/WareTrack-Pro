import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', auth, AuthController.logout);
router.get('/me', auth, AuthController.getProfile);

export default router;