import { Router } from 'express';
import { auth, authorizeRoles } from '../middleware/auth';
import { forecastDemand, driverScorecards, detectAnomalies } from '../services/intelligence';
import { prisma } from '../lib/prisma';

/** Forecasts, scorecards and anomalies. Mounted at /api/intelligence. */
const router = Router();

router.get('/forecast', auth, authorizeRoles('ADMIN', 'WAREHOUSE_STAFF'), async (req, res, next) => {
  try {
    const data = await forecastDemand({ itemId: req.query.itemId ? Number(req.query.itemId) : undefined, horizon: Number(req.query.horizon) || 30 });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/scorecards', auth, authorizeRoles('ADMIN', 'DISPATCH_OFFICER'), async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);
    res.json({ success: true, data: await driverScorecards(days), days });
  } catch (error) {
    next(error);
  }
});

router.get('/anomalies', auth, authorizeRoles('ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await detectAnomalies() });
  } catch (error) {
    next(error);
  }
});

/** @openapi
 * /api/intelligence/data-quality:
 *   get:
 *     summary: List incomplete operational records
 *     description: Returns tenant-scoped product, customer, and active-order data quality issues with review links.
 *     tags: [Insights]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Data quality issues and record totals } }
 */
router.get('/data-quality', auth, authorizeRoles('ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'), async (_req, res, next) => {
  try {
    const [items, accounts, orders] = await Promise.all([
      prisma.inventoryItem.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, code: true, barcode: true, quantity: true } }),
      prisma.customerAccount.findMany({ select: { id: true, name: true, phone: true, address: true } }),
      prisma.deliveryOrder.findMany({ where: { status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] } }, select: { id: true, orderNumber: true, customerName: true, deliveryAddress: true, contactNumber: true, driverId: true } }),
    ]);
    const issues: Array<{type: string; recordId: number; record: string; detail: string; href: string}> = [];
    for (const item of items) {
      if (!item.code?.trim()) issues.push({ type: 'Missing product code', recordId: item.id, record: item.name, detail: 'Add a unique product code.', href: `/inventory/${item.id}/edit` });
      if (!item.barcode?.trim()) issues.push({ type: 'Missing barcode', recordId: item.id, record: item.name, detail: 'Add a barcode to enable fast scanning.', href: `/inventory/${item.id}/edit` });
      if (item.quantity < 0) issues.push({ type: 'Negative stock', recordId: item.id, record: item.name, detail: `Recorded stock is ${item.quantity}.`, href: `/inventory/${item.id}/edit` });
    }
    const nameCounts = new Map<string, typeof accounts>();
    for (const account of accounts) {
      const key = account.name.trim().toLocaleLowerCase();
      nameCounts.set(key, [...(nameCounts.get(key) || []), account]);
      if (!account.phone?.trim()) issues.push({ type: 'Missing customer phone', recordId: account.id, record: account.name, detail: 'Add a contact number for delivery updates.', href: `/accounts?view=${account.id}` });
      if (!account.address?.trim()) issues.push({ type: 'Missing customer address', recordId: account.id, record: account.name, detail: 'Add a delivery address.', href: `/accounts?view=${account.id}` });
    }
    for (const duplicates of nameCounts.values()) if (duplicates.length > 1) for (const account of duplicates) issues.push({ type: 'Possible duplicate customer', recordId: account.id, record: account.name, detail: `${duplicates.length} accounts share this name.`, href: `/accounts?view=${account.id}` });
    for (const order of orders) {
      if (!order.driverId) issues.push({ type: 'Unassigned active order', recordId: order.id, record: order.orderNumber, detail: `${order.customerName} needs a driver assignment.`, href: `/orders/${order.id}` });
      if (!order.deliveryAddress?.trim() || !order.contactNumber?.trim()) issues.push({ type: 'Incomplete delivery details', recordId: order.id, record: order.orderNumber, detail: 'Add the missing address or phone number.', href: `/orders/${order.id}/edit` });
    }
    res.json({ success: true, data: issues, totals: { issues: issues.length, products: items.length, customers: accounts.length, activeOrders: orders.length } });
  } catch (error) { next(error); }
});

export default router;
