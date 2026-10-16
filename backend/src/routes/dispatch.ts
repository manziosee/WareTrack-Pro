import { Router } from 'express';
import { DispatchController } from '../controllers/dispatchController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';

const router = Router();

router.get('/', auth, DispatchController.getDispatches);
router.get('/stats', auth, DispatchController.getStats);
router.post('/sync-statuses', auth, authorizeRoles(...ROLES.fleetManagers), DispatchController.syncStatuses);
router.get('/active', auth, DispatchController.getActiveDispatches);
router.get('/orders', auth, DispatchController.getAvailableOrders);
router.get('/drivers', auth, DispatchController.getAvailableDrivers);
router.get('/vehicles', auth, DispatchController.getAvailableVehicles);
router.get('/driver/:id', auth, DispatchController.getDriverDispatch);
router.get('/:id', auth, DispatchController.getDispatchById);
router.post('/', auth, authorizeRoles(...ROLES.fleetManagers), DispatchController.createDispatch);
router.post('/:id/status', auth, authorizeRoles(...ROLES.orderManagers), DispatchController.updateDispatchStatus);
router.put('/:id', auth, authorizeRoles(...ROLES.fleetManagers), DispatchController.updateDispatch);
router.delete('/:id', auth, authorizeRoles(...ROLES.fleetManagers), DispatchController.deleteDispatch);

export default router;