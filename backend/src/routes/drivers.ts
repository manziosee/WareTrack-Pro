import { Router } from 'express';
import { DriversController } from '../controllers/driversController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';

const router = Router();

router.get('/', auth, DriversController.getDrivers);
router.get('/available', auth, DriversController.getAvailableDrivers);
router.get('/:id', auth, DriversController.getDriverById);
router.get('/:id/assignments', auth, DriversController.getDriverAssignments);
router.post('/', auth, authorizeRoles(...ROLES.fleetManagers), DriversController.createDriver);
router.put('/:id', auth, authorizeRoles(...ROLES.fleetManagers), DriversController.updateDriver);
router.delete('/:id', auth, authorizeRoles(...ROLES.fleetManagers), DriversController.deleteDriver);

export default router;