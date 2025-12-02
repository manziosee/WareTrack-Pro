import { Router } from 'express';
import { VehiclesController } from '../controllers/vehiclesController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, VehiclesController.getVehicles);
router.get('/status', auth, VehiclesController.getStatuses);
router.get('/:id', auth, VehiclesController.getVehicleById);
router.get('/:id/maintenance', auth, VehiclesController.getMaintenanceHistory);
router.post('/', auth, VehiclesController.createVehicle);
router.post('/:id/maintenance', auth, VehiclesController.scheduleMaintenance);
router.put('/:id', auth, VehiclesController.updateVehicle);
router.delete('/:id', auth, VehiclesController.deleteVehicle);
router.post('/:id/maintenance/complete', auth, VehiclesController.completeMaintenance);
router.get('/:id/tracking', auth, VehiclesController.getVehicleTracking);

export default router;