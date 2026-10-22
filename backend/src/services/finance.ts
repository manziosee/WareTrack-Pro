import { prisma } from '../lib/prisma';
import { nextDocumentNumber } from '../lib/documentNumbers';

const DAY = 86400000;

/** Orders that create a debt once delivered (not cancelled, returned or refunded). */
const BILLABLE = ['DELIVERED'] as const;
/** Orders that are committed but not delivered yet (count towards credit exposure). */
const OPEN = ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] as const;

export const AGING_BUCKETS = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export function bucketFor(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return 'd1_30';
  if (daysOverdue <= 60) return 'd31_60';
  if (daysOverdue <= 90) return 'd61_90';
  return 'd90_plus';
}

const money = (v: unknown) => Math.round(Number(v || 0) * 100) / 100;

/** Successful payments per order. */
export async function paidByOrder(orderIds: number[]) {
  if (!orderIds.length) return new Map<number, number>();
  const rows = await prisma.payment.groupBy({
    by: ['orderId'],
    where: { orderId: { in: orderIds }, status: 'SUCCESSFUL' },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.orderId, money(r._sum.amount)]));
}

export interface OpenItem {
  orderId: number;
  orderNumber: string;
  date: Date;
  dueDate: Date;
  total: number;
  paid: number;
  outstanding: number;
  daysOverdue: number;
  bucket: AgingBucket;
}

/**
 * Everything an account owes: delivered orders not fully paid (with due date
 * and aging), plus open orders that are committed but not delivered yet.
 */
export async function accountPosition(accountId: number, termsDays: number) {
  const orders = await prisma.deliveryOrder.findMany({
    where: {
      accountId,
      status: { in: [...BILLABLE, ...OPEN] },
      paymentStatus: { notIn: ['PAID', 'REFUNDED'] },
    },
    select: { id: true, orderNumber: true, status: true, totalAmount: true, deliveredAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const paid = await paidByOrder(orders.map((o) => o.id));
  const now = Date.now();
  const items: OpenItem[] = [];
  let openOrders = 0;
  for (const o of orders) {
    const total = money(o.totalAmount);
    const outstanding = Math.max(0, money(total - (paid.get(o.id) || 0)));
    if (!outstanding) continue;
    if ((OPEN as readonly string[]).includes(o.status)) {
      openOrders += outstanding;
      continue;
    }
    const date = o.deliveredAt || o.createdAt;
    const dueDate = new Date(date.getTime() + termsDays * DAY);
    const daysOverdue = Math.floor((now - dueDate.getTime()) / DAY);
    items.push({ orderId: o.id, orderNumber: o.orderNumber, date, dueDate, total, paid: paid.get(o.id) || 0, outstanding, daysOverdue, bucket: bucketFor(daysOverdue) });
  }
  const aging = Object.fromEntries(AGING_BUCKETS.map((b) => [b, 0])) as Record<AgingBucket, number>;
  for (const i of items) aging[i.bucket] = money(aging[i.bucket] + i.outstanding);
  const balance = money(items.reduce((s, i) => s + i.outstanding, 0));
  const overdue = money(items.filter((i) => i.daysOverdue > 0).reduce((s, i) => s + i.outstanding, 0));
  return { items, aging, balance, overdue, openOrders: money(openOrders), exposure: money(balance + openOrders) };
}

/** Can this account take a new order of `amount` on credit? */
export async function creditCheck(accountId: number, amount: number) {
  const account = await prisma.customerAccount.findUnique({ where: { id: accountId } });
  if (!account) return { allowed: false, reason: 'Account not found' } as const;
  const position = await accountPosition(account.id, account.paymentTermsDays);
  const limit = money(account.creditLimit);
  const available = limit > 0 ? money(limit - position.exposure) : null;
  if (account.status === 'ON_HOLD') return { allowed: false, reason: `${account.name} is on hold: new credit orders are blocked`, limit, available, ...position } as const;
  if (account.status === 'CLOSED') return { allowed: false, reason: `${account.name}'s account is closed`, limit, available, ...position } as const;
  if (limit > 0 && position.exposure + amount > limit) {
    return {
      allowed: false,
      reason: `Over the credit limit: owes RWF ${position.exposure.toLocaleString()} of RWF ${limit.toLocaleString()}, this order is RWF ${amount.toLocaleString()}`,
      limit, available, ...position,
    } as const;
  }
  return { allowed: true, reason: null, limit, available, ...position } as const;
}

/** Mark an order PAID / PARTIAL from its successful payments (and its invoice). */
export async function refreshOrderPayment(orderId: number) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id: orderId }, select: { totalAmount: true, paymentStatus: true } });
  if (!order || order.paymentStatus === 'REFUNDED') return;
  const paid = (await paidByOrder([orderId])).get(orderId) || 0;
  const total = money(order.totalAmount);
  const status = paid >= total - 0.5 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
  if (status !== order.paymentStatus) {
    await prisma.deliveryOrder.update({ where: { id: orderId }, data: { paymentStatus: status } });
  }
  await prisma.invoice.updateMany({
    where: { orderId },
    data: status === 'PAID' ? { status: 'PAID', paidAt: new Date() } : { status: status === 'PARTIAL' ? 'PARTIAL' : 'UNPAID', paidAt: null },
  });
}

