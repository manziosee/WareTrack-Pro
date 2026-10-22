import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { getTenantContext } from '../lib/tenantContext';

/**
 * Management summary for one branch over a day or a week, as data and as a
 * one-page PDF that is emailed to managers.
 */

export type SummaryPeriod = 'day' | 'week' | 'month';
export const PERIOD_NAMES: Record<SummaryPeriod, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

const KIGALI_OFFSET = 2 * 3600000;
const DAY = 86400000;

export interface Summary {
  period: SummaryPeriod;
  branch: string;
  company: string;
  from: Date;
  to: Date;
  orders: { created: number; delivered: number; failed: number; cancelled: number; active: number; late: number; onTimeRate: number | null };
  money: { sales: number; collected: number; collectedBy: { provider: string; amount: number }[]; expenses: number; creditNotes: number };
  topItems: { name: string; quantity: number }[];
  lowStock: { name: string; code: string; quantity: number; minQuantity: number }[];
}

/** The finished period before `now` in Kigali time: yesterday, last Monday–Sunday, or last calendar month. */
export function periodRange(period: SummaryPeriod, now = new Date()) {
  const local = new Date(now.getTime() + KIGALI_OFFSET);
  local.setUTCHours(0, 0, 0, 0);
  if (period === 'month') {
    const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1);
    const end = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
    return { from: new Date(start - KIGALI_OFFSET), to: new Date(end - KIGALI_OFFSET) };
  }
  if (period === 'week') {
    // The full week before this Monday
    const sinceMonday = (local.getUTCDay() + 6) % 7;
    const from = new Date(local.getTime() - (sinceMonday + 7) * DAY - KIGALI_OFFSET);
    return { from, to: new Date(from.getTime() + 7 * DAY) };
  }
  // A daily report covers the day before
  const from = new Date(local.getTime() - DAY - KIGALI_OFFSET);
  return { from, to: new Date(from.getTime() + DAY) };
}

const num = (v: unknown) => Number(v || 0);

export async function buildSummary(period: SummaryPeriod, now = new Date()): Promise<Summary> {
  const tenant = getTenantContext();
  const { from, to } = periodRange(period, now);
  const range = { gte: from, lt: to };
  const [branch, company, created, delivered, failed, cancelled, active, late, deliveredOrders, payments, expenses, creditNotes, lowStock] = await Promise.all([
    tenant?.branchId ? prisma.branch.findUnique({ where: { id: tenant.branchId }, select: { name: true } }) : null,
    tenant ? prisma.company.findUnique({ where: { id: tenant.companyId }, select: { name: true } }) : null,
    prisma.deliveryOrder.count({ where: { createdAt: range } }),
    prisma.deliveryOrder.count({ where: { status: 'DELIVERED', deliveredAt: range } }),
    prisma.deliveryOrder.count({ where: { status: 'FAILED', updatedAt: range } }),
    prisma.deliveryOrder.count({ where: { status: 'CANCELLED', updatedAt: range } }),
    prisma.deliveryOrder.count({ where: { status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] } } }),
    prisma.deliveryOrder.count({ where: { status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] }, slaDeadline: { lt: to } } }),
    prisma.deliveryOrder.findMany({ where: { status: 'DELIVERED', deliveredAt: range }, select: { id: true, totalAmount: true, deliveredAt: true, slaDeadline: true } }),
    prisma.payment.groupBy({ by: ['provider'], where: { status: 'SUCCESSFUL', provider: { not: 'CREDIT_NOTE' }, completedAt: range }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { status: { not: 'REJECTED' }, createdAt: range }, _sum: { amount: true } }),
    prisma.creditNote.aggregate({ where: { status: { not: 'VOID' }, createdAt: range }, _sum: { amount: true } }),
    prisma.inventoryItem.findMany({
      where: { status: 'ACTIVE', quantity: { lte: prisma.inventoryItem.fields.minQuantity } },
      select: { name: true, code: true, quantity: true, minQuantity: true },
      orderBy: { quantity: 'asc' },
      take: 10,
    }),
  ]);

  const withDeadline = deliveredOrders.filter((o) => o.slaDeadline);
  const onTime = withDeadline.filter((o) => o.deliveredAt! <= o.slaDeadline!).length;
  const top = deliveredOrders.length
    ? await prisma.orderItem.groupBy({ by: ['itemName'], where: { orderId: { in: deliveredOrders.map((o) => o.id) } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 })
    : [];
  const collectedBy = payments.map((p) => ({ provider: p.provider, amount: num(p._sum.amount) })).sort((a, b) => b.amount - a.amount);

  return {
    period,
    branch: branch?.name || 'All branches',
    company: company?.name || 'WareTrack Pro',
    from,
    to,
    orders: { created, delivered, failed, cancelled, active, late, onTimeRate: withDeadline.length ? Math.round((onTime / withDeadline.length) * 100) : null },
    money: {
      sales: deliveredOrders.reduce((s, o) => s + num(o.totalAmount), 0),
      collected: collectedBy.reduce((s, p) => s + p.amount, 0),
      collectedBy,
      expenses: num(expenses._sum.amount),
      creditNotes: num(creditNotes._sum.amount),
    },
    topItems: top.map((t) => ({ name: t.itemName, quantity: num(t._sum.quantity) })),
    lowStock,
  };
}

const rwf = (v: number) => `RWF ${Math.round(v).toLocaleString('en-US')}`;
const kigaliDate = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Africa/Kigali', day: 'numeric', month: 'short', year: 'numeric' });

