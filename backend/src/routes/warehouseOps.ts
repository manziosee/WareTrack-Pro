import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { nextDocumentNumber } from '../lib/documentNumbers';
import { barcodeLookupOr } from '../lib/barcodeLookup';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import { accountForCustomer, createOrderRecord, OrderInputError } from '../services/orderCreation';

/**
 * Pack sizes, stock counts, picking and packing, and order import.
 * Mounted at /api.
 */
const router = Router();
const stock = [auth, authorizeRoles(...ROLES.inventoryManagers)];
const staff = [auth, authorizeRoles(...ROLES.orderManagers)];

const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_ERROR', message } });
const userId = (req: Request) => Number(req.user!.userId);

// ===========================================================================
// Pack sizes (units and packaging)
// ===========================================================================

function packagingData(body: any) {
  const name = String(body?.name || '').trim().slice(0, 40);
  const unitsPerPack = Math.round(Number(body?.unitsPerPack));
  const price = body?.price === '' || body?.price === null || body?.price === undefined ? null : Number(body.price);
  const barcode = body?.barcode ? String(body.barcode).trim().slice(0, 64) : null;
  return { name, unitsPerPack, price, barcode };
}

router.get('/inventory/:id/packagings', auth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.itemPackaging.findMany({ where: { itemId: Number(req.params.id) }, orderBy: { unitsPerPack: 'asc' } }) });
  } catch (error) {
    next(error);
  }
});

router.post('/inventory/:id/packagings', ...stock, async (req, res, next) => {
  try {
    const data = packagingData(req.body);
    if (!data.name) return bad(res, 'Pack name is required, e.g. Crate');
    if (!(data.unitsPerPack >= 2)) return bad(res, 'A pack must hold at least 2 units');
    if (data.price !== null && !(data.price >= 0)) return bad(res, 'Price must be a positive number');
    const item = await prisma.inventoryItem.findUnique({ where: { id: Number(req.params.id) } });
    if (!item) return bad(res, 'Item not found', 404);
    const packaging = await prisma.itemPackaging.create({ data: { ...data, itemId: item.id } });
    res.status(201).json({ success: true, data: packaging });
  } catch (error: any) {
    if (error?.code === 'P2002') return bad(res, 'That pack name or barcode is already used', 409);
    next(error);
  }
});

router.put('/packagings/:id', ...stock, async (req, res, next) => {
  try {
    const data = packagingData(req.body);
    if (!data.name || !(data.unitsPerPack >= 2)) return bad(res, 'Give a name and at least 2 units per pack');
    res.json({ success: true, data: await prisma.itemPackaging.update({ where: { id: Number(req.params.id) }, data }) });
  } catch (error: any) {
    if (error?.code === 'P2002') return bad(res, 'That pack name or barcode is already used', 409);
    if (error?.code === 'P2025') return bad(res, 'Pack not found', 404);
    next(error);
  }
});

router.delete('/packagings/:id', ...stock, async (req, res, next) => {
  try {
    await prisma.itemPackaging.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Pack not found', 404);
    next(error);
  }
});

// ===========================================================================
// Stock counts
// ===========================================================================

const countInclude = {
  lines: {
    orderBy: { item: { location: 'asc' as const } },
    include: { item: { select: { id: true, name: true, code: true, barcode: true, unit: true, location: true, category: true, unitPrice: true } } },
  },
};

function summarize(count: any) {
  const lines = count.lines || [];
  const counted = lines.filter((l: any) => l.counted !== null);
  const diffs = counted.filter((l: any) => l.counted !== l.expected);
  return {
    items: lines.length,
    counted: counted.length,
    differences: diffs.length,
    valueDifference: Math.round(diffs.reduce((s: number, l: any) => s + (l.counted - l.expected) * Number(l.item?.unitPrice || 0), 0)),
  };
}

router.get('/stock-counts', ...stock, async (_req, res, next) => {
  try {
    const counts = await prisma.stockCount.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: countInclude });
    res.json({ success: true, data: counts.map(({ lines, ...c }) => ({ ...c, ...summarize({ lines }) })) });
  } catch (error) {
    next(error);
  }
});

router.get('/stock-counts/:id', ...stock, async (req, res, next) => {
  try {
    const count = await prisma.stockCount.findUnique({ where: { id: Number(req.params.id) }, include: countInclude });
    if (!count) return bad(res, 'Count not found', 404);
    res.json({ success: true, data: { ...count, summary: summarize(count) } });
  } catch (error) {
    next(error);
  }
});

