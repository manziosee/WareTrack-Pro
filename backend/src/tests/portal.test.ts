import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createCompany, auth, type TestCompany } from './helpers/fixtures';

describe('Customer portal', () => {
  let C: TestCompany;
  let token: string;
  let orderId: number;
  const email = `buyer-${Date.now()}@shop.test`;

  beforeAll(async () => {
    C = await createCompany('Portal');
    const reg = await request(app).post('/api/features/customer/register').set('X-Company-Id', String(C.id))
      .send({ name: 'Buyer Shop', email, password: 'Passw0rd!', phone: '+250788300300', address: 'Kicukiro' });
    expect([200, 201]).toContain(reg.status);
    const login = await request(app).post('/api/features/customer/login').set('X-Company-Id', String(C.id)).send({ email, password: 'Passw0rd!' });
    token = login.body.data.token;
    expect(token).toBeTruthy();

    const account = await request(app).post('/api/accounts').set(auth(C)).send({ name: 'Buyer Shop', email, phone: '+250788300300', address: 'Kicukiro' });
    const order = await request(app).post('/api/orders').set(auth(C)).send({ accountId: account.body.data.id, customerName: 'Buyer Shop', contactNumber: '+250788300300', deliveryAddress: 'Kicukiro', paymentMethod: 'CREDIT', items: [{ itemId: C.itemId, quantity: 2 }] });
    orderId = order.body.data.id;
    await prisma.deliveryOrder.update({ where: { id: orderId }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
  });

  const asCustomer = { get Authorization() { return `Bearer ${token}`; } };

  it('shows the invoice of the customer’s own order', async () => {
    const res = await request(app).get(`/api/features/customer/orders/${orderId}/invoice`).set('Authorization', asCustomer.Authorization);
    expect(res.status).toBe(200);
    expect(Number(res.body.data.invoice.total)).toBe(1000);
  });

  it('shows the statement with the balance', async () => {
    const res = await request(app).get('/api/features/customer/statement').set('Authorization', asCustomer.Authorization);
    expect(res.status).toBe(200);
    expect(res.body.data[0].closing).toBe(1000);
  });

  it('asks for MoMo payment (not configured in tests → clear message)', async () => {
    const res = await request(app).post(`/api/features/customer/orders/${orderId}/pay`).set('Authorization', asCustomer.Authorization).send({ provider: 'MTN_MOMO' });
    expect(res.status).toBe(503);
    expect(res.body.error.message).toMatch(/not available yet/);
  });

  it('orders the same items again at today’s price list price', async () => {
    const me = await request(app).get('/api/features/customer/me').set('Authorization', asCustomer.Authorization);
    await prisma.deliveryOrder.update({ where: { id: orderId }, data: { customerId: me.body.data.id } });
    const list = await request(app).post('/api/price-lists').set(auth(C)).send({ name: 'Portal shops' });
    await request(app).put(`/api/price-lists/${list.body.data.id}/items`).set(auth(C)).send({ items: [{ itemId: C.itemId, price: 450 }] });
    const account = await prisma.deliveryOrder.findUnique({ where: { id: orderId }, select: { accountId: true } });
    await request(app).put(`/api/accounts/${account!.accountId}`).set(auth(C)).send({ priceListId: list.body.data.id });

    const res = await request(app).post(`/api/features/customer/reorder/${orderId}`).set('Authorization', asCustomer.Authorization);
    expect(res.status).toBe(200);
    expect(res.body.data.id).not.toBe(orderId);
    expect(Number(res.body.data.totalAmount)).toBe(900);
  });

  it('cannot see another customer’s order', async () => {
    const other = await request(app).post('/api/orders').set(auth(C)).send({ customerName: 'Someone Else', contactNumber: '+250788400400', deliveryAddress: 'Remera', items: [{ itemId: C.itemId, quantity: 1 }] });
    const res = await request(app).get(`/api/features/customer/orders/${other.body.data.id}/invoice`).set('Authorization', asCustomer.Authorization);
    expect(res.status).toBe(404);
  });
});
