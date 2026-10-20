import { linkOrdersToAccounts } from './finance';
import { reconcileFleet } from './fleetStatus';
import { prisma } from '../lib/prisma';
import { NotificationService } from './notificationService';
import { detectAnomalies } from './intelligence';
import { generateRestockOrders } from './restockService';
import { purgeExpiredOtps } from './otpStore';
import { runReport, METRICS, type ReportConfig } from './reportBuilder';
import { EmailService } from './emailService';
import { getTenantContext, runWithTenant } from '../lib/tenantContext';
import { captureError } from '../config/monitoring';
import { recordJobFailure, recordJobStart, recordJobSuccess } from './jobHealth';

/**
 * Background jobs. Everything is idempotent and de-duplicated, so restarts and
 * repeated runs never spam people.
 */

const MINUTE = 60000;
const DAY = 86400000;

/** Execute scheduled work under each active company/branch filter. */
async function forEachTenant(run: () => Promise<unknown>) {
  const companies = await prisma.company.findMany({ where: { active: true }, include: { branches: { where: { active: true }, select: { id: true } } } });
  for (const company of companies) {
    // Company-wide records (branch_id IS NULL) are handled once before the
    // branch passes. Branch passes then include their own rows plus shared reads.
    await runWithTenant({ companyId: company.id, branchId: null }, run);
    for (const branch of company.branches) await runWithTenant({ companyId: company.id, branchId: branch.id }, run);
  }
}

/** Create a notification unless the same title was raised in the last `withinMs`. */
async function notifyOnce(title: string, message: string, type: any, severity: any, withinMs = DAY) {
  const recent = await prisma.notification.findFirst({ where: { title, createdAt: { gte: new Date(Date.now() - withinMs) } }, select: { id: true } });
  if (recent) return false;
  await NotificationService.createNotification({ type, severity, title, message });
  return true;
}

/** Orders that will miss their delivery deadline soon. */
async function checkSlaRisk() {
  const soon = new Date(Date.now() + 2 * 3600000);
  const risky = await prisma.deliveryOrder.findMany({
    where: { status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] }, slaDeadline: { not: null, lte: soon, gte: new Date(Date.now() - DAY) } },
    select: { orderNumber: true, customerName: true, status: true, slaDeadline: true },
    take: 30,
  });
  for (const o of risky) {
    const late = o.slaDeadline! < new Date();
    await notifyOnce(
      `${late ? 'Late' : 'At risk'}: ${o.orderNumber}`,
      `${o.orderNumber} for ${o.customerName} is ${o.status.replace('_', ' ').toLowerCase()} and ${late ? 'has passed' : 'is close to'} its delivery deadline (${o.slaDeadline!.toLocaleString('en-GB', { timeZone: 'Africa/Kigali' })}).`,
      'SLA_RISK',
      late ? 'ERROR' : 'WARNING',
      12 * 3600000
    );
  }
}

async function checkAnomalies() {
  const anomalies = await detectAnomalies();
  for (const a of anomalies) await notifyOnce(a.title, a.message, 'ANOMALY', a.severity, 12 * 3600000);
}

async function runScheduledReports() {
  const tenant = getTenantContext();
  if (!tenant) return;
  const now = new Date();
  const reports = await prisma.savedReport.findMany({ where: { schedule: { not: 'NONE' }, branchId: tenant.branchId }, include: { user: { select: { email: true, name: true } } } });
  for (const r of reports) {
    const last = r.lastSentAt?.getTime() || 0;
    const due =
      (r.schedule === 'DAILY' && now.getTime() - last >= 23 * 3600000) ||
      (r.schedule === 'WEEKLY' && now.getDay() === 1 && now.getTime() - last >= 6 * DAY) ||
      (r.schedule === 'MONTHLY' && now.getDate() === 1 && now.getTime() - last >= 27 * DAY);
    if (!due) continue;

    const saved = r.config as unknown as ReportConfig & { rollingDays?: number };
    const days = saved.rollingDays || 7;
    const config = { ...saved, from: new Date(now.getTime() - days * DAY).toISOString(), to: now.toISOString() };
    const result = await runReport(config);
    const lines = result.rows.slice(0, 15).map((row) => result.columns.map((c) => `${row[c] ?? ''}`).join(' | '));
    const totals = Object.entries(result.totals).map(([k, v]) => `${k}: ${Number(v).toLocaleString()}`).join(' · ');
    const message = `${r.name} — last ${days} days\n\n${result.columns.join(' | ')}\n${lines.join('\n')}\n\nTotals: ${totals}\n\nOpen the Report Builder in WareTrack Pro for the full report.`;
    const recipients = [r.user.email, ...(r.recipients || '').split(',').map((s) => s.trim()).filter(Boolean)].slice(0, 10);
    for (const email of recipients) {
      await EmailService.sendEmail({ email, name: email === r.user.email ? r.user.name : 'there', title: `${r.name} (${r.schedule.toLowerCase()} report)`, message, actionPath: '/reports', actionLabel: 'Open Reports' });
    }
    await prisma.savedReport.update({ where: { id: r.id }, data: { lastSentAt: now } });
  }
  void METRICS;
}

