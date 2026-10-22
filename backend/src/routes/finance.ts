import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { FileInputError, storeDataUrl } from '../services/fileStorage';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import {
  accountPosition, allocateAccountPayment, creditCheck, linkOrdersToAccounts, nextNumber, paidByOrder, AGING_BUCKETS,
} from '../services/finance';

/**
 * Customer accounts and credit, driver cash reconciliation, expenses and
 * accounting exports. Mounted at /api.
 */
const router = Router();
const staff = [auth, authorizeRoles(...ROLES.orderManagers)];
const fleet = [auth, authorizeRoles(...ROLES.fleetManagers)];
const admin = [auth, authorizeRoles(...ROLES.admin)];

const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_ERROR', message } });
const money = (v: unknown) => Math.round(Number(v || 0) * 100) / 100;
const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const text = (v: unknown, max = 200) => (v === undefined ? undefined : v === null || v === '' ? null : String(v).trim().slice(0, max));
const KIGALI = 2 * 3600000;
const dayStart = (v: unknown, fallback: Date) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(new Date(`${v}T00:00:00Z`).getTime() - KIGALI) : fallback);
const dayEnd = (v: unknown, fallback: Date) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(new Date(`${v}T00:00:00Z`).getTime() - KIGALI + 86400000) : fallback);

async function ownDriver(req: Request) {
  return prisma.driver.findUnique({ where: { userId: Number(req.user!.userId) }, select: { id: true, name: true, currentVehicleId: true } });
}

// ===========================================================================
// Customer accounts
// ===========================================================================

function accountData(body: any) {
  return {
    name: text(body.name, 120) ?? undefined,
    contactName: text(body.contactName, 120),
    phone: text(body.phone, 40),
    email: text(body.email, 120),
    address: text(body.address, 240),
    tin: text(body.tin, 30),
    creditLimit: num(body.creditLimit) !== undefined ? Math.max(0, Number(body.creditLimit)) : undefined,
    paymentTermsDays: num(body.paymentTermsDays) !== undefined ? Math.max(0, Math.min(365, Math.round(Number(body.paymentTermsDays)))) : undefined,
    status: ['ACTIVE', 'ON_HOLD', 'CLOSED'].includes(body.status) ? body.status : undefined,
    notes: text(body.notes, 1000),
  };
}

/** All accounts with what they owe, what's overdue and how much credit is left. */
router.get('/accounts', ...staff, async (_req, res, next) => {
  try {
    const accounts = await prisma.customerAccount.findMany({ orderBy: { name: 'asc' } });
    const lastOrders = await prisma.deliveryOrder.groupBy({ by: ['accountId'], where: { accountId: { not: null } }, _max: { createdAt: true }, _count: { _all: true } });
    const last = new Map(lastOrders.map((o) => [o.accountId, o]));
    const rows = await Promise.all(accounts.map(async (a) => {
      const p = await accountPosition(a.id, a.paymentTermsDays);
      const limit = money(a.creditLimit);
      return {
        ...a,
        creditLimit: limit,
        balance: p.balance,
        overdue: p.overdue,
        openOrders: p.openOrders,
        exposure: p.exposure,
        available: limit > 0 ? money(limit - p.exposure) : null,
        aging: p.aging,
        orders: last.get(a.id)?._count._all || 0,
        lastOrderAt: last.get(a.id)?._max.createdAt || null,
      };
    }));
    const totals = {
      accounts: rows.length,
      receivable: money(rows.reduce((s, r) => s + r.balance, 0)),
      overdue: money(rows.reduce((s, r) => s + r.overdue, 0)),
      overLimit: rows.filter((r) => r.available !== null && r.available < 0).length,
      aging: Object.fromEntries(AGING_BUCKETS.map((b) => [b, money(rows.reduce((s, r) => s + r.aging[b], 0))])),
    };
    res.json({ success: true, data: rows, totals });
  } catch (error) {
    next(error);
  }
});

