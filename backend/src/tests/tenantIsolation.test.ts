import request from 'supertest';
import { Prisma } from '@prisma/client';
import { app } from '../app';
import { prisma, COMPANY_SCOPED_MODELS, BRANCH_SCOPED_MODELS, SHARED_MODELS } from '../lib/prisma';
import { createCompany, auth, type TestCompany } from './helpers/fixtures';

/**
 * Two companies use the system side by side. Nothing one of them owns may be
 * visible to, or changeable by, the other.
 */
describe('Company data separation', () => {
  let A: TestCompany;
  let B: TestCompany;
  let orderA: { id: number; orderNumber: string };
  let accountA: number;

  beforeAll(async () => {
    A = await createCompany('Alpha');
    B = await createCompany('Bravo');
    const res = await request(app).post('/api/orders').set(auth(A)).send({
      customerName: 'Alpha Secret Shop', contactNumber: '+250788111111', deliveryAddress: 'Kigali', paymentMethod: 'CASH',
      items: [{ itemId: A.itemId, quantity: 2 }],
    });
    expect(res.status).toBe(201);
    orderA = res.body.data;
    accountA = res.body.data.accountId;
  });

  it('every table with a companyId is either scoped or deliberately shared', () => {
    const withCompany = Prisma.dmmf.datamodel.models.filter((m) => m.fields.some((f) => f.name === 'companyId')).map((m) => m.name);
    const unprotected = withCompany.filter((m) => !COMPANY_SCOPED_MODELS.has(m) && !SHARED_MODELS.has(m));
    expect(unprotected).toEqual([]);
  });

  it('every branch-scoped table has a branchId column', () => {
    const missing = [...BRANCH_SCOPED_MODELS].filter((name) => !Prisma.dmmf.datamodel.models.find((m) => m.name === name)?.fields.some((f) => f.name === 'branchId'));
    expect(missing).toEqual([]);
  });

  it('new rows get the company of the person creating them', async () => {
    const order = await prisma.deliveryOrder.findUnique({ where: { id: orderA.id } });
    expect(order?.companyId).toBe(A.id);
    expect(order?.branchId).toBe(A.branchId);
    const account = await prisma.customerAccount.findUnique({ where: { id: accountA } });
    expect(account?.companyId).toBe(A.id);
  });

  const lists: [string, (body: any) => any[]][] = [
    ['/api/orders', (b) => b.data],
    ['/api/inventory', (b) => b.data],
    ['/api/drivers', (b) => b.data],
    ['/api/vehicles', (b) => b.data],
    ['/api/accounts', (b) => b.data],
    ['/api/dispatch/orders', (b) => b.data],
    ['/api/inventory/categories', (b) => b.data],
  ];
  it.each(lists)('%s never lists the other company’s records', async (url, pick) => {
    const res = await request(app).get(url).set(auth(B));
    expect(res.status).toBe(200);
    const text = JSON.stringify(pick(res.body));
    expect(text).not.toContain('Alpha');
  });

  it('counts and reports only include your own company', async () => {
    const res = await request(app).get('/api/reports/analytics').set(auth(B));
    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalOrders).toBe(0);
  });

  it('cannot open another company’s records by id', async () => {
    for (const url of [`/api/orders/${orderA.id}`, `/api/inventory/${A.itemId}`, `/api/accounts/${accountA}`, `/api/drivers/${A.driverId}`, `/api/vehicles/${A.vehicleId}`]) {
      const res = await request(app).get(url).set(auth(B));
      expect([403, 404]).toContain(res.status);
      expect(JSON.stringify(res.body)).not.toContain('Alpha');
    }
  });

  it('cannot change or delete another company’s records', async () => {
    const tries = [
      request(app).post(`/api/orders/${orderA.id}/status`).set(auth(B)).send({ status: 'CANCELLED' }),
      request(app).put(`/api/inventory/${A.itemId}`).set(auth(B)).send({ quantity: 0 }),
      request(app).delete(`/api/inventory/${A.itemId}`).set(auth(B)),
      request(app).put(`/api/accounts/${accountA}`).set(auth(B)).send({ name: 'Hacked' }),
      request(app).put(`/api/drivers/${A.driverId}`).set(auth(B)).send({ phone: '000' }),
    ];
    for (const res of await Promise.all(tries)) expect([400, 403, 404, 409]).toContain(res.status);
    const order = await prisma.deliveryOrder.findUnique({ where: { id: orderA.id } });
    const item = await prisma.inventoryItem.findUnique({ where: { id: A.itemId } });
    const account = await prisma.customerAccount.findUnique({ where: { id: accountA } });
    expect(order?.status).toBe('PENDING');
    expect(item?.quantity).toBe(498);
    expect(account?.name).toBe('Alpha Secret Shop');
  });

  it('cannot use another company’s item in an order', async () => {
    const res = await request(app).post('/api/orders').set(auth(B)).send({
      customerName: 'Bravo Shop', contactNumber: '+250788222222', deliveryAddress: 'Kigali', items: [{ itemId: A.itemId, quantity: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('cannot switch into a company you are not a member of', async () => {
    const res = await request(app).get('/api/orders').set(auth(B)).set('X-Company-Id', String(A.id));
    expect(res.status).toBe(403);
  });

  it('document numbers stay unique across companies', async () => {
    const res = await request(app).post('/api/orders').set(auth(B)).send({
      customerName: 'Bravo Shop', contactNumber: '+250788222222', deliveryAddress: 'Kigali', items: [{ itemId: B.itemId, quantity: 1 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).not.toBe(orderA.orderNumber);
  });

  it('public tracking finds the order in the right company', async () => {
    const res = await request(app).get(`/api/public/track/${orderA.orderNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.data.orderNumber).toBe(orderA.orderNumber);
  });

  it('raw SQL without a company filter is refused inside a company', async () => {
    await expect(B.as(() => prisma.$queryRaw`SELECT id FROM delivery_orders`)).rejects.toThrow(/company_id/);
    const own = await B.as(() => prisma.$queryRaw<{ id: number }[]>`SELECT id FROM delivery_orders WHERE company_id = ${B.id}`);
    expect(own.every((r) => r.id !== orderA.id)).toBe(true);
  });

  it('creating company data without a company is refused', async () => {
    await expect(prisma.customerAccount.create({ data: { accountNumber: `X-${Date.now()}`, name: 'Orphan' } })).rejects.toThrow(/without a company/);
  });
});
