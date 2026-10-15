import { Router } from 'express';
import { UsersController } from '../controllers/usersController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

router.get('/', auth, authorizeRoles(...ROLES.admin), UsersController.getUsers);
router.get('/roles', auth, authorizeRoles(...ROLES.admin), UsersController.getRoles);
router.get('/:id', auth, authorizeRoles(...ROLES.admin), UsersController.getUserById);
router.post('/', auth, authorizeRoles(...ROLES.admin), UsersController.createUser);
router.put('/:id', auth, authorizeRoles(...ROLES.admin), UsersController.updateUser);
router.put('/:id/activate', auth, adminAuth, UsersController.activateUser);
router.put('/:id/deactivate', auth, adminAuth, UsersController.deactivateUser);
router.delete('/:id', auth, authorizeRoles(...ROLES.admin), UsersController.deleteUser);

export default router;