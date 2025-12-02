import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/stats', auth, DashboardController.getSummary);
router.get('/trends', auth, DashboardController.getTrends);
router.get('/activity', auth, DashboardController.getActivity);
router.get('/upcoming', auth, DashboardController.getUpcoming);
router.get('/alerts', auth, DashboardController.getAlerts);
router.get('/notifications', auth, DashboardController.getNotifications);

export default router;