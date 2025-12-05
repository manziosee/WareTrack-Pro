import { Router } from 'express';
import { OrdersController } from '../controllers/ordersController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, OrdersController.getOrders);
router.get('/status', auth, OrdersController.getStatuses);
router.get('/customer/:id', auth, OrdersController.getOrdersByCustomer);
router.post('/', auth, OrdersController.createOrder);
router.post('/:id/status', auth, OrdersController.updateOrderStatus);
router.put('/:id/status', auth, OrdersController.updateOrderStatus);
router.get('/:id', auth, OrdersController.getOrderById);
router.put('/:id', auth, OrdersController.updateOrder);
router.put('/:id/cancel', auth, OrdersController.cancelOrder);
router.delete('/:id', auth, OrdersController.deleteOrder);

export default router;