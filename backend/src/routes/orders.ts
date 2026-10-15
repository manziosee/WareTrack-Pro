import { Router } from 'express';
import { OrdersController } from '../controllers/ordersController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';

const router = Router();

router.get('/', auth, OrdersController.getOrders);
router.get('/:id', auth, OrdersController.getOrderById);
router.post('/', auth, authorizeRoles(...ROLES.orderManagers), OrdersController.createOrder);
router.post('/:id/status', auth, OrdersController.updateOrderStatus);
router.put('/:id', auth, authorizeRoles(...ROLES.orderManagers), OrdersController.updateOrder);
router.delete('/:id', auth, authorizeRoles(...ROLES.orderManagers), OrdersController.deleteOrder);

export default router;