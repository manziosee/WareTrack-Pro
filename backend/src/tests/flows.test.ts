import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createCompany, auth, type TestCompany } from './helpers/fixtures';

const SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** The main paths money and stock take through the system. */
describe('Business flows', () => {
  let C: TestCompany;

  beforeAll(async () => {
    C = await createCompany('Flow');
  });

  const newOrder = async (body: Record<string, unknown> = {}) => {
    const res = await request(app).post('/api/orders').set(auth(C)).send({
      customerName: 'Ineza Clinic', contactNumber: '+250788123456', deliveryAddress: 'KG 7 Ave, Kigali', paymentMethod: 'CASH',
      items: [{ itemId: C.itemId, quantity: 4 }], ...body,
    });
    expect(res.status).toBe(201);
    return res.body.data;
  };

  it('order → dispatch → delivered with cash → handover → paid; driver and vehicle freed', async () => {
    const order = await newOrder();
    expect(Number(order.totalAmount)).toBe(2000);

    const dispatch = await request(app).post('/api/dispatch').set(auth(C)).send({ orderId: order.id, driverId: C.driverId, vehicleId: C.vehicleId, scheduledDate: new Date().toISOString() });
    expect(dispatch.status).toBe(201);
    expect((await prisma.driver.findUnique({ where: { id: C.driverId } }))?.status).toBe('ON_DUTY');
    expect((await prisma.vehicle.findUnique({ where: { id: C.vehicleId } }))?.status).toBe('IN_USE');

    const driverAuth = auth(C, 'DRIVER');
    expect((await request(app).post(`/api/my-deliveries/${order.id}/start`).set(driverAuth)).status).toBe(200);

    const item = await prisma.inventoryItem.findUnique({ where: { id: C.itemId } });
    const code = item!.barcode || item!.code;
    const done = await request(app).post(`/api/my-deliveries/${order.id}/complete`).set(driverAuth).send({
      recipientName: 'Aline', signatureData: SIGNATURE, cashCollected: 2000,
      deliveredItems: [{ itemId: C.itemId, scannedQuantity: 4, deliveredQuantity: 4, verified: true, scannedCode: code }],
    });
    expect(done.status).toBe(200);

    const delivered = await prisma.deliveryOrder.findUnique({ where: { id: order.id } });
    expect(delivered?.status).toBe('DELIVERED');
    expect(delivered?.paymentStatus).toBe('PAID');
    expect((await prisma.driver.findUnique({ where: { id: C.driverId } }))?.status).toBe('AVAILABLE');
    expect((await prisma.vehicle.findUnique({ where: { id: C.vehicleId } }))?.status).toBe('AVAILABLE');

    const myCash = await request(app).get('/api/my-cash').set(driverAuth);
    expect(myCash.body.data.cashInHand).toBe(2000);

    const handover = await request(app).post('/api/cash/handovers').set(auth(C)).send({ driverId: C.driverId, received: 1500, notes: 'short' });
    expect(handover.status).toBe(201);
    expect(handover.body.data.status).toBe('SHORT');
    expect(Number(handover.body.data.difference)).toBe(-500);
    expect((await request(app).get('/api/my-cash').set(driverAuth)).body.data.cashInHand).toBe(0);
  });

  it('a driver cannot be set Available while still on a delivery', async () => {
    const order = await newOrder();
    await request(app).post('/api/dispatch').set(auth(C)).send({ orderId: order.id, driverId: C.driverId, vehicleId: C.vehicleId, scheduledDate: new Date().toISOString() });
    const res = await request(app).put(`/api/drivers/${C.driverId}`).set(auth(C)).send({ status: 'AVAILABLE' });
    expect(res.status).toBe(409);
    // Cancelling the assignment frees the driver and puts the order back
    const d = await prisma.dispatch.findFirst({ where: { orderId: order.id } });
    expect((await request(app).post(`/api/dispatch/${d!.id}/status`).set(auth(C)).send({ status: 'CANCELLED' })).status).toBe(200);
    expect((await prisma.driver.findUnique({ where: { id: C.driverId } }))?.status).toBe('AVAILABLE');
    expect((await prisma.deliveryOrder.findUnique({ where: { id: order.id } }))?.driverId).toBeNull();
  });

  it('credit orders respect the customer’s limit, and payments settle the oldest orders first', async () => {
    const created = await request(app).post('/api/accounts').set(auth(C)).send({ name: 'Credit Shop', phone: '+250788000001', address: 'Remera', creditLimit: 3000, paymentTermsDays: 30 });
    expect(created.status).toBe(201);
    const accountId = created.body.data.id;
    const ok = await newOrder({ accountId, customerName: 'Credit Shop', paymentMethod: 'CREDIT', items: [{ itemId: C.itemId, quantity: 4 }] }); // 2,000
    const over = await request(app).post('/api/orders').set(auth(C, 'WAREHOUSE_STAFF')).send({
      accountId, customerName: 'Credit Shop', contactNumber: '+250788000001', deliveryAddress: 'Remera', paymentMethod: 'CREDIT', items: [{ itemId: C.itemId, quantity: 4 }],
    });
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('CREDIT_LIMIT');

    // Deliver it so it becomes a debt, then pay part of it
    await prisma.deliveryOrder.update({ where: { id: ok.id }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
    const pay = await request(app).post(`/api/accounts/${accountId}/payments`).set(auth(C)).send({ amount: 1200, provider: 'BANK_TRANSFER', reference: 'BK-1' });
    expect(pay.status).toBe(201);
    const account = await request(app).get(`/api/accounts/${accountId}`).set(auth(C));
    expect(account.body.data.position.balance).toBe(800);
    expect((await prisma.deliveryOrder.findUnique({ where: { id: ok.id } }))?.paymentStatus).toBe('PARTIAL');
    const statement = await request(app).get(`/api/accounts/${accountId}/statement`).set(auth(C));
    expect(statement.body.data.closing).toBe(800);
  });

  it('orders cannot take more stock than the branch has', async () => {
    const res = await request(app).post('/api/orders').set(auth(C)).send({
      customerName: 'Big Buyer', contactNumber: '+250788000002', deliveryAddress: 'Kigali', items: [{ itemId: C.itemId, quantity: 100000 }],
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('stock count: count, submit, approve applies only the difference', async () => {
    const before = (await prisma.inventoryItem.findUnique({ where: { id: C.itemId } }))!.quantity;
    const started = await request(app).post('/api/stock-counts').set(auth(C, 'WAREHOUSE_STAFF')).send({ type: 'CYCLE', itemIds: [C.itemId] });
    expect(started.status).toBe(201);
    const countId = started.body.data.id;
    const expected = started.body.data.lines[0].expected;
    expect((await request(app).put(`/api/stock-counts/${countId}/lines/${C.itemId}`).set(auth(C, 'WAREHOUSE_STAFF')).send({ counted: expected - 3, note: '3 broken' })).status).toBe(200);
    expect((await request(app).post(`/api/stock-counts/${countId}/submit`).set(auth(C, 'WAREHOUSE_STAFF'))).status).toBe(200);
    // Only an admin approves
    expect((await request(app).post(`/api/stock-counts/${countId}/approve`).set(auth(C, 'WAREHOUSE_STAFF'))).status).toBe(403);
    const approved = await request(app).post(`/api/stock-counts/${countId}/approve`).set(auth(C));
    expect(approved.status).toBe(200);
    const after = (await prisma.inventoryItem.findUnique({ where: { id: C.itemId } }))!.quantity;
    expect(after).toBe(before - 3);
  });

  it('packing: an order is packed only when every unit is in the parcel', async () => {
    const order = await newOrder({ items: [{ itemId: C.itemId, quantity: 2 }] });
    const early = await request(app).post(`/api/orders/${order.id}/packing/complete`).set(auth(C, 'WAREHOUSE_STAFF')).send({});
    expect(early.status).toBe(409);
    const packing = await request(app).get(`/api/orders/${order.id}/packing`).set(auth(C, 'WAREHOUSE_STAFF'));
    const line = packing.body.data.items[0];
    expect((await request(app).put(`/api/orders/${order.id}/packing/lines/${line.id}`).set(auth(C, 'WAREHOUSE_STAFF')).send({ packedQuantity: 2 })).status).toBe(200);
    const done = await request(app).post(`/api/orders/${order.id}/packing/complete`).set(auth(C, 'WAREHOUSE_STAFF')).send({});
    expect(done.status).toBe(200);
    expect(done.body.data.packingStatus).toBe('PACKED');
  });

  it('roles: a driver cannot see accounts, change order status or export accounting', async () => {
    const d = auth(C, 'DRIVER');
    expect((await request(app).get('/api/accounts').set(d)).status).toBe(403);
    expect((await request(app).get('/api/accounting/export?type=sales').set(d)).status).toBe(403);
    expect((await request(app).get('/api/reports/analytics').set(d)).status).toBe(403);
    const order = await newOrder({ items: [{ itemId: C.itemId, quantity: 1 }] });
    expect((await request(app).post(`/api/orders/${order.id}/status`).set(d).send({ status: 'DELIVERED' })).status).toBe(403);
  });

  it('every request without a token is refused', async () => {
    for (const url of ['/api/orders', '/api/accounts', '/api/stock-counts', '/api/cash/drivers', '/api/expenses']) {
      expect((await request(app).get(url)).status).toBe(401);
    }
  });
});