/** Start a count: every active item (FULL), one category, or chosen items (CYCLE). */
router.post('/stock-counts', ...stock, async (req, res, next) => {
  try {
    const { type = 'CYCLE', category, itemIds, title, notes } = req.body || {};
    const warehouseId = req.body?.warehouseId ? Number(req.body.warehouseId) : null;
    if (!['FULL', 'CYCLE'].includes(type)) return bad(res, 'Type must be FULL or CYCLE');
    const where: any = { status: 'ACTIVE' };
    if (type === 'CYCLE') {
      if (Array.isArray(itemIds) && itemIds.length) where.id = { in: itemIds.map(Number) };
      else if (category) where.category = String(category);
      else return bad(res, 'Choose a category or some items to count');
    }
    const items = await prisma.inventoryItem.findMany({ where, select: { id: true, quantity: true } });
    if (!items.length) return bad(res, 'No items to count');
    const open = await prisma.stockCount.count({ where: { status: { in: ['OPEN', 'SUBMITTED'] }, lines: { some: { itemId: { in: items.map((i) => i.id) } } } } });
    if (open) return bad(res, 'Some of these items are already in an open count. Finish or cancel it first.', 409);
    const perWarehouse = warehouseId
      ? new Map((await prisma.warehouseStock.findMany({ where: { warehouseId } })).map((w) => [w.itemId, w.quantity]))
      : null;
    const count = await prisma.stockCount.create({
      data: {
        countNumber: await nextDocumentNumber('stockCount', 'SC', 5),
        title: title ? String(title).slice(0, 80) : type === 'FULL' ? 'Full stocktake' : category ? `${category} count` : 'Cycle count',
        type, category: category || null, warehouseId, notes: notes ? String(notes).slice(0, 500) : null, createdById: userId(req),
        lines: { create: items.map((i) => ({ itemId: i.id, expected: perWarehouse ? perWarehouse.get(i.id) || 0 : i.quantity })) },
      },
      include: countInclude,
    });
    res.status(201).json({ success: true, data: { ...count, summary: summarize(count) } });
  } catch (error) {
    next(error);
  }
});

async function openCount(id: number) {
  const count = await prisma.stockCount.findUnique({ where: { id } });
  if (!count) throw Object.assign(new Error('Count not found'), { status: 404 });
  if (count.status !== 'OPEN') throw Object.assign(new Error(`This count is ${count.status.toLowerCase()} and can't be changed`), { status: 409 });
  return count;
}

/** Enter the counted quantity for one item. */
router.put('/stock-counts/:id/lines/:itemId', ...stock, async (req, res, next) => {
  try {
    await openCount(Number(req.params.id));
    const counted = req.body?.counted === null || req.body?.counted === '' ? null : Math.round(Number(req.body?.counted));
    if (counted !== null && !(counted >= 0)) return bad(res, 'Counted quantity must be 0 or more');
    const line = await prisma.stockCountLine.update({
      where: { countId_itemId: { countId: Number(req.params.id), itemId: Number(req.params.itemId) } },
      data: { counted, countedAt: counted === null ? null : new Date(), countedById: counted === null ? null : userId(req), note: req.body?.note !== undefined ? String(req.body.note || '').slice(0, 200) || null : undefined },
    });
    res.json({ success: true, data: line });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    if (error?.code === 'P2025') return bad(res, 'That item is not in this count', 404);
    next(error);
  }
});