router.get('/accounts/:id', ...staff, async (req, res, next) => {
  try {
    const account = await prisma.customerAccount.findUnique({ where: { id: Number(req.params.id) } });
    if (!account) return bad(res, 'Account not found', 404);
    const [position, payments, orders, deliveredOrders] = await Promise.all([
      accountPosition(account.id, account.paymentTermsDays),
      prisma.payment.findMany({
        where: { order: { accountId: account.id }, status: 'SUCCESSFUL' },
        orderBy: { completedAt: 'desc' },
        take: 30,
        select: { id: true, amount: true, provider: true, externalRef: true, completedAt: true, createdAt: true, order: { select: { orderNumber: true } } },
      }),
      prisma.deliveryOrder.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, paymentMethod: true, totalAmount: true, createdAt: true, deliveredAt: true },
      }),
      prisma.deliveryOrder.findMany({
        where: { accountId: account.id, status: 'DELIVERED', paymentStatus: { not: 'REFUNDED' } },
        select: { totalAmount: true, expenses: { where: { status: 'APPROVED' }, select: { amount: true } }, items: { select: { quantity: true, itemId: true, totalPrice: true } } },
      }),
    ]);
    const soldItemIds = [...new Set(deliveredOrders.flatMap((o) => o.items.map((i) => i.itemId)))];
    const costRows = soldItemIds.length ? await prisma.purchaseOrderItem.groupBy({ by: ['itemId'], where: { itemId: { in: soldItemIds }, unitCost: { gt: 0 } }, _avg: { unitCost: true } }) : [];
    const unitCost = new Map(costRows.map((r) => [r.itemId, Number(r._avg.unitCost || 0)]));
    const profitability = deliveredOrders.reduce((sum, order) => {
      const revenue = Number(order.totalAmount);
      const cost = order.items.reduce((n, item) => n + Number(item.quantity) * (unitCost.get(item.itemId) || 0), 0);
      const deliveryCosts = order.expenses.reduce((n, expense) => n + Number(expense.amount), 0);
      return { revenue: sum.revenue + revenue, estimatedProductCost: sum.estimatedProductCost + cost, deliveryCosts: sum.deliveryCosts + deliveryCosts, estimatedMargin: sum.estimatedMargin + revenue - cost - deliveryCosts };
    }, { revenue: 0, estimatedProductCost: 0, deliveryCosts: 0, estimatedMargin: 0 });
    const limit = money(account.creditLimit);
    res.json({
      success: true,
      data: {
        account: { ...account, creditLimit: limit },
        position: { ...position, limit, available: limit > 0 ? money(limit - position.exposure) : null },
        payments,
        orders,
        profitability: Object.fromEntries(Object.entries(profitability).map(([key, value]) => [key, money(value)])),
      },
    });
  } catch (error) {
    next(error);
  }
});

/** Statement: opening balance, every delivered order (debit) and payment (credit), running balance. */
router.get('/accounts/:id/statement', ...staff, async (req, res, next) => {
  try {
    const account = await prisma.customerAccount.findUnique({ where: { id: Number(req.params.id) } });
    if (!account) return bad(res, 'Account not found', 404);
    const to = dayEnd(req.query.to, new Date());
    const from = dayStart(req.query.from, new Date(to.getTime() - 90 * 86400000));
    const [orders, payments] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where: { accountId: account.id, status: 'DELIVERED', paymentStatus: { not: 'REFUNDED' } },
        select: { id: true, orderNumber: true, totalAmount: true, deliveredAt: true, createdAt: true },
      }),
      prisma.payment.findMany({
        where: { order: { accountId: account.id, status: 'DELIVERED' }, status: 'SUCCESSFUL' },
        select: { id: true, amount: true, provider: true, externalRef: true, completedAt: true, createdAt: true, order: { select: { orderNumber: true } } },
      }),
    ]);
    const entries = [
      ...orders.map((o) => ({ date: o.deliveredAt || o.createdAt, kind: 'ORDER' as const, reference: o.orderNumber, description: `Delivery ${o.orderNumber}`, debit: money(o.totalAmount), credit: 0 })),
      ...payments.map((p) => ({ date: p.completedAt || p.createdAt, kind: 'PAYMENT' as const, reference: p.externalRef || `PAY-${p.id}`, description: `Payment (${p.provider.replace(/_/g, ' ').toLowerCase()}) for ${p.order.orderNumber}`, debit: 0, credit: money(p.amount) })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.kind === 'ORDER' ? -1 : 1));
    let opening = 0;
    const lines = [];
    let running = 0;
    for (const e of entries) {
      if (e.date < from) { opening = money(opening + e.debit - e.credit); continue; }
      if (e.date >= to) continue;
      if (!lines.length) running = opening;
      running = money(running + e.debit - e.credit);
      lines.push({ ...e, balance: running });
    }
    const closing = lines.length ? running : opening;
    res.json({
      success: true,
      data: {
        account,
        from: new Date(from.getTime() + KIGALI).toISOString().slice(0, 10),
        to: new Date(to.getTime() + KIGALI - 86400000).toISOString().slice(0, 10),
        opening, closing,
        totalDebit: money(lines.reduce((s, l) => s + l.debit, 0)),
        totalCredit: money(lines.reduce((s, l) => s + l.credit, 0)),
        lines,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/accounts/:id/credit-check', ...staff, async (req, res, next) => {
  try {
    res.json({ success: true, data: await creditCheck(Number(req.params.id), Number(req.query.amount) || 0) });
  } catch (error) {
    next(error);
  }
});

router.post('/accounts', ...staff, async (req, res, next) => {
  try {
    const data = accountData(req.body || {});
    if (!data.name || data.name.length < 2) return bad(res, 'Account name is required');
    const exists = await prisma.customerAccount.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } });
    if (exists) return bad(res, `An account named "${exists.name}" already exists (${exists.accountNumber})`, 409);
    const account = await prisma.customerAccount.create({
      data: { ...data, name: data.name, accountNumber: await nextNumber('customerAccount', 'ACC', 4) } as any,
    });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

router.put('/accounts/:id', ...staff, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = accountData(req.body || {});
    if (data.name !== undefined && (!data.name || data.name.length < 2)) return bad(res, 'Account name is required');
    if ((data.creditLimit !== undefined || data.paymentTermsDays !== undefined) && req.user!.role !== 'ADMIN') {
      return bad(res, 'Only an admin can change credit limits and payment terms', 403);
    }
    const account = await prisma.customerAccount.update({ where: { id }, data: data as any });
    res.json({ success: true, data: account });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Account not found', 404);
    next(error);
  }
});

