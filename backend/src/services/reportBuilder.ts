import { prisma } from '../lib/prisma';

/**
 * Flexible report engine: choose metrics, a grouping and a date range; get rows
 * back. Used by the Report Builder page and scheduled email reports.
 */

export const METRICS = {
  orders: 'Orders',
  delivered: 'Delivered orders',
  revenue: 'Revenue (RWF)',
  avgOrderValue: 'Average order value (RWF)',
  onTimeRate: 'On-time rate (%)',
  failed: 'Failed deliveries',
  units: 'Units shipped',
} as const;

export const GROUPS = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  status: 'Order status',
  priority: 'Priority',
  customer: 'Customer',
  area: 'Area',
  driver: 'Driver',
  product: 'Product',
  category: 'Product category',
  paymentMethod: 'Payment method',
  warehouse: 'Warehouse',
} as const;

export type Metric = keyof typeof METRICS;
export type Group = keyof typeof GROUPS;

export interface ReportConfig {
  metrics: Metric[];
  groupBy: Group;
  from: string;
  to: string;
  status?: string[];
  priority?: string[];
  limit?: number;
}

const DAY = 86400000;

function bucket(date: Date, by: Group) {
  const d = new Date(date);
  if (by === 'day') return d.toISOString().slice(0, 10);
  if (by === 'month') return d.toISOString().slice(0, 7);
  // ISO week starting Monday
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `Week of ${d.toISOString().slice(0, 10)}`;
}

