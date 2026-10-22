import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';
import { generateSecret, otpauthUrl, verifyTotp } from '../services/totp';
import { EVENT_TYPES, signPayload } from '../services/events';
import { METRICS, GROUPS, validateConfig, runReport } from '../services/reportBuilder';
import { channels } from '../services/messaging';
import { providerConfigured } from '../services/payments';
import { EmailService } from '../services/emailService';
import axios from 'axios';
import { createSafeWebhookAgents, isSafeWebhookUrl } from '../utils/webhookSecurity';

/** Two-factor sign-in, webhooks, report builder and integration status. Mounted at /api. */
const router = Router();
const admin = [auth, authorizeRoles(...ROLES.admin)];
const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message } });

// ---------------------------------------------------------------------------
// Two-factor authentication (authenticator app)
// ---------------------------------------------------------------------------

router.get('/auth/2fa', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.user!.userId) }, select: { twoFactorEnabled: true } });
    res.json({ success: true, data: { enabled: Boolean(user?.twoFactorEnabled) } });
  } catch (error) {
    next(error);
  }
});

/** Step 1: create a secret and show the QR code. Not active until confirmed. */
router.post('/auth/2fa/setup', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.user!.userId) } });
    if (!user) return bad(res, 'User not found', 404);
    if (user.twoFactorEnabled) return bad(res, 'Two-factor sign-in is already on');
    const secret = generateSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    res.json({ success: true, data: { secret, otpauthUrl: otpauthUrl(secret, user.email) } });
  } catch (error) {
    next(error);
  }
});

/** Step 2: confirm with a code from the app to switch it on. */
router.post('/auth/2fa/enable', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.user!.userId) } });
    if (!user?.totpSecret) return bad(res, 'Start the setup first');
    if (!verifyTotp(user.totpSecret, String(req.body?.code || ''))) return bad(res, 'That code is not valid. Check the time on your phone and try again.');
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    res.json({ success: true, data: { enabled: true } });
  } catch (error) {
    next(error);
  }
});

/** Turn it off; requires the account password. */
router.post('/auth/2fa/disable', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.user!.userId) } });
    if (!user) return bad(res, 'User not found', 404);
    if (!(await bcrypt.compare(String(req.body?.password || ''), user.password))) return bad(res, 'Password is not correct');
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, totpSecret: null } });
    res.json({ success: true, data: { enabled: false } });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Webhooks (admin)
// ---------------------------------------------------------------------------

router.get('/webhooks/events', ...admin, (_req, res) => res.json({ success: true, data: EVENT_TYPES }));

