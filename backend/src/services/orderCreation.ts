import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getTenantContext } from '../lib/tenantContext';
import { priceLine } from './pricing';
import { nextDocumentNumber } from '../lib/documentNumbers';
import { emitEvent } from './events';
import { creditCheck, nextNumber } from './finance';
import { barcodeLookupOr } from '../lib/barcodeLookup';

/** A problem with the order the caller should show to the user (400/409). */
export class OrderInputError extends Error {
  constructor(message: string, public status = 400, public code = 'VALIDATION_ERROR', public details?: unknown) {
    super(message);
  }
}

/** Release an un-dispatched order's stock once, including legacy orders without reservation rows. */
export async function releasePendingOrderStock(tx: Prisma.TransactionClient, orderId: number, userId: number) {
  const order = await tx.deliveryOrder.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new OrderInputError('Order not found', 404, 'ORDER_NOT_FOUND');
  if (order.status !== 'PENDING') throw new OrderInputError('Only orders that have not been dispatched can release allocated stock. Create a return for delivered goods.', 409, 'ORDER_ALREADY_DISPATCHED');
  const reservations = await tx.stockReservation.findMany({ where: { orderId, status: 'RESERVED' } });
  const byItem = new Map<number, number>();
  for (const allocation of reservations.length ? reservations : order.items) byItem.set(allocation.itemId, (byItem.get(allocation.itemId) || 0) + allocation.quantity);
  const legacyWarehouse = (!reservations.length || reservations.some((reservation) => !reservation.warehouseId))
    ? await tx.warehouse.findFirst({ where: { active: true }, orderBy: { id: 'asc' }, select: { id: true } })
    : null;
  for (const reservation of reservations) {
    if (reservation.warehouseId) await tx.warehouseStock.update({
      where: { warehouseId_itemId: { warehouseId: reservation.warehouseId, itemId: reservation.itemId } },
      data: { quantity: { increment: reservation.quantity } },
    });
    else if (legacyWarehouse) await tx.warehouseStock.upsert({
      where: { warehouseId_itemId: { warehouseId: legacyWarehouse.id, itemId: reservation.itemId } },
      create: { warehouseId: legacyWarehouse.id, itemId: reservation.itemId, quantity: reservation.quantity },
      update: { quantity: { increment: reservation.quantity } },
    });
  }
  for (const [itemId, quantity] of byItem) {
    const item = await tx.inventoryItem.update({ where: { id: itemId }, data: { quantity: { increment: quantity }, lastUpdated: new Date() } });
    if (!reservations.length && legacyWarehouse) await tx.warehouseStock.upsert({
      where: { warehouseId_itemId: { warehouseId: legacyWarehouse.id, itemId } },
      create: { warehouseId: legacyWarehouse.id, itemId, quantity },
      update: { quantity: { increment: quantity } },
    });
    await tx.inventoryHistory.create({
      data: {
        itemId: item.id, action: 'reservation_release', quantity,
        previousQuantity: item.quantity - quantity, newQuantity: item.quantity,
        orderId, notes: `Released allocation for ${order.orderNumber}`, performedBy: userId,
      },
    });
  }
  if (reservations.length) {
    await tx.stockReservation.updateMany({
      where: { orderId, status: 'RESERVED' }, data: { status: 'RELEASED', releasedAt: new Date() },
    });
  }
  return order;
}

export interface NewOrderItem {
  itemId?: number | string;
  inventoryId?: number | string;
  /** Item code or barcode, used by imports and the order API */
  code?: string;
  quantity: number | string;
  unitPrice?: number | string;
  price?: number | string;
  unit?: string;
  /** Sell in packs (e.g. crate of 24): quantity is the number of packs */
  packagingId?: number | string | null;
}

export interface NewOrderInput {
  /** Existing customer portal customer record, when the caller is a customer. */
  customerId?: number | string;
  customerName?: string;
  contactNumber?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  deliveryAddress?: string;
  priority?: string;
  orderType?: string;
  paymentMethod?: string;
  scheduledDate?: string | Date | null;
  timeSlotStart?: string | Date | null;
  timeSlotEnd?: string | Date | null;
  deliveryInstructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accountId?: number | string | null;
  items: NewOrderItem[];
}

