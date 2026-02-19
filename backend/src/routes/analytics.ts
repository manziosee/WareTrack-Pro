import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/inventory-trends', AnalyticsController.getInventoryTrends);
router.get('/category-distribution', AnalyticsController.getCategoryDistribution);
router.get('/driver-performance', AnalyticsController.getAllDriverPerformance);
router.get('/driver-performance/:driverId', AnalyticsController.getDriverPerformance);
router.get('/fleet-utilization', AnalyticsController.getFleetUtilization);
router.get('/dispatch-efficiency', AnalyticsController.getDispatchEfficiency);
router.get('/order-trends', AnalyticsController.getOrderTrends);

export default router;