/** Scanner: each scan adds one unit (or one pack) to the counted quantity. */
router.post('/stock-counts/:id/scan', ...stock, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await openCount(id);
    const code = String(req.body?.code || '').trim();
    let units = Math.max(1, Math.round(Number(req.body?.quantity) || 1));
    let item = await prisma.inventoryItem.findFirst({ where: { OR: barcodeLookupOr(code) }, select: { id: true, name: true } });
    if (!item) {
      const pack = await prisma.itemPackaging.findFirst({ where: { barcode: code } });
      if (pack) {
        units *= pack.unitsPerPack;
        item = await prisma.inventoryItem.findUnique({ where: { id: pack.itemId }, select: { id: true, name: true } });
      }
    }
    if (!item) return bad(res, `No item found for “${code}”`, 404);
    const line = await prisma.stockCountLine.findUnique({ where: { countId_itemId: { countId: id, itemId: item.id } } });
    if (!line) return bad(res, `${item.name} is not part of this count`, 404);
    const updated = await prisma.stockCountLine.update({
      where: { id: line.id },
      data: { counted: (line.counted || 0) + units, countedAt: new Date(), countedById: userId(req) },
    });
    res.json({ success: true, data: { ...updated, itemName: item.name, added: units } });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

router.post('/stock-counts/:id/submit', ...stock, async (req, res, next) => {
  try {
    const count = await openCount(Number(req.params.id));
    const missing = await prisma.stockCountLine.count({ where: { countId: count.id, counted: null } });
    if (missing && !req.body?.allowUncounted) return bad(res, `${missing} item${missing === 1 ? ' has' : 's have'} not been counted yet`, 409);
    const updated = await prisma.stockCount.update({ where: { id: count.id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    NotificationService.createSystemAlert(`Stock count ${count.countNumber} ready for approval`, `${count.title || 'A stock count'} was submitted. Review the differences and approve it.`, 'INFO').catch(() => undefined);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

/**
 * Approve (admin): apply each difference (counted − expected) to the current
 * stock, so sales made during the count are kept, and log it in the history.
 */
router.post('/stock-counts/:id/approve', auth, authorizeRoles(...ROLES.admin), async (req, res, next) => {
  try {
    const count = await prisma.stockCount.findUnique({ where: { id: Number(req.params.id) }, include: { lines: true } });
    if (!count) return bad(res, 'Count not found', 404);
    if (count.status !== 'SUBMITTED') return bad(res, 'Only submitted counts can be approved', 409);
    let adjusted = 0;
    await prisma.$transaction(async (tx) => {
      const warehouse = count.warehouseId
        ? { id: count.warehouseId }
        : await tx.warehouse.findFirst({ where: { active: true }, orderBy: { id: 'asc' }, select: { id: true } });
      for (const line of count.lines) {
        if (line.counted === null || line.counted === line.expected) continue;
        const delta = line.counted - line.expected;
        const item = await tx.inventoryItem.findUnique({ where: { id: line.itemId } });
        if (!item) continue;
        if (!warehouse) throw new Error('An active branch warehouse is required to approve this count');
        const currentStock = await tx.warehouseStock.findUnique({ where: { warehouseId_itemId: { warehouseId: warehouse.id, itemId: item.id } } });
        const previousBranchQuantity = currentStock?.quantity || 0;
        if (delta < 0) {
          const stockChanged = await tx.warehouseStock.updateMany({ where: { warehouseId: warehouse.id, itemId: item.id, quantity: { gte: -delta } }, data: { quantity: { decrement: -delta } } });
          if (stockChanged.count !== 1) throw new Error(`Branch stock changed while approving ${count.countNumber}`);
        } else await tx.warehouseStock.upsert({
          where: { warehouseId_itemId: { warehouseId: warehouse.id, itemId: item.id } },
          update: { quantity: { increment: delta } },
          create: { warehouseId: warehouse.id, itemId: item.id, quantity: delta },
        });
        const itemChanged = await tx.inventoryItem.updateMany({ where: { id: item.id, ...(delta < 0 ? { quantity: { gte: -delta } } : {}) }, data: { quantity: { increment: delta }, lastUpdated: new Date() } });
        if (itemChanged.count !== 1) throw new Error(`Total stock changed while approving ${count.countNumber}`);
        const newBranchQuantity = previousBranchQuantity + delta;
        await tx.inventoryHistory.create({
          data: {
            itemId: item.id, action: 'adjustment', quantity: Math.abs(delta), previousQuantity: previousBranchQuantity, newQuantity: newBranchQuantity,
            notes: `Stock count ${count.countNumber}: counted ${line.counted}, expected ${line.expected}${line.note ? ` (${line.note})` : ''}`,
            performedBy: userId(req),
          },
        });
        adjusted += 1;
      }
      await tx.stockCount.update({ where: { id: count.id }, data: { status: 'APPROVED', approvedById: userId(req), approvedAt: new Date() } });
    });
    res.json({ success: true, data: { adjusted } });
  } catch (error) {
    next(error);
  }
});

/** Send back for recount (admin), or cancel. */
router.post('/stock-counts/:id/reopen', auth, authorizeRoles(...ROLES.admin), async (req, res, next) => {
  try {
    const count = await prisma.stockCount.findUnique({ where: { id: Number(req.params.id) } });
    if (!count || count.status !== 'SUBMITTED') return bad(res, 'Only submitted counts can be sent back', 409);
    res.json({ success: true, data: await prisma.stockCount.update({ where: { id: count.id }, data: { status: 'OPEN', submittedAt: null } }) });
  } catch (error) {
    next(error);
  }
});

router.post('/stock-counts/:id/cancel', ...stock, async (req, res, next) => {
  try {
    const count = await prisma.stockCount.findUnique({ where: { id: Number(req.params.id) } });
    if (!count || !['OPEN', 'SUBMITTED'].includes(count.status)) return bad(res, 'Only open or submitted counts can be cancelled', 409);
    res.json({ success: true, data: await prisma.stockCount.update({ where: { id: count.id }, data: { status: 'CANCELLED' } }) });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// Picking and packing
// ===========================================================================

const PACKABLE = ['PENDING', 'DISPATCHED'] as const;
const packingInclude = {
  items: {
    orderBy: { id: 'asc' as const },
    include: {
      item: { select: { id: true, name: true, code: true, barcode: true, legacyBarcodes: true, location: true, unit: true, trackSerials: true } as any },
      packaging: { select: { id: true, name: true, unitsPerPack: true, barcode: true } },
    },
  },
  driver: { select: { id: true, name: true } },
} as const;

/** Orders to pick and pack, with progress. */
router.get('/packing/orders', ...staff, async (req, res, next) => {
  try {
    const orders = await prisma.deliveryOrder.findMany({
      where: { status: { in: [...PACKABLE] }, ...(req.query.all ? {} : { packingStatus: { not: 'PACKED' } }) },
      orderBy: [{ priority: 'asc' }, { timeSlotStart: 'asc' }, { createdAt: 'asc' }],
      take: 300,
      include: packingInclude,
    });
    res.json({
      success: true,
      data: orders.map((o) => ({
        ...o,
        units: o.items.reduce((s, i) => s + i.quantity, 0),
        packedUnits: o.items.reduce((s, i) => s + Math.min(i.packedQuantity, i.quantity), 0),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** One pick list for several orders: totals per item, sorted by shelf location. */
router.get('/packing/pick-list', ...staff, async (req, res, next) => {
  try {
    const ids = String(req.query.orderIds || '').split(',').map(Number).filter(Boolean);
    const orders = await prisma.deliveryOrder.findMany({
      where: ids.length ? { id: { in: ids } } : { status: { in: [...PACKABLE] }, packingStatus: { not: 'PACKED' } },
      include: packingInclude,
      orderBy: { createdAt: 'asc' },
    });
    const byItem = new Map<number, any>();
    for (const o of orders) {
      for (const line of o.items) {
        const row = byItem.get(line.itemId) || {
          itemId: line.itemId, name: line.item.name, code: line.item.code, location: line.item.location,
          unit: line.item.unit, units: 0, packs: {} as Record<string, number>, orders: [] as { orderNumber: string; units: number }[],
        };
        row.units += line.quantity;
        if (line.packaging) row.packs[line.packaging.name] = (row.packs[line.packaging.name] || 0) + (line.packQuantity || 0);
        row.orders.push({ orderNumber: o.orderNumber, units: line.quantity });
        byItem.set(line.itemId, row);
      }
    }
    const items = [...byItem.values()].sort((a, b) => String(a.location).localeCompare(String(b.location), undefined, { numeric: true }));
    res.json({ success: true, data: { orders: orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, priority: o.priority })), items } });
  } catch (error) {
    next(error);
  }
});

async function packableOrder(id: number) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id }, include: packingInclude });
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (!(PACKABLE as readonly string[]).includes(order.status)) throw Object.assign(new Error(`This order is ${order.status.replace('_', ' ').toLowerCase()} and can't be packed`), { status: 409 });
  return order;
}

router.get('/orders/:id/packing', ...staff, async (req, res, next) => {
  try {
    const order = await prisma.deliveryOrder.findUnique({ where: { id: Number(req.params.id) }, include: packingInclude });
    if (!order) return bad(res, 'Order not found', 404);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

/** Scan an item or pack barcode into the parcel. */
router.post('/orders/:id/packing/scan', ...staff, async (req, res, next) => {
  try {
    const order = await packableOrder(Number(req.params.id));
    const code = String(req.body?.code || '').trim().toLowerCase();
    if (!code) return bad(res, 'Scan or type a barcode');

    // Serial-numbered items are packed one unit at a time by their serial number
    const serial = await prisma.itemSerial.findFirst({ where: { serialNumber: { equals: String(req.body.code).trim(), mode: 'insensitive' } } });
    if (serial) {
      const serialLine = (order.items as any[]).find((l) => l.itemId === serial.itemId && l.packedQuantity < l.quantity) || (order.items as any[]).find((l) => l.itemId === serial.itemId);
      if (!serialLine) return bad(res, 'That item is not in this order', 404);
      if (serial.status !== 'IN_STOCK') return bad(res, `Serial ${serial.serialNumber} is ${serial.status.toLowerCase().replace('_', ' ')}${serial.orderId ? ' on another order' : ''}`, 409);
      if (serialLine.packedQuantity >= serialLine.quantity) return bad(res, `Too many: ${serialLine.itemName} needs ${serialLine.quantity}`, 409);
      await prisma.$transaction([
        prisma.itemSerial.update({ where: { id: serial.id }, data: { status: 'RESERVED', orderId: order.id } }),
        prisma.orderItem.update({ where: { id: serialLine.id }, data: { packedQuantity: { increment: 1 }, serialNumbers: { push: serial.serialNumber } } }),
        ...(order.packingStatus === 'NOT_STARTED' ? [prisma.deliveryOrder.update({ where: { id: order.id }, data: { packingStatus: 'PICKING' } })] : []),
      ]);
      const fresh = await prisma.deliveryOrder.findUnique({ where: { id: order.id }, include: packingInclude });
      return res.json({ success: true, data: { order: fresh, line: `${serialLine.itemName} · ${serial.serialNumber}`, added: 1 } });
    }

    let units = Math.max(1, Math.round(Number(req.body?.quantity) || 1));
    let line = order.items.find((l) => l.packaging?.barcode?.toLowerCase() === code);
    if (line) units *= line.packaging!.unitsPerPack;
    else {
      const matches = (order.items as any[]).filter((l) => l.item.barcode?.toLowerCase() === code || l.item.code.toLowerCase() === code || l.item.legacyBarcodes.some((value: string) => value.toLowerCase() === code));
      line = matches.find((l) => l.packedQuantity < l.quantity) || matches[0];
      if (!line) {
        const pack = await prisma.itemPackaging.findFirst({ where: { barcode: String(req.body.code).trim() } });
        line = pack ? order.items.find((l) => l.itemId === pack.itemId) : undefined;
        if (line && pack) units *= pack.unitsPerPack;
      }
    }
    if (!line) return bad(res, 'That item is not in this order', 404);
    if ((line as any).item?.trackSerials) return bad(res, `${line.itemName} has serial numbers: scan the serial number of each unit`);
    if (line.packedQuantity + units > line.quantity) return bad(res, `Too many: ${line.itemName} needs ${line.quantity}, already packed ${line.packedQuantity}`, 409);
    await prisma.$transaction([
      prisma.orderItem.update({ where: { id: line.id }, data: { packedQuantity: { increment: units } } }),
      ...(order.packingStatus === 'NOT_STARTED' ? [prisma.deliveryOrder.update({ where: { id: order.id }, data: { packingStatus: 'PICKING' } })] : []),
    ]);
    const fresh = await prisma.deliveryOrder.findUnique({ where: { id: order.id }, include: packingInclude });
    res.json({ success: true, data: { order: fresh, line: line.itemName, added: units } });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

/** Set a line's packed quantity directly (e.g. no barcode on the item). */
router.put('/orders/:id/packing/lines/:lineId', ...staff, async (req, res, next) => {
  try {
    const order = await packableOrder(Number(req.params.id));
    const line = order.items.find((l) => l.id === Number(req.params.lineId));
    if (!line) return bad(res, 'Line not found', 404);
    const packed = Math.round(Number(req.body?.packedQuantity));
    if (!(packed >= 0) || packed > line.quantity) return bad(res, `Packed quantity must be between 0 and ${line.quantity}`);
    await prisma.$transaction([
      prisma.orderItem.update({ where: { id: line.id }, data: { packedQuantity: packed } }),
      ...(order.packingStatus !== 'PICKING' ? [prisma.deliveryOrder.update({ where: { id: order.id }, data: { packingStatus: 'PICKING', packedAt: null, packedById: null } })] : []),
    ]);
    res.json({ success: true, data: await prisma.deliveryOrder.findUnique({ where: { id: order.id }, include: packingInclude }) });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

/** Mark packed. Everything must be in the parcel unless `force` (admin) is given. */
router.post('/orders/:id/packing/complete', ...staff, async (req, res, next) => {
  try {
    const order = await packableOrder(Number(req.params.id));
    const short = order.items.filter((l) => l.packedQuantity < l.quantity);
    if (short.length && !(req.body?.force && req.user!.role === 'ADMIN')) {
      return bad(res, `Still missing: ${short.map((l) => `${l.itemName} (${l.quantity - l.packedQuantity})`).join(', ')}`, 409);
    }
    const missingSerials = (order.items as any[]).filter((l) => l.item?.trackSerials && (l.serialNumbers?.length || 0) < l.quantity);
    if (missingSerials.length) return bad(res, `Scan the serial numbers of: ${missingSerials.map((l) => l.itemName).join(', ')}`, 409);
    // Serials packed into this order are now sold
    await prisma.itemSerial.updateMany({ where: { orderId: order.id, status: 'RESERVED' }, data: { status: 'SOLD', soldAt: new Date() } });
    const updated = await prisma.deliveryOrder.update({
      where: { id: order.id },
      data: { packingStatus: 'PACKED', packedAt: new Date(), packedById: userId(req) },
      include: packingInclude,
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

router.post('/orders/:id/packing/reset', ...staff, async (req, res, next) => {
  try {
    const order = await packableOrder(Number(req.params.id));
    await prisma.$transaction([
      prisma.orderItem.updateMany({ where: { orderId: order.id }, data: { packedQuantity: 0, serialNumbers: [] } }),
      prisma.itemSerial.updateMany({ where: { orderId: order.id, status: { in: ['RESERVED', 'SOLD'] } }, data: { status: 'IN_STOCK', orderId: null, soldAt: null } }),
      prisma.deliveryOrder.update({ where: { id: order.id }, data: { packingStatus: 'NOT_STARTED', packedAt: null, packedById: null } }),
    ]);
    res.json({ success: true });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

// ===========================================================================
// Order import (Excel / CSV rows parsed in the browser)
// ===========================================================================

/**
 * One row per item. Rows with the same Reference (or, without one, the same
 * customer, phone and address) become one order.
 */
router.post('/orders/import', ...staff, async (req, res, next) => {
  try {
    const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 3000) : [];
    if (!rows.length) return bad(res, 'No rows to import');
    const groups = new Map<string, { rows: { row: any; line: number }[] }>();
    rows.forEach((row, i) => {
      const key = String(row.reference || '').trim() || [row.customerName, row.contactNumber, row.deliveryAddress].map((v) => String(v || '').trim().toLowerCase()).join('|');
      const group = groups.get(key) || { rows: [] };
      group.rows.push({ row, line: i + 2 });
      groups.set(key, group);
    });
    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];
    for (const { rows: group } of groups.values()) {
      const first = group[0].row;
      try {
        const name = String(first.customerName || '').trim();
        const account = name ? await accountForCustomer(name, { phone: first.contactNumber, address: first.deliveryAddress, email: first.customerEmail }) : null;
        const items = [];
        for (const { row, line } of group) {
          if (!row.itemCode) throw Object.assign(new OrderInputError(`Item code is missing`), { line });
          let packagingId: number | undefined;
          if (row.pack) {
            const pack = await prisma.itemPackaging.findFirst({
              where: { name: { equals: String(row.pack).trim(), mode: 'insensitive' }, item: { OR: [{ code: { equals: String(row.itemCode).trim(), mode: 'insensitive' } }, { barcode: String(row.itemCode).trim() }] } },
            });
            if (!pack) throw Object.assign(new OrderInputError(`Pack "${row.pack}" is not set up for ${row.itemCode}`), { line });
            packagingId = pack.id;
          }
          items.push({ code: String(row.itemCode), quantity: Number(row.quantity), unitPrice: row.unitPrice === '' ? undefined : row.unitPrice, packagingId });
        }
        const order = await createOrderRecord(
          {
            customerName: name, contactNumber: first.contactNumber ? String(first.contactNumber) : undefined, deliveryAddress: first.deliveryAddress,
            customerEmail: first.customerEmail || null, priority: first.priority, paymentMethod: first.paymentMethod ? String(first.paymentMethod).toUpperCase().replace(/\s+/g, '_') : undefined,
            scheduledDate: first.deliveryDate || null, deliveryInstructions: first.instructions || null, accountId: account?.id, items,
          },
          { createdBy: userId(req), source: 'IMPORT', trustPrices: true }
        );
        created.push(order.orderNumber);
      } catch (error: any) {
        if (error instanceof OrderInputError) errors.push({ row: (error as any).line || group[0].line, message: error.message });
        else throw error;
      }
    }
    res.json({ success: true, data: { created: created.length, orders: created, errors } });
  } catch (error) {
    next(error);
  }
});

export default router;
