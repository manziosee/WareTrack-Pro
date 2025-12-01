import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/sales', auth, ReportsController.getSalesReport);
router.get('/inventory', auth, ReportsController.getInventoryReport);
router.get('/vehicles', auth, ReportsController.getVehiclesReport);
router.get('/drivers', auth, ReportsController.getDriversReport);
router.post('/export', auth, ReportsController.exportReport);

export default router;