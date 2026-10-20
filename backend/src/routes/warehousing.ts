import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { barcodeLookupOr } from '../lib/barcodeLookup';
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
    if (!fromWarehouseId || !toWarehouseId || !itemId || !Number.isInteger(qty) || !(qty > 0)) return bad(res, 'fromWarehouseId, toWarehouseId, itemId and a positive whole quantity are required');
    if (Number(fromWarehouseId) === Number(toWarehouseId)) return bad(res, 'Choose two different warehouses');
    const source = await prisma.warehouseStock.findUnique({ where: { warehouseId_itemId: { warehouseId: Number(fromWarehouseId), itemId: Number(itemId) } } });
    if (!source || source.quantity < qty) return bad(res, `Only ${source?.quantity ?? 0} units available at the source warehouse`);

    const count = await prisma.stockTransfer.count();
    const transfer = await prisma.$transaction(async (tx) => {
      // Stock leaves the source warehouse immediately and arrives when completed
      const changed = await tx.warehouseStock.updateMany({ where: { id: source.id, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } });
      if (changed.count !== 1) throw new Error('Stock changed while the adjustment was being saved. Refresh and try again.');
      const created = await tx.stockTransfer.create({
        data: {
          transferNumber: seq('TR', count + 1), fromWarehouseId: Number(fromWarehouseId), toWarehouseId: Number(toWarehouseId),
          itemId: Number(itemId), quantity: qty, notes, status: 'IN_TRANSIT', createdBy: Number(req.user!.userId),
        },
      });
      const item = await tx.inventoryItem.findUnique({ where: { id: Number(itemId) }, select: { quantity: true } });
      if (item) await tx.inventoryHistory.create({ data: {
        itemId: Number(itemId), action: 'transfer_out', quantity: qty, previousQuantity: item.quantity, newQuantity: item.quantity,
        notes: `Transfer ${created.transferNumber} departed warehouse ${fromWarehouseId} for warehouse ${toWarehouseId}${notes ? `: ${String(notes).slice(0, 160)}` : ''}`,
        performedBy: Number(req.user!.userId),
      } });
      return created;
    });
    if (!transfer) return bad(res, 'Transfer source quantity changed; refresh and try again', 409);
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers/:id/complete', ...manage, async (req, res, next) => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: Number(req.params.id) } });
    if (!transfer) return bad(res, 'Transfer not found', 404);
    if (transfer.status !== 'IN_TRANSIT') return bad(res, `Transfer is ${transfer.status.toLowerCase()} and cannot be received`, 409);
    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.stockTransfer.updateMany({ where: { id: transfer.id, status: 'IN_TRANSIT' }, data: { status: 'COMPLETED', completedAt: new Date() } });
      if (!claimed.count) return null;
      await tx.warehouseStock.upsert({
        where: { warehouseId_itemId: { warehouseId: transfer.toWarehouseId, itemId: transfer.itemId } },
        update: { quantity: { increment: transfer.quantity } },
        create: { warehouseId: transfer.toWarehouseId, itemId: transfer.itemId, quantity: transfer.quantity },
      });
      const item = await tx.inventoryItem.findUnique({ where: { id: transfer.itemId }, select: { quantity: true } });
      if (item) await tx.inventoryHistory.create({ data: {
        itemId: transfer.itemId, action: 'transfer_in', quantity: transfer.quantity, previousQuantity: item.quantity, newQuantity: item.quantity,
        notes: `Transfer ${transfer.transferNumber} received at warehouse ${transfer.toWarehouseId}`,
        performedBy: Number(req.user!.userId),
      } });
      return tx.stockTransfer.findUniqueOrThrow({ where: { id: transfer.id } });
    });
    if (!updated) return bad(res, 'Transfer state changed; refresh and review it', 409);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers/:id/cancel', ...manage, async (req, res, next) => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: Number(req.params.id) } });
    if (!transfer) return bad(res, 'Transfer not found', 404);
    if (transfer.status !== 'IN_TRANSIT') return bad(res, `Transfer is ${transfer.status.toLowerCase()} and cannot be cancelled`, 409);
    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.stockTransfer.updateMany({ where: { id: transfer.id, status: 'IN_TRANSIT' }, data: { status: 'CANCELLED', completedAt: new Date() } });
      if (!claimed.count) return null;
      await tx.warehouseStock.update({
        where: { warehouseId_itemId: { warehouseId: transfer.fromWarehouseId, itemId: transfer.itemId } },
        data: { quantity: { increment: transfer.quantity } },
      });
      const item = await tx.inventoryItem.findUnique({ where: { id: transfer.itemId }, select: { quantity: true } });
      if (item) await tx.inventoryHistory.create({ data: {
        itemId: transfer.itemId, action: 'transfer_cancelled', quantity: transfer.quantity, previousQuantity: item.quantity, newQuantity: item.quantity,
        notes: `Transfer ${transfer.transferNumber} cancelled; stock returned to warehouse ${transfer.fromWarehouseId}`,
        performedBy: Number(req.user!.userId),
      } });
      return tx.stockTransfer.findUniqueOrThrow({ where: { id: transfer.id } });
    });
    if (!updated) return bad(res, 'Transfer state changed; refresh and review it', 409);
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
    const warehouse = await prisma.warehouse.findFirst({ where: { active: true, ...(warehouseId ? { id: Number(warehouseId) } : {}) }, orderBy: { id: 'asc' }, select: { id: true } });
    if (!warehouse) return bad(res, 'Create or select an active warehouse in this branch first', 409);
    const count = await prisma.purchaseOrder.count();
    const supplier = await prisma.supplier.findUnique({ where: { id: Number(supplierId) } });
    if (!supplier) return bad(res, 'Supplier not found', 404);
    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
        supplierId: supplier.id,
        warehouseId: warehouse.id,
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
    const receivingWarehouse = po.warehouseId
      ? await prisma.warehouse.findFirst({ where: { id: po.warehouseId, active: true }, select: { id: true } })
      : await prisma.warehouse.findFirst({ where: { active: true }, orderBy: { id: 'asc' }, select: { id: true } });
    if (!receivingWarehouse) return bad(res, 'Create an active warehouse in this branch before receiving goods', 409);

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
        await tx.warehouseStock.upsert({
          where: { warehouseId_itemId: { warehouseId: receivingWarehouse.id, itemId: line.itemId } },
          update: { quantity: { increment: qty } },
          create: { warehouseId: receivingWarehouse.id, itemId: line.itemId, quantity: qty },
        });
        await tx.inventoryBatch.create({
          data: {
            itemId: line.itemId, batchNumber: `B${po.id}-${line.itemId}-${Date.now().toString(36)}`, quantity: qty,
            expiryDate: input?.expiryDate ? new Date(input.expiryDate) : null, warehouseId: receivingWarehouse.id, purchaseOrderId: po.id,
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
// Scanner support: lookup and quick stock adjustments
// ---------------------------------------------------------------------------

/** Find an item by scanned barcode or item code. */
router.get('/inventory-lookup/:code', auth, async (req, res, next) => {
  try {
    const code = String(req.params.code).trim();
    const include = { warehouseStock: { include: { warehouse: { select: { id: true, name: true, code: true } } } }, packagings: true };
    let item = await prisma.inventoryItem.findFirst({
      where: { OR: barcodeLookupOr(code) },
      include,
    });
    // A pack barcode (e.g. a crate) finds its item, and says which pack was scanned
    let packaging = null;
    if (!item) {
      packaging = await prisma.itemPackaging.findUnique({ where: { barcode: code } });
      if (packaging) item = await prisma.inventoryItem.findUnique({ where: { id: packaging.itemId }, include });
    }
    if (!item) return bad(res, `No item found for “${code}”`, 404);
    res.json({ success: true, data: { ...item, scannedPackaging: packaging } });
  } catch (error) {
    next(error);
  }
});

/** Add or remove stock (e.g. after scanning), optionally at one warehouse. */
router.post('/inventory/:id/adjust', ...manage, async (req, res, next) => {
  try {
    const delta = Math.trunc(Number(req.body?.delta));
    const reason = String(req.body?.reason || '').slice(0, 120);
    const requestedWarehouseId = req.body?.warehouseId ? Number(req.body.warehouseId) : null;
    if (!delta) return bad(res, 'delta must be a non-zero whole number');
    const item = await prisma.inventoryItem.findUnique({ where: { id: Number(req.params.id) } });
    if (!item) return bad(res, 'Item not found', 404);
    const warehouse = await prisma.warehouse.findFirst({ where: { active: true, ...(requestedWarehouseId ? { id: requestedWarehouseId } : {}) }, orderBy: { id: 'asc' }, select: { id: true } });
    if (!warehouse) return bad(res, 'Create or select an active warehouse in this branch first', 409);
    const currentStock = await prisma.warehouseStock.findUnique({ where: { warehouseId_itemId: { warehouseId: warehouse.id, itemId: item.id } }, select: { quantity: true } });
    const branchQuantity = currentStock?.quantity || 0;
    if (delta < 0 && branchQuantity < -delta) return bad(res, `Only ${branchQuantity} ${item.unit} in this branch`, 409);
    if (delta < 0 && item.quantity < -delta) return bad(res, `Only ${item.quantity} ${item.unit} in total stock`, 409);

    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.inventoryItem.updateMany({
        where: { id: item.id, ...(delta < 0 ? { quantity: { gte: -delta } } : {}) },
        data: { quantity: { increment: delta }, lastUpdated: new Date() },
      });
      if (changed.count !== 1) return null;
      if (delta < 0) {
        const stock = await tx.warehouseStock.updateMany({ where: { warehouseId: warehouse.id, itemId: item.id, quantity: { gte: -delta } }, data: { quantity: { decrement: -delta } } });
        if (stock.count !== 1) throw new Error('Stock changed while the adjustment was being saved. Refresh and try again.');
      } else await tx.warehouseStock.upsert({
        where: { warehouseId_itemId: { warehouseId: warehouse.id, itemId: item.id } },
        update: { quantity: { increment: delta } },
        create: { warehouseId: warehouse.id, itemId: item.id, quantity: delta },
      });
      const next = await tx.inventoryItem.findUnique({ where: { id: item.id } });
      if (!next) throw new Error('Item not found');
      await tx.inventoryHistory.create({
        data: {
          itemId: item.id, action: delta > 0 ? 'stock_in' : 'stock_out', quantity: Math.abs(delta),
          previousQuantity: branchQuantity, newQuantity: branchQuantity + delta, notes: reason || (delta > 0 ? 'Scanned in' : 'Scanned out'),
          performedBy: Number(req.user!.userId),
        },
      });
      return next;
    });
    if (!updated) return bad(res, 'Stock changed while the adjustment was being saved. Refresh and try again.', 409);
    if (branchQuantity + delta <= updated.minQuantity) {
      emitEvent('stock.low', { id: updated.id, name: updated.name, code: updated.code, quantity: branchQuantity + delta, minQuantity: updated.minQuantity });
    }
    res.json({ success: true, data: { ...updated, quantity: branchQuantity + delta } });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Stock changed while')) return bad(res, error.message, 409);
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
