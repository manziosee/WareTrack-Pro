import { Router } from 'express';
import { OrdersController } from '../controllers/ordersController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', auth, OrdersController.getOrders);
router.get('/:id', auth, OrdersController.getOrderById);
/**
 * @swagger
 * /api/orders/{id}/reservations:
 *   get:
 *     summary: List stock allocations held for an order
 *     tags: [Orders, Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Allocated item quantities and reservation states
 *       404:
 *         description: Order not found
 */
router.get('/:id/reservations', auth, authorizeRoles(...ROLES.orderManagers), async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const order = await prisma.deliveryOrder.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    const data = await prisma.stockReservation.findMany({
      where: { orderId }, orderBy: { id: 'asc' },
      include: { item: { select: { id: true, name: true, code: true, unit: true } }, createdBy: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
});
router.post('/', auth, authorizeRoles(...ROLES.orderManagers), OrdersController.createOrder);
router.post('/:id/status', auth, authorizeRoles(...ROLES.orderManagers), OrdersController.updateOrderStatus);
router.put('/:id', auth, authorizeRoles(...ROLES.orderManagers), OrdersController.updateOrder);
router.delete('/:id', auth, authorizeRoles(...ROLES.orderManagers), OrdersController.deleteOrder);

export default router;
