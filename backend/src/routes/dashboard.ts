import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

router.get('/stats', auth, DashboardController.getSummary);
router.get('/summary', auth, DashboardController.getSummary);
router.get('/trends', auth, DashboardController.getTrends);
router.get('/activity', auth, DashboardController.getActivity);
router.get('/upcoming', auth, DashboardController.getUpcoming);
router.get('/alerts', auth, DashboardController.getAlerts);
router.get('/notifications', auth, DashboardController.getNotifications);
router.get('/inventory-by-category', auth, DashboardController.getInventoryByCategory);
router.get('/recent-orders', auth, DashboardController.getRecentOrders);
router.post('/inventory-check', auth, adminAuth, DashboardController.triggerInventoryCheck);

export default router;