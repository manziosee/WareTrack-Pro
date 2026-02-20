import { Router } from 'express';
import { OrdersController } from '../controllers/ordersController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, OrdersController.getOrders);
router.get('/:id', auth, OrdersController.getOrderById);
router.post('/', auth, OrdersController.createOrder);
router.post('/:id/status', auth, OrdersController.updateOrderStatus);
router.put('/:id', auth, OrdersController.updateOrder);
router.delete('/:id', auth, OrdersController.deleteOrder);

export default router;