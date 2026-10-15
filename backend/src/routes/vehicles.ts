import { Router } from 'express';
import { VehiclesController } from '../controllers/vehiclesController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';

const router = Router();

router.get('/', auth, VehiclesController.getVehicles);
router.get('/status', auth, VehiclesController.getStatuses);
router.get('/:id', auth, VehiclesController.getVehicleById);
router.get('/:id/maintenance', auth, VehiclesController.getMaintenanceHistory);
router.post('/', auth, authorizeRoles(...ROLES.fleetManagers), VehiclesController.createVehicle);
router.post('/:id/maintenance', auth, authorizeRoles(...ROLES.fleetManagers), VehiclesController.scheduleMaintenance);
router.put('/:id', auth, authorizeRoles(...ROLES.fleetManagers), VehiclesController.updateVehicle);
router.delete('/:id', auth, authorizeRoles(...ROLES.fleetManagers), VehiclesController.deleteVehicle);
router.post('/:id/maintenance/complete', auth, authorizeRoles(...ROLES.fleetManagers), VehiclesController.completeMaintenance);
router.get('/:id/tracking', auth, VehiclesController.getVehicleTracking);

export default router;
