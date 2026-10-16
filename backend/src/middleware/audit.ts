import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Records every successful create/update/delete made through the API in the
 * audit log, so each record has a "who changed what and when" timeline.
 */

const ENTITY: Record<string, string> = {
  orders: 'Order',
  inventory: 'InventoryItem',
  'inventory-lookup': 'InventoryItem',
  vehicles: 'Vehicle',
  drivers: 'Driver',
  dispatch: 'Dispatch',
  users: 'User',
  warehouses: 'Warehouse',
  transfers: 'StockTransfer',
  suppliers: 'Supplier',
  'purchase-orders': 'PurchaseOrder',
  returns: 'ReturnRequest',
  payments: 'Payment',
  invoices: 'Invoice',
  webhooks: 'Webhook',
  settings: 'Settings',
  'saved-reports': 'SavedReport',
  'my-deliveries': 'Order',
  'auto-dispatch': 'Order',
  accounts: 'CustomerAccount',
  cash: 'CashHandover',
  expenses: 'Expense',
};

const LABEL: Record<string, string> = {
  Order: 'order', InventoryItem: 'inventory item', Vehicle: 'vehicle', Driver: 'driver', Dispatch: 'dispatch',
  User: 'user', Warehouse: 'warehouse', StockTransfer: 'stock transfer', Supplier: 'supplier',
  PurchaseOrder: 'purchase order', ReturnRequest: 'return', Payment: 'payment', Invoice: 'invoice',
  Webhook: 'webhook', Settings: 'settings', SavedReport: 'saved report',
  CustomerAccount: 'customer account', CashHandover: 'cash handover', Expense: 'expense',
};

const SENSITIVE = /password|otp|token|secret|signature|photo|code$/i;

function sanitize(body: unknown, depth = 0): unknown {
  if (body === null || typeof body !== 'object' || depth > 2) return body;
  if (Array.isArray(body)) return body.slice(0, 20).map((v) => sanitize(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE.test(k)) continue;
    if (typeof v === 'string' && v.length > 300) {
      out[k] = `${v.slice(0, 300)}…`;
      continue;
    }
    out[k] = sanitize(v, depth + 1);
  }
  return out;
}

const nameCache = new Map<number, { name: string; role: string; at: number }>();
async function userInfo(userId: number) {
  const cached = nameCache.get(userId);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } });
  const info = { name: user?.name || `User #${userId}`, role: user?.role || 'UNKNOWN', at: Date.now() };
  nameCache.set(userId, info);
  return info;
}

export function auditTrail(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  const path = req.originalUrl.split('?')[0];
  const parts = path.replace(/^\/api\/(v1\/)?/, '').split('/').filter(Boolean);
  const resource = parts[0];
  const entityType = ENTITY[resource];
  if (!entityType) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user?.userId) return;
    const idPart = parts.find((p, i) => i > 0 && /^\d+$/.test(p));
    const subAction = parts.slice(1).filter((p) => !/^\d+$/.test(p)).join(' ');
    const action = method === 'DELETE' ? 'DELETE' : method === 'POST' && !idPart && !subAction ? 'CREATE' : 'UPDATE';
    const verb = action === 'CREATE' ? 'Created' : action === 'DELETE' ? 'Deleted' : 'Updated';
    const body = (req.body || {}) as Record<string, unknown>;
    const ref = (body.orderNumber || body.name || body.plateNumber || body.code || body.email) as string | undefined;
    const detail = subAction ? ` (${subAction.replace(/-/g, ' ')})` : body.status ? ` → ${String(body.status).replace(/_/g, ' ').toLowerCase()}` : '';
    const summary = `${verb} ${LABEL[entityType]}${idPart ? ` #${idPart}` : ''}${ref ? ` ${ref}` : ''}${detail}`;

    const userId = Number(req.user.userId);
    userInfo(userId)
      .then((u) =>
        prisma.auditLog.create({
          data: {
            userId,
            userName: u.name,
            userRole: u.role,
            action,
            entityType,
            entityId: idPart || null,
            summary,
            changes: method === 'DELETE' ? undefined : (sanitize(body) as any),
            ipAddress: req.ip,
          },
        })
      )
      .catch((error) => console.error('Audit log write failed:', error?.message));
  });

  next();
}

/** Write an audit entry from inside a controller (e.g. sign-ins). */
export async function recordAudit(entry: {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  summary: string;
  ipAddress?: string;
}) {
  try {
    const u = entry.userId ? await userInfo(entry.userId) : null;
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        userName: u?.name ?? null,
        userRole: u?.role ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId != null ? String(entry.entityId) : null,
        summary: entry.summary,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error: any) {
    console.error('Audit log write failed:', error?.message);
  }
}
