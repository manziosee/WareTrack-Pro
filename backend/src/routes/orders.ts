import { Router } from 'express';
import { DispatchController } from '../controllers/dispatchController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, DispatchController.getDispatches);
router.post('/', auth, DispatchController.createDispatch);
router.post('/:id/status', auth, DispatchController.updateDispatchStatus);
router.put('/:id/status', auth, DispatchController.updateDispatchStatus);
router.put('/:id', auth, DispatchController.updateDispatch);
router.delete('/:id', auth, DispatchController.deleteDispatch);

export default router;