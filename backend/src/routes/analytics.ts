import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Inventory Analytics
router.get('/inventory/trends', AnalyticsController.getInventoryTrends);
router.get('/inventory/categories', AnalyticsController.getCategoryDistribution);

// Driver Analytics
router.get('/drivers/:driverId/performance', AnalyticsController.getDriverPerformance);

// Fleet Analytics
router.get('/fleet/utilization', AnalyticsController.getFleetUtilization);

// Dispatch Analytics
router.get('/dispatch/efficiency', AnalyticsController.getDispatchEfficiency);

// Order Analytics
router.get('/orders/trends', AnalyticsController.getOrderTrends);

export default router;
