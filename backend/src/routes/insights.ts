import { Router } from 'express';
import { InsightsController } from '../controllers/insightsController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';

const router = Router();

router.get('/dashboard', auth, InsightsController.dashboard);
router.get('/command-center', auth, authorizeRoles(...ROLES.orderManagers), InsightsController.commandCenter);
router.get('/dashboard/layout', auth, InsightsController.getLayout);
router.put('/dashboard/layout', auth, InsightsController.saveLayout);

export default router;
