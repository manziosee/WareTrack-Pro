import { Router } from 'express';
import { DispatchController } from '../controllers/dispatchController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, DispatchController.getDispatches);
router.get('/active', auth, DispatchController.getActiveDispatches);
router.get('/driver/:id', auth, DispatchController.getDriverDispatch);
router.post('/', auth, DispatchController.createDispatch);
router.post('/:id/status', auth, DispatchController.updateDispatchStatus);
router.put('/:id', auth, DispatchController.updateDispatch);

export default router;