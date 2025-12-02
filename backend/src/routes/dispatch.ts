import { Router } from 'express';
import { DispatchController } from '../controllers/dispatchController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, DispatchController.getDispatches);
router.get('/stats', auth, DispatchController.getStats);
router.get('/active', auth, DispatchController.getActiveDispatches);
router.get('/orders', auth, DispatchController.getAvailableOrders);
router.get('/drivers', auth, DispatchController.getAvailableDrivers);
router.get('/vehicles', auth, DispatchController.getAvailableVehicles);
router.get('/driver/:id', auth, DispatchController.getDriverDispatch);
router.post('/', auth, DispatchController.createDispatch);
router.post('/:id/status', auth, DispatchController.updateDispatchStatus);
router.put('/:id', auth, DispatchController.updateDispatch);

export default router;