/**
 * Apply a payment from an account to its oldest unpaid delivered orders first.
 * Returns the payments created; refuses more than the account owes.
 */
export async function allocateAccountPayment(input: {
  accountId: number;
  amount: number;
  provider: string;
  reference?: string | null;
  note?: string | null;
  receivedById: number;
}) {
  const account = await prisma.customerAccount.findUnique({ where: { id: input.accountId } });
  if (!account) throw Object.assign(new Error('Account not found'), { status: 404 });
  const position = await accountPosition(account.id, account.paymentTermsDays);
  const amount = money(input.amount);
  if (amount <= 0) throw Object.assign(new Error('Amount must be more than 0'), { status: 400 });
  if (amount > position.balance + 0.5) {
    throw Object.assign(new Error(`${account.name} owes RWF ${position.balance.toLocaleString()} on delivered orders; the payment is larger than that`), { status: 400 });
  }
  let left = amount;
  const created = [];
  const now = new Date();
  for (const item of [...position.items].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    if (left <= 0) break;
    const part = money(Math.min(left, item.outstanding));
    const payment = await prisma.payment.create({
      data: {
        orderId: item.orderId, accountId: account.id, provider: input.provider, amount: part, status: 'SUCCESSFUL',
        externalRef: input.reference || null, message: input.note || null, completedAt: now, receivedById: input.receivedById,
      },
    });
    created.push({ ...payment, orderNumber: item.orderNumber });
    await refreshOrderPayment(item.orderId);
    left = money(left - part);
  }
  return created;
}

/** Next number like ACC-0007 / CH-000012 / EXP-000031 (unique across all companies). */
export async function nextNumber(model: 'customerAccount' | 'cashHandover' | 'expense', prefix: string, size: number) {
  const kind = model === 'customerAccount' ? 'account' : model === 'cashHandover' ? 'handover' : 'expense';
  return nextDocumentNumber(kind, prefix, size);
}

/** Create accounts for customer names used on orders and link those orders. */
export async function linkOrdersToAccounts() {
  const names = await prisma.deliveryOrder.groupBy({
    by: ['customerName'],
    where: { accountId: null },
    _max: { contactNumber: true, deliveryAddress: true, customerEmail: true },
  });
  let created = 0;
  let linked = 0;
  for (const n of names) {
    const name = n.customerName?.trim();
    if (!name) continue;
    let account = await prisma.customerAccount.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (!account) {
      account = await prisma.customerAccount.create({
        data: {
          accountNumber: await nextNumber('customerAccount', 'ACC', 4),
          name, phone: n._max.contactNumber, address: n._max.deliveryAddress, email: n._max.customerEmail,
        },
      });
      created += 1;
    }
    const res = await prisma.deliveryOrder.updateMany({ where: { accountId: null, customerName: n.customerName }, data: { accountId: account.id } });
    linked += res.count;
  }
  return { created, linked };
}