router.delete('/accounts/:id', ...admin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const orders = await prisma.deliveryOrder.count({ where: { accountId: id } });
    if (orders) return bad(res, `This account has ${orders} orders. Close it instead of deleting it.`, 409);
    await prisma.customerAccount.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Account not found', 404);
    next(error);
  }
});

/** Receive money from an account; it pays the oldest delivered orders first. */
router.post('/accounts/:id/payments', ...staff, async (req, res, next) => {
  try {
    const { amount, provider = 'BANK_TRANSFER', reference, note } = req.body || {};
    if (!['CASH', 'BANK_TRANSFER', 'MTN_MOMO', 'AIRTEL_MONEY', 'CHEQUE', 'CARD'].includes(provider)) return bad(res, 'Unknown payment method');
    const payments = await allocateAccountPayment({
      accountId: Number(req.params.id), amount: Number(amount), provider, reference: text(reference, 80) || null, note: text(note, 200) || null,
      receivedById: Number(req.user!.userId),
    });
    res.status(201).json({ success: true, data: { payments, allocated: money(payments.reduce((s, p) => s + Number(p.amount), 0)) } });
  } catch (error: any) {
    if (error?.status) return bad(res, error.message, error.status);
    next(error);
  }
});

/** Create accounts from the customer names already on orders and link those orders. */
router.post('/accounts/link-orders', ...staff, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await linkOrdersToAccounts() });
  } catch (error) {
    next(error);
  }
});

/** Bulk import accounts (from Excel/CSV rows parsed in the browser). Existing names are updated. */
router.post('/accounts/import', ...staff, async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 2000) : [];
    if (!rows.length) return bad(res, 'No rows to import');
    let created = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];
    for (const [i, row] of rows.entries()) {
      const data = accountData(row);
      if (!data.name) { errors.push({ row: i + 2, message: 'Name is missing' }); continue; }
      if (req.user!.role !== 'ADMIN') { delete (data as any).creditLimit; delete (data as any).paymentTermsDays; }
      const existing = await prisma.customerAccount.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } });
      if (existing) {
        await prisma.customerAccount.update({ where: { id: existing.id }, data: data as any });
        updated += 1;
      } else {
        await prisma.customerAccount.create({ data: { ...data, name: data.name, accountNumber: await nextNumber('customerAccount', 'ACC', 4) } as any });
        created += 1;
      }
    }
    const linked = await linkOrdersToAccounts();
    res.json({ success: true, data: { created, updated, errors, ordersLinked: linked.linked } });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// Driver cash reconciliation
// ===========================================================================