export function periodLabel(s: Summary) {
  return s.period === 'day' ? kigaliDate(s.from) : `${kigaliDate(s.from)} – ${kigaliDate(new Date(s.to.getTime() - 1))}`;
}

/** Short plain-text version for the email body. */
export function summaryText(s: Summary) {
  const rate = s.orders.onTimeRate === null ? 'no deadlines set' : `${s.orders.onTimeRate}% on time`;
  return [
    `${PERIOD_NAMES[s.period]} summary for ${s.branch}, ${periodLabel(s)}.`,
    '',
    `Orders: ${s.orders.created} created, ${s.orders.delivered} delivered (${rate}), ${s.orders.failed} failed. ${s.orders.active} still active, ${s.orders.late} late.`,
    `Money: ${rwf(s.money.sales)} delivered, ${rwf(s.money.collected)} collected, ${rwf(s.money.expenses)} expenses${s.money.creditNotes ? `, ${rwf(s.money.creditNotes)} credit notes` : ''}.`,
    `Stock: ${s.lowStock.length} item${s.lowStock.length === 1 ? '' : 's'} at or below minimum.`,
    '',
    'The full summary is attached as a PDF.',
  ].join('\n');
}

/** One-page PDF of the summary. */
export function summaryPdf(s: Summary): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${s.company} summary`, Author: 'WareTrack Pro' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brand = '#2F5778';
    const muted = '#6B7280';
    const width = doc.page.width - 96;

    doc.rect(0, 0, doc.page.width, 96).fill(brand);
    doc.fill('#FFFFFF').fontSize(10).text('WARETRACK PRO', 48, 28, { characterSpacing: 2 });
    doc.fontSize(20).font('Helvetica-Bold').text(`${PERIOD_NAMES[s.period]} summary · ${s.branch}`, 48, 44, { width });
    doc.font('Helvetica').fontSize(10).text(`${s.company} · ${periodLabel(s)}`, 48, 70);
    doc.fill('#1F2937');
    let y = 124;

    const tiles = (items: [string, string][]) => {
      const w = (width - 12 * (items.length - 1)) / items.length;
      items.forEach(([label, value], i) => {
        const x = 48 + i * (w + 12);
        doc.roundedRect(x, y, w, 58, 6).fill('#F6F8FB');
        doc.fill(muted).fontSize(9).text(label.toUpperCase(), x + 10, y + 10, { width: w - 20 });
        doc.fill('#1F2937').font('Helvetica-Bold').fontSize(16).text(value, x + 10, y + 26, { width: w - 20 });
        doc.font('Helvetica');
      });
      y += 72;
    };
    const heading = (text: string) => {
      doc.fill(brand).font('Helvetica-Bold').fontSize(12).text(text, 48, y);
      doc.font('Helvetica').fill('#1F2937');
      y += 20;
    };
    const table = (cols: string[], rows: string[][], widths: number[]) => {
      const row = (cells: string[], bold = false) => {
        let x = 48;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fill(bold ? muted : '#1F2937');
        cells.forEach((c, i) => {
          doc.text(c, x, y, { width: widths[i] - 8, align: i === 0 ? 'left' : 'right', lineBreak: false, ellipsis: true });
          x += widths[i];
        });
        y += 16;
        doc.moveTo(48, y - 3).lineTo(48 + width, y - 3).strokeColor('#EEF1F5').stroke();
      };
      row(cols, true);
      if (!rows.length) {
        doc.font('Helvetica').fill(muted).fontSize(10).text('Nothing to show.', 48, y);
        y += 16;
      }
      rows.forEach((r) => row(r));
      doc.font('Helvetica');
      y += 12;
    };

    heading('Orders');
    tiles([
      ['Created', String(s.orders.created)],
      ['Delivered', String(s.orders.delivered)],
      ['On time', s.orders.onTimeRate === null ? '—' : `${s.orders.onTimeRate}%`],
      ['Failed', String(s.orders.failed)],
    ]);
    tiles([
      ['Still active', String(s.orders.active)],
      ['Late now', String(s.orders.late)],
      ['Cancelled', String(s.orders.cancelled)],
    ]);

    heading('Money');
    tiles([
      ['Delivered sales', rwf(s.money.sales)],
      ['Collected', rwf(s.money.collected)],
      ['Expenses', rwf(s.money.expenses)],
    ]);
    if (s.money.collectedBy.length) table(['Collected by method', 'Amount'], s.money.collectedBy.map((p) => [p.provider.replace(/_/g, ' '), rwf(p.amount)]), [width * 0.6, width * 0.4]);
    if (s.money.creditNotes) {
      doc.fontSize(10).fill(muted).text(`Credit notes issued: ${rwf(s.money.creditNotes)}`, 48, y);
      y += 22;
    }

    heading('Best-selling items');
    table(['Item', 'Units delivered'], s.topItems.map((t) => [t.name, t.quantity.toLocaleString('en-US')]), [width * 0.7, width * 0.3]);

    heading('Low stock');
    table(['Item', 'Code', 'In stock', 'Minimum'], s.lowStock.map((i) => [i.name, i.code, String(i.quantity), String(i.minQuantity)]), [width * 0.4, width * 0.24, width * 0.18, width * 0.18]);

    doc.fill(muted).fontSize(8).text(`Generated by WareTrack Pro on ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kigali' })} (Kigali time).`, 48, doc.page.height - 60, { width, lineBreak: false });
    doc.end();
  });
}