router.get('/webhooks', ...admin, async (_req, res, next) => {
  try {
    const hooks = await prisma.webhook.findMany({ orderBy: { createdAt: 'desc' } });
    // Only show the end of each secret
    res.json({ success: true, data: hooks.map((h) => ({ ...h, secret: `••••${h.secret.slice(-4)}` })) });
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks', ...admin, async (req, res, next) => {
  try {
    const { url, events, description } = req.body || {};
    if (!(await isSafeWebhookUrl(url))) return bad(res, 'Enter an HTTPS webhook URL that resolves to a public server');
    const list = (Array.isArray(events) ? events : []).filter((e: string) => (EVENT_TYPES as readonly string[]).includes(e));
    if (!list.length) return bad(res, 'Choose at least one event');
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const hook = await prisma.webhook.create({ data: { url, events: list, description, secret, createdBy: Number(req.user!.userId) } });
    // The full secret is shown once, at creation
    res.status(201).json({ success: true, data: hook });
  } catch (error) {
    next(error);
  }
});

router.put('/webhooks/:id', ...admin, async (req, res, next) => {
  try {
    const { url, events, description, active } = req.body || {};
    if (url !== undefined && !(await isSafeWebhookUrl(url))) return bad(res, 'Enter an HTTPS webhook URL that resolves to a public server');
    const hook = await prisma.webhook.update({
      where: { id: Number(req.params.id) },
      data: {
        url, description, active,
        events: Array.isArray(events) ? events.filter((e: string) => (EVENT_TYPES as readonly string[]).includes(e)) : undefined,
      },
    });
    res.json({ success: true, data: { ...hook, secret: `••••${hook.secret.slice(-4)}` } });
  } catch (error) {
    next(error);
  }
});

router.delete('/webhooks/:id', ...admin, async (req, res, next) => {
  try {
    await prisma.webhook.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** Send a test event so the receiver can be checked. */
router.post('/webhooks/:id/test', ...admin, async (req, res, next) => {
  try {
    const hook = await prisma.webhook.findUnique({ where: { id: Number(req.params.id) } });
    if (!hook) return bad(res, 'Webhook not found', 404);
    const event = { id: crypto.randomUUID(), type: 'webhook.test', createdAt: new Date().toISOString(), data: { message: 'Hello from WareTrack Pro' } };
    const body = JSON.stringify(event);
    let status = 0;
    try {
      if (!(await isSafeWebhookUrl(hook.url))) throw new Error('Webhook URL is no longer safe');
      const r = await axios.post(hook.url, body, {
        timeout: 8000, maxRedirects: 0, ...createSafeWebhookAgents(), validateStatus: () => true,
        headers: { 'Content-Type': 'application/json', 'X-WareTrack-Event': event.type, 'X-WareTrack-Signature': `sha256=${signPayload(hook.secret, body)}` },
      });
      status = r.status;
    } catch {
      status = 0;
    }
    await prisma.webhook.update({ where: { id: hook.id }, data: { lastStatus: status, lastDeliveredAt: new Date() } });
    res.json({ success: true, data: { status, ok: status >= 200 && status < 300 } });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Report builder
// ---------------------------------------------------------------------------

const reportStaff = [auth, authorizeRoles('ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER')];

router.get('/report-builder/options', ...reportStaff, (_req, res) => {
  res.json({ success: true, data: { metrics: METRICS, groups: GROUPS } });
});

router.post('/report-builder/run', ...reportStaff, async (req, res, next) => {
  try {
    const config = validateConfig(req.body);
    if (typeof config === 'string') return bad(res, config);
    res.json({ success: true, data: await runReport(config), config });
  } catch (error) {
    next(error);
  }
});

router.get('/saved-reports', ...reportStaff, async (req, res, next) => {
  try {
    const reports = await prisma.savedReport.findMany({ where: { userId: Number(req.user!.userId) }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
});

router.post('/saved-reports', ...reportStaff, async (req, res, next) => {
  try {
    const { name, config, schedule = 'NONE', recipients } = req.body || {};
    if (!name) return bad(res, 'Give the report a name');
    const valid = validateConfig(config);
    if (typeof valid === 'string') return bad(res, valid);
    if (!['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'].includes(schedule)) return bad(res, 'schedule must be NONE, DAILY, WEEKLY or MONTHLY');
    // Scheduled reports cover a rolling window ending today, so store its length
    const days = Math.max(1, Math.round((new Date(valid.to).getTime() - new Date(valid.from).getTime()) / 86400000));
    const report = await prisma.savedReport.create({
      data: { userId: Number(req.user!.userId), name: String(name).slice(0, 80), config: { ...valid, rollingDays: days } as any, schedule, recipients: recipients ? String(recipients).slice(0, 500) : null },
    });
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.delete('/saved-reports/:id', ...reportStaff, async (req, res, next) => {
  try {
    const result = await prisma.savedReport.deleteMany({ where: { id: Number(req.params.id), userId: Number(req.user!.userId) } });
    if (!result.count) return bad(res, 'Report not found', 404);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Integration status (admin settings)
// ---------------------------------------------------------------------------

router.get('/integrations', ...admin, (_req, res) => {
  res.json({
    success: true,
    data: {
      email: { provider: EmailService.provider(), configured: EmailService.provider() !== 'none' },
      sms: { provider: "Africa's Talking", configured: channels.sms() },
      whatsapp: { provider: 'WhatsApp Cloud API', configured: channels.whatsapp() },
      mtnMomo: { provider: 'MTN Mobile Money', configured: providerConfigured('MTN_MOMO') },
      airtelMoney: { provider: 'Airtel Money', configured: providerConfigured('AIRTEL_MONEY') },
      monitoring: { provider: 'Sentry', configured: Boolean(process.env.SENTRY_DSN) },
    },
  });
});

export default router;
