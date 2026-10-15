import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { emitEvent } from '../services/events';

/**
 * Multi-warehouse stock, transfers, suppliers, purchase orders and batches.
 * Mounted at /api.
 */
const router = Router();
const manage = [auth, authorizeRoles(...ROLES.inventoryManagers)];

const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message } });

const seq = (prefix: string, n: number, size = 4) => `${prefix}-${String(n).padStart(size, '0')}`;

// ---------------------------------------------------------------------------
// Warehouses
// ---------------------------------------------------------------------------

router.get('/warehouses', auth, async (_req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { id: 'asc' },
      include: { stock: { select: { quantity: true, item: { select: { unitPrice: true } } } } },
    });
    res.json({
      success: true,
      data: warehouses.map(({ stock, ...w }) => {
        const units = stock.reduce((s, x) => s + x.quantity, 0);
        return {
          ...w,
          units,
          skus: stock.filter((x) => x.quantity > 0).length,
          value: Math.round(stock.reduce((s, x) => s + x.quantity * Number(x.item.unitPrice), 0)),
          utilization: w.capacity ? Math.min(100, Math.round((units / w.capacity) * 1000) / 10) : null,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/warehouses/:id/stock', auth, async (req, res, next) => {
  try {
    const stock = await prisma.warehouseStock.findMany({
      where: { warehouseId: Number(req.params.id) },
      include: { item: { select: { id: true, name: true, code: true, category: true, unit: true, minQuantity: true, unitPrice: true } } },
      orderBy: { item: { name: 'asc' } },
    });
    res.json({ success: true, data: stock });
  } catch (error) {
    next(error);
  }
});

router.post('/warehouses', ...manage, async (req, res, next) => {
  try {
    const { name, code, address, city, latitude, longitude, capacity } = req.body || {};
    if (!name || !code) return bad(res, 'name and code are required');
    const warehouse = await prisma.warehouse.create({
      data: { name, code: String(code).toUpperCase(), address, city, latitude, longitude, capacity: capacity ? Number(capacity) : null },
    });
    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
});

router.put('/warehouses/:id', ...manage, async (req, res, next) => {
  try {
    const { name, address, city, latitude, longitude, capacity, active } = req.body || {};
    const warehouse = await prisma.warehouse.update({
      where: { id: Number(req.params.id) },
      data: { name, address, city, latitude, longitude, capacity: capacity !== undefined ? Number(capacity) : undefined, active },
    });
    res.json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Stock transfers between warehouses
// ---------------------------------------------------------------------------

router.get('/transfers', auth, async (_req, res, next) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        fromWarehouse: { select: { name: true, code: true } },
        toWarehouse: { select: { name: true, code: true } },
        item: { select: { name: true, code: true, unit: true } },
      },
    });
    res.json({ success: true, data: transfers });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers', ...manage, async (req, res, next) => {
  try {
    const { fromWarehouseId, toWarehouseId, itemId, quantity, notes } = req.body || {};
    const qty = Number(quantity);
    if (!fromWarehouseId || !toWarehouseId || !itemId || !(qty > 0)) return bad(res, 'fromWarehouseId, toWarehouseId, itemId and a positive quantity are required');
    if (Number(fromWarehouseId) === Number(toWarehouseId)) return bad(res, 'Choose two different warehouses');
    const source = await prisma.warehouseStock.findUnique({ where: { warehouseId_itemId: { warehouseId: Number(fromWarehouseId), itemId: Number(itemId) } } });
    if (!source || source.quantity < qty) return bad(res, `Only ${source?.quantity ?? 0} units available at the source warehouse`);

    const count = await prisma.stockTransfer.count();
    const transfer = await prisma.$transaction(async (tx) => {
      // Stock leaves the source warehouse immediately and arrives when completed
      await tx.warehouseStock.update({ where: { id: source.id }, data: { quantity: { decrement: qty } } });
      return tx.stockTransfer.create({
        data: {
          transferNumber: seq('TR', count + 1), fromWarehouseId: Number(fromWarehouseId), toWarehouseId: Number(toWarehouseId),
          itemId: Number(itemId), quantity: qty, notes, status: 'IN_TRANSIT', createdBy: Number(req.user!.userId),
        },
      });
    });
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers/:id/complete', ...manage, async (req, res, next) => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: Number(req.params.id) } });
    if (!transfer) return bad(res, 'Transfer not found', 404);
    if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') return bad(res, `Transfer is already ${transfer.status.toLowerCase()}`);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.warehouseStock.upsert({
        where: { warehouseId_itemId: { warehouseId: transfer.toWarehouseId, itemId: transfer.itemId } },
        update: { quantity: { increment: transfer.quantity } },
        create: { warehouseId: transfer.toWarehouseId, itemId: transfer.itemId, quantity: transfer.quantity },
      });
      return tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers/:id/cancel', ...manage, async (req, res, next) => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: Number(req.params.id) } });
    if (!transfer) return bad(res, 'Transfer not found', 404);
    if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') return bad(res, `Transfer is already ${transfer.status.toLowerCase()}`);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.warehouseStock.update({
        where: { warehouseId_itemId: { warehouseId: transfer.fromWarehouseId, itemId: transfer.itemId } },
        data: { quantity: { increment: transfer.quantity } },
      });
      return tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: 'CANCELLED', completedAt: new Date() } });
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

