import { prisma } from '../lib/prisma';
import { emitEvent } from './events';
import { creditCheck, nextNumber } from './finance';

/** A problem with the order the caller should show to the user (400/409). */
export class OrderInputError extends Error {
  constructor(message: string, public status = 400, public code = 'VALIDATION_ERROR', public details?: unknown) {
    super(message);
  }
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

/** Next ORD-###### number, safe even after orders are deleted. */
export async function nextOrderNumber() {
  const last = await prisma.deliveryOrder.findFirst({ orderBy: { id: 'desc' }, select: { orderNumber: true, id: true } });
  const fromLast = Number(String(last?.orderNumber || '').replace(/\D/g, '')) || 0;
  return `ORD-${String(Math.max(fromLast, last?.id || 0) + 1).padStart(6, '0')}`;
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

  // Resolve items (by id, or by code/barcode) and packs
  const lines: { itemId: number; itemName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number; stockUnits: number; packagingId: number | null; packQuantity: number | null }[] = [];
  const shortages: string[] = [];
  const need = new Map<number, number>();
  for (const raw of input.items) {
    const id = Number(raw.itemId || raw.inventoryId) || null;
    const code = raw.code ? String(raw.code).trim() : '';
    const item = id
      ? await prisma.inventoryItem.findUnique({ where: { id } })
      : code ? await prisma.inventoryItem.findFirst({ where: { OR: [{ code: { equals: code, mode: 'insensitive' } }, { barcode: code }] } }) : null;
    if (!item) throw new OrderInputError(`Item ${id || code || '(missing)'} was not found`, 400, 'ITEM_NOT_FOUND');
    if (item.status !== 'ACTIVE') throw new OrderInputError(`${item.name} is not active and can't be ordered`, 400, 'ITEM_INACTIVE');
    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new OrderInputError(`Quantity for ${item.name} must be more than 0`);

    let pack: { id: number; name: string; unitsPerPack: number; price: unknown } | null = null;
    if (raw.packagingId) {
      pack = await (prisma as any).itemPackaging?.findFirst?.({ where: { id: Number(raw.packagingId), itemId: item.id } }) ?? null;
      if (!pack) throw new OrderInputError(`That pack size isn't set up for ${item.name}`);
    }
    const stockUnits = pack ? quantity * pack.unitsPerPack : quantity;
    const listPrice = pack ? (Number(pack.price) || Number(item.unitPrice) * pack.unitsPerPack) : Number(item.unitPrice);
    const given = Number(raw.unitPrice ?? raw.price);
    const unitPrice = options.trustPrices && Number.isFinite(given) && given >= 0 ? given : listPrice;

    need.set(item.id, (need.get(item.id) || 0) + stockUnits);
    if ((need.get(item.id) || 0) > item.quantity) shortages.push(`${item.name} (${item.quantity} ${item.unit} in stock)`);
    lines.push({
      itemId: item.id,
      itemName: pack ? `${item.name} (${pack.name} × ${pack.unitsPerPack})` : item.name,
      quantity: stockUnits,
      unit: pack ? pack.name : raw.unit || item.unit,
      unitPrice: pack ? Math.round((unitPrice / pack.unitsPerPack) * 100) / 100 : unitPrice,
      totalPrice: Math.round(quantity * unitPrice * 100) / 100,
      stockUnits,
      packagingId: pack?.id ?? null,
      packQuantity: pack ? quantity : null,
    });
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
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryOrder.create({
      data: {
        orderNumber: await nextOrderNumber(),
        customerId: 1,
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
      await tx.inventoryItem.update({ where: { id: itemId }, data: { quantity: { decrement: units } } });
    }
    return created;
  });

  emitEvent('order.created', { id: order.id, orderNumber: order.orderNumber, customerName: order.customerName, totalAmount: Number(order.totalAmount), source: order.source });
  return order;
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