/**
 * One-off clean-up: collapse piles of identical unread notifications (older
 * alert logic created thousands), keeping the newest of each.
 */
async function dedupeNotifications() {
  const tenant = getTenantContext();
  if (!tenant) return;
  const dupes: { title: string; message: string; keep: number; count: bigint }[] = await prisma.$queryRaw`
    SELECT title, message, MAX(id) AS keep, COUNT(*) AS count
    FROM notifications
    WHERE company_id = ${tenant.companyId} AND branch_id IS NOT DISTINCT FROM ${tenant.branchId}::int AND read = false
    GROUP BY title, message, user_id
    HAVING COUNT(*) > 1`;
  let removed = 0;
  for (const d of dupes) {
    const result = await prisma.notification.deleteMany({ where: { title: d.title, message: d.message, read: false, branchId: tenant.branchId, id: { not: Number(d.keep) } } });
    removed += result.count;
  }
  // Read notifications older than 90 days aren't useful
  const old = await prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: new Date(Date.now() - 90 * DAY) } } });
  if (removed || old.count) console.log(`🧹 Notifications tidied: ${removed} duplicates, ${old.count} old read`);
}

function safe(name: string, fn: () => Promise<unknown>) {
  return async () => {
    recordJobStart(name);
    try {
      await fn();
      recordJobSuccess(name);
    } catch (error: any) {
      recordJobFailure(name);
      console.error(`Job "${name}" failed:`, error?.message || error);
      captureError(error, { job: name });
    }
  };
}

let started = false;

export function startJobs() {
  if (started) return;
  started = true;

  const frequent = async () => {
    await safe('tenant jobs', () => forEachTenant(async () => {
      await checkSlaRisk();
      await checkAnomalies();
      await purgeExpiredOtps();
      await reconcileFleet();
    }))();
  };

  // Daily jobs run once per day around 06:00 Kigali time (UTC+2)
  let lastDaily = '';
  const daily = async () => {
    const kigali = new Date(Date.now() + 2 * 3600000);
    const key = kigali.toISOString().slice(0, 10);
    if (lastDaily === key || kigali.getUTCHours() < 6) return;
    lastDaily = key;
    if (process.env.AUTO_RESTOCK !== 'false') await safe('auto-restock', () => forEachTenant(() => generateRestockOrders()))();
  };

  setTimeout(safe('dedupe-notifications', () => forEachTenant(dedupeNotifications)), 20 * 1000);
  // First run after customer accounts were added: build them from existing orders
  setTimeout(safe('customer-accounts', async () => forEachTenant(async () => {
    if (await prisma.customerAccount.count()) return;
    const { created, linked } = await linkOrdersToAccounts();
    if (created) console.log(`🏢 Customer accounts created from orders: ${created} accounts, ${linked} orders linked`);
  })), 15 * 1000);
  setTimeout(safe('fleet-status', async () => forEachTenant(async () => {
    const { closedDispatches } = await reconcileFleet();
    if (closedDispatches) console.log(`🚚 Fleet status repaired: ${closedDispatches} stale dispatches closed`);
  })), 10 * 1000);
  setTimeout(frequent, 60 * 1000);
  setInterval(frequent, 15 * MINUTE);
  setInterval(daily, 15 * MINUTE);
  setInterval(safe('scheduled-reports', () => forEachTenant(runScheduledReports)), 60 * MINUTE);
  console.log('⏱️  Background jobs scheduled (SLA risk, anomalies, fleet status, restock, reports)');
}