export interface CreateOptions {
  createdBy: number;
  source?: 'STAFF' | 'ONLINE' | 'API' | 'IMPORT';
  /** Admins may go over a customer's credit limit */
  allowOverCredit?: boolean;
  /** Use the given prices; otherwise the item's list price is used */
  trustPrices?: boolean;
}

async function withUniqueRetry<T>(run: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error: any) {
      const clash = error?.code === 'P2002' && String(error?.meta?.target || '').includes('order_number');
      if (!clash || attempt >= attempts) throw error;
    }
  }
}

/** Next ORD-###### number, unique across all companies so tracking links stay unambiguous. */
export async function nextOrderNumber() {
  return nextDocumentNumber('order', 'ORD', 6);
}

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

/**
 * Create an order: checks the customer, items and stock, applies credit rules
 * for orders on account, takes the stock and announces the new order.
 * Used by the Orders page, Excel import, the online order page and the API.
 */
export async function createOrderRecord(input: NewOrderInput, options: CreateOptions) {
  const account = input.accountId ? await prisma.customerAccount.findUnique({ where: { id: Number(input.accountId) } }) : null;
  if (input.accountId && !account) throw new OrderInputError('Customer account not found', 404, 'ACCOUNT_NOT_FOUND');

  const customerName = (input.customerName || account?.name || '').trim();
  const contactNumber = (input.contactNumber || input.customerPhone || account?.phone || '').trim();
  const deliveryAddress = (input.deliveryAddress || account?.address || '').trim();
  if (!customerName || !deliveryAddress || !contactNumber) {
    throw new OrderInputError('Customer name, delivery address and contact number are required');
  }
  if (!Array.isArray(input.items) || !input.items.length) throw new OrderInputError('At least one item is required');

  // Resolve items (by id, or by code/barcode) and packs, and price each line
  const tenant = getTenantContext();
  const company = tenant ? await prisma.company.findUnique({ where: { id: tenant.companyId }, select: { taxRate: true } }) : null;
  const companyTaxRate = company ? Number(company.taxRate) : 0.18;
  const lines: { itemId: number; itemName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; listPrice: number; discountAmount: number; vatRate: number; stockUnits: number; packagingId: number | null; packQuantity: number | null }[] = [];
  const shortages: string[] = [];
  const need = new Map<number, number>();
  const itemNames = new Map<number, { name: string; unit: string }>();
  for (const raw of input.items) {
    const id = Number(raw.itemId || raw.inventoryId) || null;
    const code = raw.code ? String(raw.code).trim() : '';
    const item = id
      ? await prisma.inventoryItem.findUnique({ where: { id } })
      : code ? await prisma.inventoryItem.findFirst({ where: { OR: barcodeLookupOr(code) } }) : null;
    if (!item) throw new OrderInputError(`Item ${id || code || '(missing)'} was not found`, 400, 'ITEM_NOT_FOUND');
    if (item.status !== 'ACTIVE') throw new OrderInputError(`${item.name} is not active and can't be ordered`, 400, 'ITEM_INACTIVE');
    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new OrderInputError(`Quantity for ${item.name} must be more than 0`);

    let pack: { id: number; name: string; unitsPerPack: number; price: unknown } | null = null;
    if (raw.packagingId) {
      pack = await prisma.itemPackaging.findFirst({ where: { id: Number(raw.packagingId), itemId: item.id } });
      if (!pack) throw new OrderInputError(`That pack size isn't set up for ${item.name}`);
    }
    const stockUnits = pack ? quantity * pack.unitsPerPack : quantity;
    // Customer price list, promotions and discount; staff may still type a price by hand
    const priced = await priceLine({ item, pack, quantity, account, companyTaxRate });
    const given = raw.unitPrice === undefined || raw.unitPrice === null || raw.unitPrice === '' ? NaN : Number(raw.unitPrice ?? raw.price);
    const unitPrice = options.trustPrices && Number.isFinite(given) && given >= 0 ? given : priced.unitPrice;
    const listPrice = priced.listPrice;

    need.set(item.id, (need.get(item.id) || 0) + stockUnits);
    itemNames.set(item.id, { name: item.name, unit: item.unit });
    lines.push({
      itemId: item.id,
      itemName: pack ? `${item.name} (${pack.name} × ${pack.unitsPerPack})` : item.name,
      quantity: stockUnits,
      unit: pack ? pack.name : raw.unit || item.unit,
      unitPrice: pack ? Math.round((unitPrice / pack.unitsPerPack) * 100) / 100 : unitPrice,
      totalPrice: Math.round(quantity * unitPrice * 100) / 100,
      listPrice: Math.round(quantity * listPrice * 100) / 100,
      discountAmount: Math.max(0, Math.round(quantity * (listPrice - unitPrice) * 100) / 100),
      vatRate: priced.vatRate,
      stockUnits,
      packagingId: pack?.id ?? null,
      packQuantity: pack ? quantity : null,
    });
  }
  const allocations = new Map<number, { warehouseId: number; quantity: number }[]>();
  for (const [itemId, required] of need) {
    const stocks = await prisma.warehouseStock.findMany({ where: { itemId, quantity: { gt: 0 } }, orderBy: { warehouseId: 'asc' } });
    let remaining = required;
    const itemAllocations: { warehouseId: number; quantity: number }[] = [];
    for (const stock of stocks) {
      if (!remaining) break;
      const allocated = Math.min(stock.quantity, remaining);
      if (allocated > 0) itemAllocations.push({ warehouseId: stock.warehouseId, quantity: allocated });
      remaining -= allocated;
    }
    if (remaining) {
      const available = required - remaining;
      const item = itemNames.get(itemId)!;
      shortages.push(`${item.name} (${available} ${item.unit} in this branch)`);
    }
    allocations.set(itemId, itemAllocations);
  }
  if (shortages.length) {
    throw new OrderInputError(`Not enough stock: ${[...new Set(shortages)].join(', ')}`, 409, 'INSUFFICIENT_STOCK');
  }
  const totalAmount = Math.round(lines.reduce((s, l) => s + l.totalPrice, 0) * 100) / 100;

  // Orders on credit must stay within the customer's limit
  const paymentMethod = (input.paymentMethod || 'CASH').toUpperCase();
  if (paymentMethod === 'CREDIT') {
    if (!account) throw new OrderInputError('Choose a customer account to sell on credit');
    const check = await creditCheck(account.id, totalAmount);
    if (!check.allowed && !options.allowOverCredit) {
      throw new OrderInputError(check.reason || 'Credit not allowed', 409, 'CREDIT_LIMIT', 'exposure' in check ? { limit: check.limit, exposure: check.exposure } : undefined);
    }
  }

  const priority = PRIORITIES.includes(String(input.priority || '').toUpperCase()) ? String(input.priority).toUpperCase() : 'MEDIUM';
  // Two orders created at the same instant could pick the same number: retry with the next one
  const order = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
    const created = await tx.deliveryOrder.create({
      data: {
        orderNumber: await nextOrderNumber(),
        customerId: Number(input.customerId) || 1,
        customerName,
        customerEmail: input.customerEmail || account?.email || null,
        deliveryAddress,
        contactNumber,
        priority: priority as any,
        status: 'PENDING',
        orderType: input.orderType || 'Delivery',
        paymentMethod,
        totalAmount,
        deliveryInstructions: input.deliveryInstructions || null,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        timeSlotStart: input.timeSlotStart ? new Date(input.timeSlotStart) : null,
        timeSlotEnd: input.timeSlotEnd ? new Date(input.timeSlotEnd) : null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        accountId: account?.id ?? null,
        source: options.source || 'STAFF',
        createdBy: options.createdBy,
        items: {
          create: lines.map(({ stockUnits, packagingId, packQuantity, ...l }) => ({
            ...l,
            ...(packagingId ? { packagingId, packQuantity } : {}),
          })) as any,
        },
      },
      include: { items: { include: { item: true } }, driver: true, vehicle: true, account: true },
    });
    for (const [itemId, units] of need) {
      const before = await tx.inventoryItem.findUnique({ where: { id: itemId }, select: { quantity: true, name: true } });
      const changed = await tx.inventoryItem.updateMany({
        where: { id: itemId, quantity: { gte: units } },
        data: { quantity: { decrement: units }, lastUpdated: new Date() },
      });
      if (!before || changed.count !== 1) {
        throw new OrderInputError(`${before?.name || 'An item'} no longer has enough stock. Refresh inventory and try again.`, 409, 'INSUFFICIENT_STOCK');
      }
      for (const allocation of allocations.get(itemId) || []) {
        const stock = await tx.warehouseStock.updateMany({
          where: { warehouseId: allocation.warehouseId, itemId, quantity: { gte: allocation.quantity } },
          data: { quantity: { decrement: allocation.quantity } },
        });
        if (stock.count !== 1) throw new OrderInputError(`${itemNames.get(itemId)?.name || 'An item'} stock changed in this branch. Refresh and try again.`, 409, 'INSUFFICIENT_STOCK');
        await tx.stockReservation.create({ data: { orderId: created.id, itemId, warehouseId: allocation.warehouseId, quantity: allocation.quantity, createdById: options.createdBy } });
      }
      // Take batches that expire first (FEFO) and note them on the order lines
      await allocateBatches(tx, created, itemId, units, (allocations.get(itemId) || []).map((a) => a.warehouseId));
      await tx.inventoryHistory.create({
        data: {
          itemId, action: 'order_allocation', quantity: units, previousQuantity: before.quantity,
          newQuantity: before.quantity - units, orderId: created.id, notes: `Allocated to ${created.orderNumber}`,
          performedBy: options.createdBy,
        },
      });
    }
    return tx.deliveryOrder.findUnique({ where: { id: created.id }, include: { items: { include: { item: true } }, driver: true, vehicle: true, account: true } }) as Promise<typeof created>;
  }));

  emitEvent('order.created', { id: order.id, orderNumber: order.orderNumber, customerName: order.customerName, totalAmount: Number(order.totalAmount), source: order.source });
  return order;
}

