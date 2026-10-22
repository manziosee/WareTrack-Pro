import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/emailService';
import { sendSummaryReports } from '../services/jobs';
import { buildSummary, periodRange, summaryPdf } from '../services/summaryReport';
import { createCompany, auth, type TestCompany } from './helpers/fixtures';

/** Daily, weekly and monthly PDF summaries emailed to managers. */
describe('Emailed PDF summaries', () => {
  let C: TestCompany;
  let send: jest.SpyInstance;
  beforeAll(async () => {
    C = await createCompany('Summary');
  });
  beforeEach(() => {
    send = jest.spyOn(EmailService, 'sendEmail').mockResolvedValue(true);
  });
  afterEach(() => send.mockRestore());

  it('periods are the finished day, Monday–Sunday week and calendar month in Kigali time', () => {
    const now = new Date('2026-10-22T08:00:00Z'); // Thursday 10:00 in Kigali
    expect(periodRange('day', now)).toEqual({ from: new Date('2026-10-20T22:00:00Z'), to: new Date('2026-10-21T22:00:00Z') });
    expect(periodRange('week', now)).toEqual({ from: new Date('2026-10-11T22:00:00Z'), to: new Date('2026-10-18T22:00:00Z') });
    expect(periodRange('month', now)).toEqual({ from: new Date('2026-08-31T22:00:00Z'), to: new Date('2026-09-30T22:00:00Z') });
  });

  it("counts yesterday's orders and money, and renders a PDF", async () => {
    const res = await request(app).post('/api/orders').set(auth(C)).send({
      customerName: 'Summary Shop', contactNumber: '+250788300300', deliveryAddress: 'Kigali', paymentMethod: 'CASH', items: [{ itemId: C.itemId, quantity: 4 }],
    });
    expect(res.status).toBe(201);
    const { from } = periodRange('day');
    const at = new Date(from.getTime() + 10 * 3600000);
    await prisma.deliveryOrder.update({ where: { id: res.body.data.id }, data: { status: 'DELIVERED', createdAt: at, deliveredAt: at, slaDeadline: new Date(at.getTime() + 3600000) } });
    await C.as(() => prisma.payment.create({ data: { orderId: res.body.data.id, provider: 'CASH', amount: 2000, status: 'SUCCESSFUL', completedAt: at } as any }));

    const summary = await C.as(() => buildSummary('day'));
    expect(summary.branch).toBe('Main');
    expect(summary.orders.created).toBe(1);
    expect(summary.orders.delivered).toBe(1);
    expect(summary.orders.onTimeRate).toBe(100);
    expect(summary.money.sales).toBe(2000);
    expect(summary.money.collectedBy).toEqual([{ provider: 'CASH', amount: 2000 }]);
    expect(summary.topItems[0]).toEqual({ name: 'Summary Water 500ml', quantity: 4 });

    const pdf = await summaryPdf(summary);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1500);
  });

  it('emails admins the weekly PDF on Monday, and people who asked for daily ones every day', async () => {
    await prisma.reportSettings.upsert({
      where: { userId: C.users.DISPATCH_OFFICER.id },
      update: { autoReportsEnabled: true, reportFrequency: 'daily', emailReports: true },
      create: { userId: C.users.DISPATCH_OFFICER.id, companyId: C.id, autoReportsEnabled: true, reportFrequency: 'daily', emailReports: true },
    });
    const monday = new Date('2026-10-19T06:00:00Z');
    const result = await C.as(() => sendSummaryReports(monday));
    expect(result.sent).toBe(2);
    const calls = send.mock.calls.map(([d]) => d);
    const admin = calls.find((d) => d.email === C.users.ADMIN.email);
    const dispatcher = calls.find((d) => d.email === C.users.DISPATCH_OFFICER.email);
    expect(admin.title).toBe('Weekly summary · Main');
    expect(admin.attachments[0].filename).toBe('waretrack-week-summary-2026-10-11.pdf');
    expect(admin.attachments[0].content.subarray(0, 5).toString()).toBe('%PDF-');
    expect(dispatcher.title).toBe('Daily summary · Main');
    // Warehouse staff did not ask for reports
    expect(calls.some((d) => d.email === C.users.WAREHOUSE_STAFF.email)).toBe(false);

    // Tuesday: only the daily one; an admin who switched email reports off gets nothing
    await prisma.reportSettings.create({ data: { userId: C.users.ADMIN.id, companyId: C.id, emailReports: false } });
    send.mockClear();
    expect((await C.as(() => sendSummaryReports(new Date('2026-10-20T06:00:00Z')))).sent).toBe(1);
    expect(send.mock.calls[0][0].email).toBe(C.users.DISPATCH_OFFICER.email);
    await prisma.reportSettings.deleteMany({ where: { userId: { in: [C.users.ADMIN.id, C.users.DISPATCH_OFFICER.id] } } });
  });

  it('managers can download the summary as JSON or PDF and email it to themselves', async () => {
    const json = await request(app).get('/api/reports/summary?period=week').set(auth(C));
    expect(json.status).toBe(200);
    expect(json.body.data.period).toBe('week');

    const pdf = await request(app).get('/api/reports/summary?period=month&format=pdf').set(auth(C, 'DISPATCH_OFFICER')).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    expect((await request(app).get('/api/reports/summary?period=year').set(auth(C))).status).toBe(400);
    expect((await request(app).get('/api/reports/summary').set(auth(C, 'DRIVER'))).status).toBe(403);

    const mailed = await request(app).post('/api/reports/summary/send').set(auth(C)).send({ period: 'day' });
    expect(mailed.status).toBe(200);
    expect(send.mock.calls[0][0].email).toBe(C.users.ADMIN.email);
    expect(send.mock.calls[0][0].attachments).toHaveLength(1);
  });
});