/** Cash each driver is holding (collected on delivery, not handed in yet). */
router.get('/cash/drivers', ...staff, async (_req, res, next) => {
  try {
    const [drivers, pending, lastHandovers] = await Promise.all([
      prisma.driver.findMany({ select: { id: true, name: true, phone: true, status: true }, orderBy: { name: 'asc' } }),
      prisma.payment.groupBy({
        by: ['collectedByDriverId'],
        where: { provider: 'CASH', status: 'SUCCESSFUL', collectedByDriverId: { not: null }, handoverId: null },
        _sum: { amount: true },
        _count: { _all: true },
        _min: { completedAt: true },
      }),
      prisma.cashHandover.findMany({ orderBy: { createdAt: 'desc' }, distinct: ['driverId'], select: { driverId: true, createdAt: true, status: true, difference: true } }),
    ]);
    const byDriver = new Map(pending.map((p) => [p.collectedByDriverId, p]));
    const last = new Map(lastHandovers.map((h) => [h.driverId, h]));
    const rows = drivers.map((d) => {
      const p = byDriver.get(d.id);
      return {
        ...d,
        cashInHand: money(p?._sum.amount),
        deliveries: p?._count._all || 0,
        holdingSince: p?._min.completedAt || null,
        lastHandover: last.get(d.id) || null,
      };
    }).sort((a, b) => b.cashInHand - a.cashInHand || a.name.localeCompare(b.name));
    const since = new Date(Date.now() - 30 * 86400000);
    const recent = await prisma.cashHandover.aggregate({ where: { createdAt: { gte: since } }, _sum: { received: true, difference: true }, _count: { _all: true } });
    res.json({
      success: true,
      data: rows,
      totals: {
        cashInHand: money(rows.reduce((s, r) => s + r.cashInHand, 0)),
        driversHolding: rows.filter((r) => r.cashInHand > 0).length,
        handedIn30d: money(recent._sum.received),
        difference30d: money(recent._sum.difference),
        handovers30d: recent._count._all,
      },
    });
  } catch (error) {
    next(error);
  }
});

/** One driver's unreconciled cash payments and handover history. */
router.get('/cash/drivers/:driverId', ...staff, async (req, res, next) => {
  try {
    const driverId = Number(req.params.driverId);
    const [driver, payments, handovers] = await Promise.all([
      prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, name: true, phone: true } }),
      prisma.payment.findMany({
        where: { provider: 'CASH', status: 'SUCCESSFUL', collectedByDriverId: driverId, handoverId: null },
        orderBy: { completedAt: 'asc' },
        select: { id: true, amount: true, completedAt: true, order: { select: { id: true, orderNumber: true, customerName: true, totalAmount: true } } },
      }),
      prisma.cashHandover.findMany({ where: { driverId }, orderBy: { createdAt: 'desc' }, take: 20, include: { _count: { select: { payments: true } } } }),
    ]);
    if (!driver) return bad(res, 'Driver not found', 404);
    res.json({ success: true, data: { driver, payments, expected: money(payments.reduce((s, p) => s + Number(p.amount), 0)), handovers } });
  } catch (error) {
    next(error);
  }
});

/** Record cash handed in by a driver. Short or over amounts are flagged and admins are told. */
router.post('/cash/handovers', ...staff, async (req, res, next) => {
  try {
    const driverId = Number(req.body?.driverId);
    const received = money(req.body?.received);
    if (!driverId || !Number.isFinite(received) || received < 0) return bad(res, 'Driver and amount received are required');
    const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, name: true } });
    if (!driver) return bad(res, 'Driver not found', 404);
    const payments = await prisma.payment.findMany({
      where: { provider: 'CASH', status: 'SUCCESSFUL', collectedByDriverId: driverId, handoverId: null },
      select: { id: true, amount: true },
    });
    if (!payments.length && !received) return bad(res, `${driver.name} has no cash to hand in`);
    const expected = money(payments.reduce((s, p) => s + Number(p.amount), 0));
    const difference = money(received - expected);
    const status = Math.abs(difference) < 1 ? 'BALANCED' : difference < 0 ? 'SHORT' : 'OVER';
    const handover = await prisma.$transaction(async (tx) => {
      const h = await tx.cashHandover.create({
        data: {
          handoverNumber: await nextNumber('cashHandover', 'CH', 6), driverId, expected, received, difference, status,
          notes: text(req.body?.notes, 500) || null, receivedById: Number(req.user!.userId),
        },
      });
      if (payments.length) await tx.payment.updateMany({ where: { id: { in: payments.map((p) => p.id) } }, data: { handoverId: h.id } });
      return h;
    });
    if (status === 'SHORT') {
      NotificationService.createSystemAlert(
        `Cash short: ${driver.name}`,
        `${driver.name} handed in RWF ${received.toLocaleString()} but collected RWF ${expected.toLocaleString()} (short RWF ${Math.abs(difference).toLocaleString()}). Handover ${handover.handoverNumber}.`,
        'WARNING',
      ).catch(() => undefined);
    }
    res.status(201).json({ success: true, data: handover });
  } catch (error) {
    next(error);
  }
});