/**
 * Earliest-expiry-first: take `units` of an item from its batches (in the
 * warehouses the stock came from), and record which batches on the order lines.
 */
async function allocateBatches(tx: any, order: { id: number; items: { id: number; itemId: number; quantity: number }[] }, itemId: number, units: number, warehouseIds: number[]) {
  const batches = await tx.inventoryBatch.findMany({
    where: { itemId, quantity: { gt: 0 }, ...(warehouseIds.length ? { OR: [{ warehouseId: { in: warehouseIds } }, { warehouseId: null }] } : {}) },
    orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { receivedAt: 'asc' }],
  });
  if (!batches.length) return;
  const taken: { batchId: number; batchNumber: string; expiryDate: Date | null; quantity: number }[] = [];
  let remaining = units;
  for (const batch of batches) {
    if (!remaining) break;
    const take = Math.min(batch.quantity, remaining);
    const changed = await tx.inventoryBatch.updateMany({ where: { id: batch.id, quantity: { gte: take } }, data: { quantity: { decrement: take } } });
    if (changed.count !== 1) continue;
    taken.push({ batchId: batch.id, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, quantity: take });
    remaining -= take;
  }
  // Split the batches over the item's lines in order
  let pool = taken.map((t) => ({ ...t }));
  for (const line of order.items.filter((l) => l.itemId === itemId)) {
    let need = line.quantity;
    const forLine: typeof taken = [];
    for (const t of pool) {
      if (!need || !t.quantity) continue;
      const q = Math.min(t.quantity, need);
      forLine.push({ ...t, quantity: q });
      t.quantity -= q;
      need -= q;
    }
    pool = pool.filter((t) => t.quantity > 0);
    if (forLine.length) await tx.orderItem.update({ where: { id: line.id }, data: { batchAllocations: forLine as any } });
  }
}

/** Find or create the account for a customer name (used by imports and online orders). */
export async function accountForCustomer(name: string, details: { phone?: string | null; address?: string | null; email?: string | null }) {
  const clean = name.trim();
  if (!clean) return null;
  const existing = await prisma.customerAccount.findFirst({ where: { name: { equals: clean, mode: 'insensitive' } } });
  if (existing) return existing;
  return prisma.customerAccount.create({
    data: {
      accountNumber: await nextNumber('customerAccount', 'ACC', 4),
      name: clean, phone: details.phone || null, address: details.address || null, email: details.email || null,
    },
  });
}
