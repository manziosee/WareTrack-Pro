import { Router } from 'express';
import { UsersController } from '../controllers/usersController';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

router.get('/', auth, UsersController.getUsers);
router.get('/roles', auth, UsersController.getRoles);
router.get('/:id', auth, UsersController.getUserById);
router.post('/', auth, UsersController.createUser);
router.put('/:id', auth, UsersController.updateUser);
router.put('/:id/activate', auth, adminAuth, UsersController.activateUser);
router.put('/:id/deactivate', auth, adminAuth, UsersController.deactivateUser);
router.delete('/:id', auth, UsersController.deleteUser);

export default router;