router.get('/cash/handovers', ...staff, async (req, res, next) => {
  try {
    const handovers = await prisma.cashHandover.findMany({
      where: req.query.driverId ? { driverId: Number(req.query.driverId) } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { driver: { select: { id: true, name: true } }, _count: { select: { payments: true } } },
    });
    const users = await prisma.user.findMany({ where: { id: { in: [...new Set(handovers.map((h) => h.receivedById))] } }, select: { id: true, name: true } });
    const names = new Map(users.map((u) => [u.id, u.name]));
    res.json({ success: true, data: handovers.map((h) => ({ ...h, receivedBy: names.get(h.receivedById) || null })) });
  } catch (error) {
    next(error);
  }
});

/** The signed-in driver's cash in hand and recent handovers. */
router.get('/my-cash', auth, authorizeRoles('DRIVER'), async (req, res, next) => {
  try {
    const driver = await ownDriver(req);
    if (!driver) return res.json({ success: true, data: { cashInHand: 0, payments: [], handovers: [] } });
    const [payments, handovers] = await Promise.all([
      prisma.payment.findMany({
        where: { provider: 'CASH', status: 'SUCCESSFUL', collectedByDriverId: driver.id, handoverId: null },
        orderBy: { completedAt: 'desc' },
        select: { id: true, amount: true, completedAt: true, order: { select: { orderNumber: true, customerName: true } } },
      }),
      prisma.cashHandover.findMany({ where: { driverId: driver.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    res.json({ success: true, data: { cashInHand: money(payments.reduce((s, p) => s + Number(p.amount), 0)), payments, handovers } });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// Expenses (fuel, tolls, repairs…)
// ===========================================================================

const EXPENSE_TYPES = ['FUEL', 'TOLL', 'PARKING', 'REPAIR', 'MAINTENANCE', 'OTHER'];
const expenseSelect = {
  id: true, expenseNumber: true, type: true, amount: true, liters: true, odometer: true, description: true, status: true,
  spentAt: true, createdAt: true, reviewedAt: true, reviewNote: true, createdById: true, vehicleId: true, driverId: true, orderId: true,
  vehicle: { select: { id: true, plateNumber: true } }, driver: { select: { id: true, name: true } }, order: { select: { id: true, orderNumber: true } },
} as const;

function expenseFilter(req: Request) {
  const to = dayEnd(req.query.to, new Date(Date.now() + 86400000));
  const from = dayStart(req.query.from, new Date(to.getTime() - 31 * 86400000));
  return {
    spentAt: { gte: from, lt: to },
    ...(req.query.status ? { status: String(req.query.status) } : {}),
    ...(req.query.type ? { type: String(req.query.type) } : {}),
    ...(req.query.vehicleId ? { vehicleId: Number(req.query.vehicleId) } : {}),
    ...(req.query.driverId ? { driverId: Number(req.query.driverId) } : {}),
  };
}

router.get('/expenses', auth, async (req, res, next) => {
  try {
    const where: any = expenseFilter(req);
    if (req.user!.role === 'DRIVER') {
      const driver = await ownDriver(req);
      where.driverId = driver?.id ?? -1;
    } else if (req.user!.role === 'WAREHOUSE_STAFF') {
      return bad(res, 'Not allowed', 403);
    }
    const [rows, receipts] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { spentAt: 'desc' }, take: 1000, select: expenseSelect }),
      prisma.expense.findMany({ where: { ...where, receiptPhoto: { not: null } }, select: { id: true } }),
    ]);
    const withReceipt = new Set(receipts.map((r) => r.id));
    const approved = rows.filter((r) => r.status !== 'REJECTED');
    const byType = Object.fromEntries(EXPENSE_TYPES.map((t) => [t, money(approved.filter((r) => r.type === t).reduce((s, r) => s + Number(r.amount), 0))]));
    const byVehicle = new Map<string, number>();
    for (const r of approved) {
      const key = r.vehicle?.plateNumber || 'No vehicle';
      byVehicle.set(key, money((byVehicle.get(key) || 0) + Number(r.amount)));
    }
    const deliveries = await prisma.deliveryOrder.count({ where: { status: 'DELIVERED', deliveredAt: where.spentAt } });
    const total = money(approved.reduce((s, r) => s + Number(r.amount), 0));
    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, amount: money(r.amount), liters: r.liters === null ? null : money(r.liters), hasReceipt: withReceipt.has(r.id) })),
      summary: {
        total,
        pending: money(rows.filter((r) => r.status === 'PENDING').reduce((s, r) => s + Number(r.amount), 0)),
        pendingCount: rows.filter((r) => r.status === 'PENDING').length,
        fuelLiters: money(approved.reduce((s, r) => s + Number(r.liters || 0), 0)),
        byType,
        byVehicle: [...byVehicle.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        deliveries,
        costPerDelivery: deliveries ? money(total / deliveries) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/expenses/:id', auth, async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: Number(req.params.id) }, select: { ...expenseSelect, receiptPhoto: true } });
    if (!expense) return bad(res, 'Expense not found', 404);
    if (req.user!.role === 'DRIVER') {
      const driver = await ownDriver(req);
      if (expense.driverId !== driver?.id) return bad(res, 'Expense not found', 404);
    }
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

router.post('/expenses', auth, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!EXPENSE_TYPES.includes(body.type)) return bad(res, `Type must be one of ${EXPENSE_TYPES.join(', ')}`);
    const amount = money(body.amount);
    if (!(amount > 0)) return bad(res, 'Amount must be more than 0');
    if (body.receiptPhoto && String(body.receiptPhoto).length > 2_000_000) return bad(res, 'Receipt photo is too large');
    let receiptRef: string | null = null;
    try {
      receiptRef = await storeDataUrl(body.receiptPhoto, 'receipt', { maxBytes: 1_500_000, createdById: Number(req.user!.userId) });
    } catch (error) {
      if (error instanceof FileInputError) return bad(res, error.message);
      throw error;
    }
    let driverId = num(body.driverId) ?? null;
    let vehicleId = num(body.vehicleId) ?? null;
    if (req.user!.role === 'DRIVER') {
      const driver = await ownDriver(req);
      if (!driver) return bad(res, 'No driver profile', 403);
      driverId = driver.id;
      vehicleId = vehicleId ?? driver.currentVehicleId ?? null;
    } else if (req.user!.role === 'WAREHOUSE_STAFF') {
      return bad(res, 'Not allowed', 403);
    }
    const expense = await prisma.expense.create({
      data: {
        expenseNumber: await nextNumber('expense', 'EXP', 6), type: body.type, amount,
        liters: num(body.liters) ?? null, odometer: num(body.odometer) !== undefined ? Math.round(Number(body.odometer)) : null,
        vehicleId, driverId, orderId: num(body.orderId) ?? null, description: text(body.description, 300) || null,
        receiptPhoto: receiptRef, spentAt: body.spentAt ? new Date(body.spentAt) : new Date(),
        createdById: Number(req.user!.userId),
        // Staff entries are approved straight away; driver entries wait for review
        status: req.user!.role === 'DRIVER' ? 'PENDING' : 'APPROVED',
        ...(req.user!.role !== 'DRIVER' && { reviewedById: Number(req.user!.userId), reviewedAt: new Date() }),
      },
      select: expenseSelect,
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

router.post('/expenses/:id/review', ...fleet, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '');
    if (!['APPROVED', 'REJECTED'].includes(status)) return bad(res, 'Status must be APPROVED or REJECTED');
    const expense = await prisma.expense.update({
      where: { id: Number(req.params.id) },
      data: { status, reviewNote: text(req.body?.note, 300) || null, reviewedById: Number(req.user!.userId), reviewedAt: new Date() },
      select: expenseSelect,
    });
    res.json({ success: true, data: expense });
  } catch (error: any) {
    if (error?.code === 'P2025') return bad(res, 'Expense not found', 404);
    next(error);
  }
});

router.delete('/expenses/:id', auth, async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: Number(req.params.id) } });
    if (!expense) return bad(res, 'Expense not found', 404);
    const own = expense.createdById === Number(req.user!.userId) && expense.status === 'PENDING';
    if (!own && req.user!.role !== 'ADMIN') return bad(res, 'Only pending expenses you added (or an admin) can be deleted', 403);
    await prisma.expense.delete({ where: { id: expense.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ===========================================================================
// Accounting export (CSV for QuickBooks, Odoo or the accountant)
// ===========================================================================

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(','))].join('\n');
};
const d = (date: Date | null | undefined) => (date ? new Date(date.getTime() + KIGALI).toISOString().slice(0, 10) : '');
const vatSplit = (gross: number, taxRate: number) => {
  const net = money(gross / (1 + taxRate));
  return { net, vat: money(gross - net) };
};

router.get('/accounting/export', ...admin, async (req, res, next) => {
  try {
    const type = String(req.query.type || 'sales');
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      select: { name: true, legalName: true, legalAddress: true, taxNumber: true, currency: true, taxRate: true, invoicePrefix: true },
    });
    if (!company) return bad(res, 'Company settings not found', 404);
    const taxRate = Number(company.taxRate);
    const taxLabel = company.taxNumber ? 'Tax' : 'VAT';
    const percent = (rate: number) => `${Math.round(rate * 10000) / 100}%`;
    const orderTaxRate = (invoice: { subtotal: unknown; tax: unknown } | null) =>
      invoice && Number(invoice.subtotal) > 0 ? Number(invoice.tax) / Number(invoice.subtotal) : taxRate;
    const to = dayEnd(req.query.to, new Date());
    const from = dayStart(req.query.from, new Date(to.getTime() - 31 * 86400000));
    let rows: Record<string, unknown>[] = [];

    if (type === 'sales' || type === 'quickbooks' || type === 'journal') {
      const orders = await prisma.deliveryOrder.findMany({
        where: { status: 'DELIVERED', deliveredAt: { gte: from, lt: to }, paymentStatus: { not: 'REFUNDED' } },
        orderBy: { deliveredAt: 'asc' },
        include: { items: true, account: true, invoice: true },
      });
      const paid = await paidByOrder(orders.map((o) => o.id));
      if (type === 'sales') {
        rows = orders.map((o) => {
          const gross = money(o.totalAmount);
            const rate = orderTaxRate(o.invoice);
            const { net, vat } = vatSplit(gross, rate);
          return {
            Date: d(o.deliveredAt), 'Invoice No': o.invoice?.invoiceNumber || `${company.invoicePrefix}-${String(o.id).padStart(6, '0')}`, 'Order No': o.orderNumber,
            Customer: o.account?.name || o.customerName, 'Account No': o.account?.accountNumber || '', TIN: o.account?.tin || '',
            [`Net (${company.currency})`]: net, [`${taxLabel} (${percent(rate)}, ${company.currency})`]: vat, [`Total (${company.currency})`]: gross, [`Paid (${company.currency})`]: paid.get(o.id) || 0,
            [`Balance (${company.currency})`]: money(gross - (paid.get(o.id) || 0)), 'Payment method': o.paymentMethod, Status: o.paymentStatus,
          };
        });
      } else if (type === 'quickbooks') {
        // QuickBooks Online "Import invoices" layout: one row per line item
        for (const o of orders) {
          const rate = orderTaxRate(o.invoice);
          const terms = o.account?.paymentTermsDays || 0;
          for (const item of o.items) {
            rows.push({
              InvoiceNo: o.invoice?.invoiceNumber || `${company.invoicePrefix}-${String(o.id).padStart(6, '0')}`, Customer: o.account?.name || o.customerName,
              InvoiceDate: d(o.deliveredAt), DueDate: d(new Date((o.deliveredAt || o.createdAt).getTime() + terms * 86400000)),
              Terms: terms ? `Net ${terms}` : 'Due on receipt', Location: '', Memo: o.orderNumber,
              'Item(Product/Service)': item.itemName, ItemDescription: `${item.quantity} ${item.unit}`, ItemQuantity: item.quantity,
              ItemRate: money(item.unitPrice), ItemAmount: money(item.totalPrice), ItemTaxCode: `${taxLabel} ${percent(rate)}`, ItemTaxAmount: vatSplit(money(item.totalPrice), rate).vat,
              Currency: company.currency,
            });
          }
        }
      } else {
        // Double-entry journal (Odoo / general ledger import)
        for (const o of orders) {
          const gross = money(o.totalAmount);
          const rate = orderTaxRate(o.invoice);
          const { net, vat } = vatSplit(gross, rate);
          const ref = o.invoice?.invoiceNumber || `${company.invoicePrefix}-${String(o.id).padStart(6, '0')}`;
          const partner = o.account?.name || o.customerName;
          rows.push({ Date: d(o.deliveredAt), Journal: 'Sales', Reference: ref, Account: 'Accounts Receivable', Partner: partner, Debit: gross, Credit: 0, Currency: company.currency, Label: `Delivery ${o.orderNumber}` });
          rows.push({ Date: d(o.deliveredAt), Journal: 'Sales', Reference: ref, Account: 'Sales', Partner: partner, Debit: 0, Credit: net, Currency: company.currency, Label: `Delivery ${o.orderNumber}` });
          rows.push({ Date: d(o.deliveredAt), Journal: 'Sales', Reference: ref, Account: 'Tax Payable', Partner: partner, Debit: 0, Credit: vat, Currency: company.currency, Label: `${taxLabel} ${percent(rate)}` });
        }
        const payments = await prisma.payment.findMany({
          where: { status: 'SUCCESSFUL', completedAt: { gte: from, lt: to } },
          include: { order: { select: { orderNumber: true, customerName: true, account: { select: { name: true } } } } },
        });
        for (const p of payments) {
          const partner = p.order.account?.name || p.order.customerName;
          const cashAccount = p.provider === 'CASH' ? 'Cash' : p.provider === 'MTN_MOMO' ? 'MTN MoMo' : p.provider === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Bank';
          rows.push({ Date: d(p.completedAt), Journal: 'Receipts', Reference: p.externalRef || `PAY-${p.id}`, Account: cashAccount, Partner: partner, Debit: money(p.amount), Credit: 0, Currency: company.currency, Label: `Payment ${p.order.orderNumber}` });
          rows.push({ Date: d(p.completedAt), Journal: 'Receipts', Reference: p.externalRef || `PAY-${p.id}`, Account: 'Accounts Receivable', Partner: partner, Debit: 0, Credit: money(p.amount), Currency: company.currency, Label: `Payment ${p.order.orderNumber}` });
        }
        const expenses = await prisma.expense.findMany({ where: { status: 'APPROVED', spentAt: { gte: from, lt: to } }, include: { vehicle: { select: { plateNumber: true } } } });
        for (const e of expenses) {
          const account = e.type === 'FUEL' ? 'Fuel' : e.type === 'REPAIR' || e.type === 'MAINTENANCE' ? 'Vehicle Repairs' : e.type === 'TOLL' || e.type === 'PARKING' ? 'Tolls and Parking' : 'Other Expenses';
          rows.push({ Date: d(e.spentAt), Journal: 'Expenses', Reference: e.expenseNumber, Account: account, Partner: e.vehicle?.plateNumber || '', Debit: money(e.amount), Credit: 0, Currency: company.currency, Label: e.description || e.type });
          rows.push({ Date: d(e.spentAt), Journal: 'Expenses', Reference: e.expenseNumber, Account: 'Cash', Partner: e.vehicle?.plateNumber || '', Debit: 0, Credit: money(e.amount), Currency: company.currency, Label: e.description || e.type });
        }
        rows.sort((a, b) => String(a.Date).localeCompare(String(b.Date)));
      }
    } else if (type === 'payments') {
      const payments = await prisma.payment.findMany({
        where: { status: 'SUCCESSFUL', completedAt: { gte: from, lt: to } },
        orderBy: { completedAt: 'asc' },
        include: { order: { select: { orderNumber: true, customerName: true, account: { select: { name: true, accountNumber: true } } } } },
      });
      rows = payments.map((p) => ({
        Date: d(p.completedAt), Receipt: `PAY-${p.id}`, 'Order No': p.order.orderNumber, Customer: p.order.account?.name || p.order.customerName,
        'Account No': p.order.account?.accountNumber || '', Method: p.provider, Reference: p.externalRef || '', [`Amount (${p.currency || company.currency})`]: money(p.amount),
      }));
    } else if (type === 'expenses') {
      const expenses = await prisma.expense.findMany({
        where: { spentAt: { gte: from, lt: to }, status: { not: 'REJECTED' } },
        orderBy: { spentAt: 'asc' },
        include: { vehicle: { select: { plateNumber: true } }, driver: { select: { name: true } } },
      });
      rows = expenses.map((e) => ({
        Date: d(e.spentAt), 'Expense No': e.expenseNumber, Type: e.type, Vehicle: e.vehicle?.plateNumber || '', Driver: e.driver?.name || '',
        Description: e.description || '', Liters: e.liters === null ? '' : money(e.liters), [`Amount (${company.currency})`]: money(e.amount), Status: e.status,
      }));
    } else if (type === 'receivables') {
      const accounts = await prisma.customerAccount.findMany({ orderBy: { name: 'asc' } });
      for (const a of accounts) {
        const p = await accountPosition(a.id, a.paymentTermsDays);
        if (!p.balance) continue;
        rows.push({
          'Account No': a.accountNumber, Customer: a.name, TIN: a.tin || '', Terms: a.paymentTermsDays ? `Net ${a.paymentTermsDays}` : 'Due on receipt',
          'Credit limit': money(a.creditLimit), Current: p.aging.current, '1-30 days': p.aging.d1_30, '31-60 days': p.aging.d31_60,
          '61-90 days': p.aging.d61_90, '90+ days': p.aging.d90_plus, 'Total owed': p.balance,
        });
      }
    } else {
      return bad(res, 'type must be sales, payments, expenses, receivables, quickbooks or journal');
    }

    const filename = `waretrack-${type}-${d(from)}-to-${d(new Date(to.getTime() - 86400000))}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + (toCsv(rows) || 'No records in this period'));
  } catch (error) {
    next(error);
  }
});

export default router;