export function validateConfig(input: any): ReportConfig | string {
  const metrics = (Array.isArray(input?.metrics) ? input.metrics : []).filter((m: string) => m in METRICS);
  if (!metrics.length) return 'Choose at least one metric';
  if (!(input?.groupBy in GROUPS)) return 'Choose how to group the report';
  const from = new Date(input?.from);
  const to = new Date(input?.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return 'Choose a valid date range';
  if (to.getTime() - from.getTime() > 400 * DAY) return 'The date range can be at most about 13 months';
  return {
    metrics, groupBy: input.groupBy, from: from.toISOString(), to: to.toISOString(),
    status: Array.isArray(input.status) ? input.status : undefined,
    priority: Array.isArray(input.priority) ? input.priority : undefined,
    limit: Math.min(Number(input.limit) || 50, 500),
  };
}

export async function runReport(config: ReportConfig) {
  const toEnd = new Date(config.to);
  toEnd.setHours(23, 59, 59, 999);
  const orders = await prisma.deliveryOrder.findMany({
    where: {
      createdAt: { gte: new Date(config.from), lte: toEnd },
      ...(config.status?.length && { status: { in: config.status as any } }),
      ...(config.priority?.length && { priority: { in: config.priority as any } }),
    },
    select: {
      status: true, priority: true, customerName: true, deliveryAddress: true, totalAmount: true, createdAt: true,
      deliveredAt: true, slaDeadline: true, paymentMethod: true,
      driver: { select: { name: true } },
      warehouse: { select: { name: true } },
      items: { select: { itemName: true, quantity: true, totalPrice: true, item: { select: { category: true } } } },
    },
  });

  // Product-level groupings work on order lines; everything else on orders
  const lineLevel = config.groupBy === 'product' || config.groupBy === 'category';
  type Row = { key: string; orders: Set<number>; delivered: number; revenue: number; onTime: number; failed: number; units: number };
  const rows = new Map<string, Row>();
  const get = (key: string) => {
    let r = rows.get(key);
    if (!r) {
      r = { key, orders: new Set(), delivered: 0, revenue: 0, onTime: 0, failed: 0, units: 0 };
      rows.set(key, r);
    }
    return r;
  };

  orders.forEach((o, idx) => {
    const delivered = o.status === 'DELIVERED';
    const onTime = delivered && o.deliveredAt && (!o.slaDeadline || o.deliveredAt <= o.slaDeadline);
    if (lineLevel) {
      for (const line of o.items) {
        const key = config.groupBy === 'product' ? line.itemName : line.item?.category || 'Uncategorised';
        const r = get(key);
        r.orders.add(idx);
        if (o.status !== 'CANCELLED') r.units += line.quantity;
        if (delivered) {
          r.revenue += Number(line.totalPrice);
          r.delivered++;
          if (onTime) r.onTime++;
        }
        if (o.status === 'FAILED') r.failed++;
      }
      return;
    }
    let key: string;
    switch (config.groupBy) {
      case 'day': case 'week': case 'month': key = bucket(o.createdAt, config.groupBy); break;
      case 'status': key = o.status; break;
      case 'priority': key = o.priority; break;
      case 'customer': key = o.customerName; break;
      case 'area': { const p = o.deliveryAddress.split(',').map((x) => x.trim()); key = p.length >= 2 ? p[p.length - 2] : p[0]; break; }
      case 'driver': key = o.driver?.name || 'Unassigned'; break;
      case 'paymentMethod': key = o.paymentMethod || 'Unknown'; break;
      case 'warehouse': key = o.warehouse?.name || 'Unassigned'; break;
      default: key = 'All';
    }
    const r = get(key);
    r.orders.add(idx);
    if (o.status !== 'CANCELLED') r.units += o.items.reduce((s, i) => s + i.quantity, 0);
    if (delivered) {
      r.delivered++;
      r.revenue += Number(o.totalAmount);
      if (onTime) r.onTime++;
    }
    if (o.status === 'FAILED') r.failed++;
  });

  const timeGroup = ['day', 'week', 'month'].includes(config.groupBy);
  const result = Array.from(rows.values()).map((r) => {
    const out: Record<string, string | number> = { [GROUPS[config.groupBy]]: r.key };
    for (const m of config.metrics) {
      if (m === 'orders') out[METRICS.orders] = r.orders.size;
      if (m === 'delivered') out[METRICS.delivered] = r.delivered;
      if (m === 'revenue') out[METRICS.revenue] = Math.round(r.revenue);
      if (m === 'avgOrderValue') out[METRICS.avgOrderValue] = r.delivered ? Math.round(r.revenue / r.delivered) : 0;
      if (m === 'onTimeRate') out[METRICS.onTimeRate] = r.delivered ? Math.round((r.onTime / r.delivered) * 1000) / 10 : 0;
      if (m === 'failed') out[METRICS.failed] = r.failed;
      if (m === 'units') out[METRICS.units] = r.units;
    }
    return out;
  });

  const label = GROUPS[config.groupBy];
  const sortKey = METRICS[config.metrics[0]];
  result.sort((a, b) => (timeGroup ? String(a[label]).localeCompare(String(b[label])) : Number(b[sortKey]) - Number(a[sortKey])));

  const totals: Record<string, number> = {};
  for (const m of config.metrics) {
    const col = METRICS[m];
    if (m === 'onTimeRate' || m === 'avgOrderValue') continue;
    totals[col] = result.reduce((s, r) => s + Number(r[col] || 0), 0);
  }
  const allDelivered = orders.filter((o) => o.status === 'DELIVERED');
  if (config.metrics.includes('onTimeRate')) {
    totals[METRICS.onTimeRate] = allDelivered.length
      ? Math.round((allDelivered.filter((o) => o.deliveredAt && (!o.slaDeadline || o.deliveredAt <= o.slaDeadline)).length / allDelivered.length) * 1000) / 10
      : 0;
  }
  if (config.metrics.includes('avgOrderValue')) {
    totals[METRICS.avgOrderValue] = allDelivered.length ? Math.round(allDelivered.reduce((s, o) => s + Number(o.totalAmount), 0) / allDelivered.length) : 0;
  }

  return { columns: [label, ...config.metrics.map((m) => METRICS[m])], rows: result.slice(0, config.limit || 50), totals, orderCount: orders.length };
}
