import { Router } from 'express';
import { OrdersController } from '../controllers/ordersController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/emailService';

const router = Router();

router.get('/', auth, OrdersController.getOrders);
/** @openapi
 * /api/orders/{id}/timeline:
 *   get:
 *     summary: Get an order's chronological operational timeline
 *     description: Combines order creation, stock reservation and movement, packing, dispatch, proof of delivery, payments and handovers, returns, and audit changes.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Chronological timeline events for the selected tenant }
 *       404: { description: Order not found }
 */
router.get('/:id/timeline', auth, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const order = await prisma.deliveryOrder.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true, status: true, createdAt: true, updatedAt: true, packedAt: true, packingStatus: true } });
    if (!order) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    const [audit, reservations, movements, dispatches, proofs, payments, returns] = await Promise.all([
      prisma.auditLog.findMany({ where: { entityType: 'Order', entityId: String(orderId) }, orderBy: { createdAt: 'asc' }, take: 100, select: { action: true, summary: true, userName: true, createdAt: true, changes: true } }),
      prisma.stockReservation.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' }, include: { item: { select: { name: true, unit: true } } } }),
      prisma.inventoryHistory.findMany({ where: { orderId }, orderBy: { performedAt: 'asc' }, include: { item: { select: { name: true, unit: true } }, performedByUser: { select: { name: true } } } }),
      prisma.dispatch.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' }, include: { driver: { select: { name: true } }, vehicle: { select: { plateNumber: true } } } }),
      prisma.deliveryProof.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' }, select: { recipientName: true, confirmationCode: true, createdAt: true, notes: true } }),
      prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' }, include: { handover: { select: { handoverNumber: true, createdAt: true, received: true } } } }),
      prisma.returnRequest.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' }, select: { returnNumber: true, type: true, status: true, reason: true, createdAt: true, resolvedAt: true } }),
    ]);
    const events: { at: Date; type: string; title: string; detail?: string | null; actor?: string | null }[] = [
      { at: order.createdAt, type: 'ORDER', title: 'Order created', detail: order.orderNumber },
      ...audit.map((event) => {
        const changes = event.changes && typeof event.changes === 'object' ? event.changes as Record<string, unknown> : null;
        const isCommunication = event.action.startsWith('COMMUNICATION_');
        const channel = String(changes?.channel || event.action.replace('COMMUNICATION_', ''));
        const detail = isCommunication ? `${channel}${changes?.message ? ` · ${String(changes.message)}` : ''}${changes?.recipient ? ` · ${String(changes.recipient)}` : ''}` : undefined;
        return { at: event.createdAt, type: isCommunication ? 'COMMUNICATION' : 'CHANGE', title: event.summary, detail, actor: event.userName };
      }),
      ...reservations.map((row) => ({ at: row.createdAt, type: 'ALLOCATION', title: row.status === 'RESERVED' ? 'Stock allocated' : `Stock allocation ${row.status.toLowerCase()}`, detail: `${row.quantity} ${row.item.unit} · ${row.item.name}` })),
      ...movements.map((row) => ({ at: row.performedAt, type: 'STOCK', title: `Stock ${row.action.replace('_', ' ')}`, detail: `${row.quantity} ${row.item.unit} · ${row.item.name}${row.notes ? ` · ${row.notes}` : ''}`, actor: row.performedByUser.name })),
      ...(order.packedAt ? [{ at: order.packedAt, type: 'PACKING', title: 'Order packed', detail: order.packingStatus }] : []),
      ...dispatches.flatMap((row) => [
        { at: row.createdAt, type: 'DISPATCH', title: 'Driver and vehicle assigned', detail: `${row.driver.name} · ${row.vehicle.plateNumber}` },
        ...(row.dispatchedAt ? [{ at: row.dispatchedAt, type: 'DISPATCH', title: 'Dispatched', detail: row.route }] : []),
        ...(row.actualDelivery ? [{ at: row.actualDelivery, type: 'DELIVERY', title: 'Delivery completed' }] : []),
      ]),
      ...proofs.map((row) => ({ at: row.createdAt, type: 'PROOF', title: 'Proof of delivery recorded', detail: `${row.recipientName || 'Recipient'} · confirmation ${row.confirmationCode}${row.notes ? ` · ${row.notes}` : ''}` })),
      ...payments.flatMap((row) => [
        { at: row.completedAt || row.createdAt, type: 'PAYMENT', title: `Payment ${row.status.toLowerCase()}`, detail: `${row.provider.replace(/_/g, ' ')} · RWF ${Number(row.amount).toLocaleString()}${row.externalRef ? ` · ${row.externalRef}` : ''}` },
        ...(row.handover ? [{ at: row.handover.createdAt, type: 'CASH', title: `Cash handed in · ${row.handover.handoverNumber}`, detail: `RWF ${Number(row.handover.received).toLocaleString()}` }] : []),
      ]),
      ...returns.flatMap((row) => [
        { at: row.createdAt, type: 'RETURN', title: `${row.type.replace(/_/g, ' ')} opened · ${row.returnNumber}`, detail: row.reason },
        ...(row.resolvedAt ? [{ at: row.resolvedAt, type: 'RETURN', title: `Return ${row.status.toLowerCase()}` }] : []),
      ]),
    ];
    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    res.json({ success: true, data: events });
  } catch (error) { next(error); }
});
/** @openapi
 * /api/orders/{id}/communications:
 *   post:
 *     summary: Record an order communication or send an email update
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [channel, message], properties: { channel: { type: string, enum: [CALL, EMAIL, NOTE] }, message: { type: string } } }
 *     responses: { 201: { description: Communication logged }, 400: { description: Invalid input }, 404: { description: Order not found } }
 */
router.post('/:id/communications', auth, authorizeRoles(...ROLES.orderManagers), async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const channel = String(req.body?.channel || '').toUpperCase();
    const message = String(req.body?.message || '').trim().slice(0, 2000);
    if (!['CALL', 'EMAIL', 'NOTE'].includes(channel) || !message) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose CALL, EMAIL or NOTE and enter a message.' } });
    const order = await prisma.deliveryOrder.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true, customerName: true, customerEmail: true } });
    if (!order) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    let sent: boolean | null = null;
    if (channel === 'EMAIL') {
      if (!order.customerEmail) return res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'This order has no customer email address.' } });
      sent = await EmailService.sendEmail({ email: order.customerEmail, name: order.customerName, title: `Delivery update · ${order.orderNumber}`, message, actionPath: `/track/${order.orderNumber}`, actionLabel: 'Track delivery' });
    }
    const actor = await prisma.user.findUnique({ where: { id: Number(req.user!.userId) }, select: { name: true, role: true } });
    const log = await prisma.auditLog.create({ data: {
      userId: Number(req.user!.userId), userName: actor?.name || null, userRole: actor?.role || null,
      action: `COMMUNICATION_${channel}`, entityType: 'Order', entityId: String(orderId),
      summary: channel === 'EMAIL' ? `Customer email ${sent ? 'sent' : 'failed'}` : `${channel === 'CALL' ? 'Customer call' : 'Customer note'} logged`,
      changes: { channel, message, recipient: channel === 'EMAIL' ? order.customerEmail : null, sent },
    } });
    res.status(201).json({ success: true, data: { id: log.id, sent } });
  } catch (error) { next(error); }
});
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