router.get('/suppliers', auth, async (_req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { purchaseOrders: { select: { status: true, totalAmount: true, createdAt: true, receivedAt: true, expectedDate: true } } },
    });
    res.json({
      success: true,
      data: suppliers.map(({ purchaseOrders, ...s }) => {
        const received = purchaseOrders.filter((p) => p.receivedAt);
        const onTime = received.filter((p) => !p.expectedDate || p.receivedAt! <= p.expectedDate).length;
        return {
          ...s,
          orders: purchaseOrders.length,
          openOrders: purchaseOrders.filter((p) => ['DRAFT', 'SENT'].includes(p.status)).length,
          spend: Math.round(purchaseOrders.filter((p) => p.status === 'RECEIVED').reduce((t, p) => t + Number(p.totalAmount), 0)),
          onTimeRate: received.length ? Math.round((onTime / received.length) * 100) : null,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/suppliers', ...manage, async (req, res, next) => {
  try {
    const { name, contactName, email, phone, address, leadTimeDays } = req.body || {};
    if (!name) return bad(res, 'name is required');
    const supplier = await prisma.supplier.create({ data: { name, contactName, email, phone, address, leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 7 } });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
});

router.put('/suppliers/:id', ...manage, async (req, res, next) => {
  try {
    const { name, contactName, email, phone, address, leadTimeDays, active } = req.body || {};
    const supplier = await prisma.supplier.update({
      where: { id: Number(req.params.id) },
      data: { name, contactName, email, phone, address, active, leadTimeDays: leadTimeDays !== undefined ? Number(leadTimeDays) : undefined },
    });
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
});

router.delete('/suppliers/:id', ...manage, async (req, res, next) => {
  try {
    await prisma.supplier.update({ where: { id: Number(req.params.id) }, data: { active: false } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

const poInclude = {
  supplier: { select: { id: true, name: true, email: true, phone: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  items: { include: { item: { select: { id: true, name: true, code: true, unit: true } } } },
};

router.get('/purchase-orders', auth, async (_req, res, next) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 500, include: poInclude });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

router.post('/purchase-orders', ...manage, async (req, res, next) => {
  try {
    const { supplierId, warehouseId, expectedDate, notes, items } = req.body || {};
    if (!supplierId || !Array.isArray(items) || items.length === 0) return bad(res, 'supplierId and at least one item are required');
    const lines = items.map((l: any) => ({ itemId: Number(l.itemId), quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 }));
    if (lines.some((l: any) => !l.itemId || !(l.quantity > 0))) return bad(res, 'Each item needs an itemId and a positive quantity');
    const count = await prisma.purchaseOrder.count();
    const supplier = await prisma.supplier.findUnique({ where: { id: Number(supplierId) } });
    if (!supplier) return bad(res, 'Supplier not found', 404);
    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
        supplierId: supplier.id,
        warehouseId: warehouseId ? Number(warehouseId) : null,
        expectedDate: expectedDate ? new Date(expectedDate) : new Date(Date.now() + supplier.leadTimeDays * 86400000),
        notes,
        totalAmount: lines.reduce((s: number, l: any) => s + l.quantity * l.unitCost, 0),
        createdBy: Number(req.user!.userId),
        items: { create: lines },
      },
      include: poInclude,
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

router.post('/purchase-orders/:id/send', ...manage, async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: Number(req.params.id) } });
    if (!po) return bad(res, 'Purchase order not found', 404);
    if (po.status !== 'DRAFT') return bad(res, 'Only draft purchase orders can be sent');
    const updated = await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'SENT' }, include: poInclude });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/purchase-orders/:id/cancel', ...manage, async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: Number(req.params.id) } });
    if (!po) return bad(res, 'Purchase order not found', 404);
    if (po.status === 'RECEIVED') return bad(res, 'A received purchase order cannot be cancelled');
    const updated = await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'CANCELLED' }, include: poInclude });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * Receive goods: adds stock (item total + warehouse), records a batch with an
 * optional expiry date per line, and logs stock-in history.
 * Body: { lines?: [{ itemId, receivedQuantity, expiryDate? }] } — defaults to everything ordered.
 */
router.post('/purchase-orders/:id/receive', ...manage, async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: Number(req.params.id) }, include: { items: true } });
    if (!po) return bad(res, 'Purchase order not found', 404);
    if (!['SENT', 'DRAFT', 'PARTIAL'].includes(po.status)) return bad(res, `Purchase order is ${po.status.toLowerCase()}`);
    const requested: any[] = Array.isArray(req.body?.lines) ? req.body.lines : [];
    const userId = Number(req.user!.userId);

    const updated = await prisma.$transaction(async (tx) => {
      let complete = true;
      for (const line of po.items) {
        const input = requested.find((l) => Number(l.itemId) === line.itemId);
        const remaining = line.quantity - line.receivedQuantity;
        const qty = Math.max(0, Math.min(remaining, input ? Number(input.receivedQuantity) : remaining));
        if (line.receivedQuantity + qty < line.quantity) complete = false;
        if (qty === 0) continue;

        const item = await tx.inventoryItem.update({ where: { id: line.itemId }, data: { quantity: { increment: qty }, lastUpdated: new Date() } });
        await tx.purchaseOrderItem.update({ where: { id: line.id }, data: { receivedQuantity: { increment: qty } } });
        if (po.warehouseId) {
          await tx.warehouseStock.upsert({
            where: { warehouseId_itemId: { warehouseId: po.warehouseId, itemId: line.itemId } },
            update: { quantity: { increment: qty } },
            create: { warehouseId: po.warehouseId, itemId: line.itemId, quantity: qty },
          });
        }
        await tx.inventoryBatch.create({
          data: {
            itemId: line.itemId, batchNumber: `B${po.id}-${line.itemId}-${Date.now().toString(36)}`, quantity: qty,
            expiryDate: input?.expiryDate ? new Date(input.expiryDate) : null, warehouseId: po.warehouseId, purchaseOrderId: po.id,
          },
        });
        await tx.inventoryHistory.create({
          data: { itemId: line.itemId, action: 'stock_in', quantity: qty, previousQuantity: item.quantity - qty, newQuantity: item.quantity, notes: `Received ${po.poNumber}`, performedBy: userId },
        });
      }
      return tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: complete ? 'RECEIVED' : 'PARTIAL', receivedAt: complete ? new Date() : null },
        include: poInclude,
      });
    });
    emitEvent('purchase_order.received', { id: updated.id, poNumber: updated.poNumber, status: updated.status });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/** Create draft purchase orders for every item at or below its minimum. */
router.post('/purchase-orders/auto-restock', ...manage, async (req, res, next) => {
  try {
    const { generateRestockOrders } = await import('../services/restockService');
    const created = await generateRestockOrders(Number(req.user!.userId));
    res.json({ success: true, data: created, message: created.length ? `Created ${created.length} draft purchase order(s)` : 'Nothing needs restocking right now' });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Batches and expiry
// ---------------------------------------------------------------------------

router.get('/batches', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(Number(req.query.days) || 60, 365);
    const where: any = req.query.itemId
      ? { itemId: Number(req.query.itemId) }
      : { expiryDate: { not: null, lte: new Date(Date.now() + days * 86400000) }, quantity: { gt: 0 } };
    const batches = await prisma.inventoryBatch.findMany({
      where,
      orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'desc' }],
      take: 300,
      include: { item: { select: { id: true, name: true, code: true, unit: true } }, warehouse: { select: { name: true, code: true } } },
    });
    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
});

export default router;
