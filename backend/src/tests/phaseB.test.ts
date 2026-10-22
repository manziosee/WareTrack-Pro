import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createCompany, auth, type TestCompany } from './helpers/fixtures';

/** Pricing, credit notes, FEFO batches, trips, serial numbers and fleet care. */
describe('Pricing, credit, stock and fleet improvements', () => {
  let C: TestCompany;
  beforeAll(async () => {
    C = await createCompany('Improve');
  });

  const order = async (body: Record<string, unknown>) => {
    const res = await request(app).post('/api/orders').set(auth(C)).send({
      customerName: 'Price Shop', contactNumber: '+250788100100', deliveryAddress: 'Kigali', paymentMethod: 'CASH', ...body,
    });
    if (res.status !== 201) throw new Error(`${res.status} ${JSON.stringify(res.body)}`);
    return res.body.data;
  };

  it('price list, promotion and customer discount set the price; VAT-exempt lines have 0% VAT', async () => {
    const list = await request(app).post('/api/price-lists').set(auth(C)).send({ name: 'Supermarkets' });
    expect(list.status).toBe(201);
    await request(app).put(`/api/price-lists/${list.body.data.id}/items`).set(auth(C)).send({ items: [{ itemId: C.itemId, price: 400 }] });
    const account = await request(app).post('/api/accounts').set(auth(C)).send({ name: 'Price Shop', phone: '+250788100100', address: 'Kigali' });
    await request(app).put(`/api/accounts/${account.body.data.id}`).set(auth(C)).send({ priceListId: list.body.data.id, discountPercent: 5 });
    const now = Date.now();
    await request(app).post('/api/promotions').set(auth(C)).send({ name: 'Water week', type: 'AMOUNT', value: 50, itemId: C.itemId, minQuantity: 10, startsAt: new Date(now - 3600_000), endsAt: new Date(now + 86400_000) });

    // 5 units: price list 400, no promotion (needs 10), 5% off → 380
    const quote = await request(app).post('/api/pricing/quote').set(auth(C)).send({ accountId: account.body.data.id, items: [{ itemId: C.itemId, quantity: 5 }] });
    expect(quote.body.data.lines[0].unitPrice).toBe(380);
    expect(quote.body.data.lines[0].appliedPriceList).toBe(true);
    // 10 units: 400 − 50 promotion = 350, then 5% off → 332.5
    const big = await order({ accountId: account.body.data.id, items: [{ itemId: C.itemId, quantity: 10 }] });
    expect(Number(big.totalAmount)).toBe(3325);
    expect(Number(big.items[0].discountAmount)).toBeCloseTo(1675, 0);

    // VAT-exempt item → invoice VAT 0
    await prisma.inventoryItem.update({ where: { id: C.itemId }, data: { vatExempt: true } });
    const exempt = await order({ items: [{ itemId: C.itemId, quantity: 2 }] });
    const invoice = await request(app).get(`/api/invoices/order/${exempt.id}`).set(auth(C));
    expect(Number(invoice.body.data.invoice.tax)).toBe(0);
    await prisma.inventoryItem.update({ where: { id: C.itemId }, data: { vatExempt: false } });
  });

  it('item and vehicle forms save weight, volume, VAT exemption and load space', async () => {
    const item = await request(app).put(`/api/inventory/${C.itemId}`).set(auth(C)).send({ weightKg: 0.55, volumeL: 0.6, vatExempt: false, trackSerials: false });
    expect(item.status).toBe(200);
    const saved = await prisma.inventoryItem.findUnique({ where: { id: C.itemId } });
    expect(Number(saved!.weightKg)).toBe(0.55);
    expect(Number(saved!.volumeL)).toBe(0.6);
    expect((await request(app).put(`/api/vehicles/${C.vehicleId}`).set(auth(C)).send({ volumeL: 9000 })).status).toBe(200);
    expect(Number((await prisma.vehicle.findUnique({ where: { id: C.vehicleId } }))!.volumeL)).toBe(9000);
    await request(app).put(`/api/inventory/${C.itemId}`).set(auth(C)).send({ weightKg: null, volumeL: null });
    await prisma.vehicle.update({ where: { id: C.vehicleId }, data: { volumeL: null } });
  });

  it('staff can still type a price by hand', async () => {
    const o = await order({ items: [{ itemId: C.itemId, quantity: 1, unitPrice: 999 }] });
    expect(Number(o.totalAmount)).toBe(999);
  });

  it('credit notes settle what is owed, and the rest becomes account credit', async () => {
    const account = await request(app).post('/api/accounts').set(auth(C)).send({ name: 'Credit Note Shop', phone: '+250788200200', address: 'Remera' });
    const accountId = account.body.data.id;
    const o = await order({ accountId, customerName: 'Credit Note Shop', paymentMethod: 'CREDIT', items: [{ itemId: C.itemId, quantity: 4 }] }); // 2,000
    await prisma.deliveryOrder.update({ where: { id: o.id }, data: { status: 'DELIVERED', deliveredAt: new Date() } });

    const first = await request(app).post('/api/credit-notes').set(auth(C)).send({ orderId: o.id, amount: 500, reason: 'Damaged bottles' });
    expect(first.status).toBe(201);
    expect(Number(first.body.data.appliedAmount)).toBe(500);
    expect((await request(app).get(`/api/accounts/${accountId}`).set(auth(C))).body.data.position.balance).toBe(1500);

    // Pay the rest, then a credit note becomes account credit
    await request(app).post(`/api/accounts/${accountId}/payments`).set(auth(C)).send({ amount: 1500, provider: 'CASH' });
    const second = await request(app).post('/api/credit-notes').set(auth(C)).send({ orderId: o.id, amount: 300, reason: 'Late delivery goodwill' });
    expect(Number(second.body.data.appliedAmount)).toBe(0);
    const position = (await request(app).get(`/api/accounts/${accountId}`).set(auth(C))).body.data.position;
    expect(position.credit).toBe(300);
    expect(position.balance).toBe(-300);

    // More than the order total is refused; void restores what was settled
    expect((await request(app).post('/api/credit-notes').set(auth(C)).send({ orderId: o.id, amount: 5000, reason: 'Too much' })).status).toBe(400);
    expect((await request(app).post(`/api/credit-notes/${first.body.data.id}/void`).set(auth(C))).status).toBe(200);
    expect((await prisma.deliveryOrder.findUnique({ where: { id: o.id } }))?.paymentStatus).toBe('PARTIAL');
  });

  it('the accountant export books credit notes as sales returns and the journal balances', async () => {
    const csv = (text: string) => {
      const [head, ...lines] = text.replace(/^\uFEFF/, '').trim().split('\n');
      const cols = head.split(',');
      return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v.replace(/^"|"$/g, '')])));
    };
    const journal = csv((await request(app).get('/api/accounting/export?type=journal').set(auth(C))).text);
    const sum = (k: string) => Math.round(journal.reduce((t, r) => t + Number(r[k] || 0), 0) * 100) / 100;
    expect(sum('Debit')).toBe(sum('Credit'));
    expect(journal.some((r) => r.Account === 'Sales Returns')).toBe(true);
    // Credit-note settlements are not receipts of money
    expect(journal.filter((r) => r.Journal === 'Receipts' && r.Reference.startsWith('CN')).length).toBe(0);

    const notes = await request(app).get('/api/accounting/export?type=credit-notes').set(auth(C));
    expect(notes.status).toBe(200);
    expect(csv(notes.text).length).toBeGreaterThanOrEqual(2);
  });

  it('orders take the batch that expires first', async () => {
    const warehouse = await C.as(() => prisma.warehouse.findFirst());
    await C.as(async () => {
      await prisma.inventoryBatch.create({ data: { itemId: C.itemId, batchNumber: 'LATE', quantity: 50, expiryDate: new Date(Date.now() + 200 * 86400_000), warehouseId: warehouse!.id } as any });
      await prisma.inventoryBatch.create({ data: { itemId: C.itemId, batchNumber: 'SOON', quantity: 3, expiryDate: new Date(Date.now() + 10 * 86400_000), warehouseId: warehouse!.id } as any });
    });
    const o = await order({ items: [{ itemId: C.itemId, quantity: 5 }] });
    const allocations = o.items[0].batchAllocations;
    expect(allocations.map((a: any) => [a.batchNumber, a.quantity])).toEqual([['SOON', 3], ['LATE', 2]]);
  });

  it('trip planner refuses an overloaded vehicle, sends a trip and completes it', async () => {
    await prisma.inventoryItem.update({ where: { id: C.itemId }, data: { weightKg: 100 } });
    await prisma.vehicle.update({ where: { id: C.vehicleId }, data: { capacity: 1000, status: 'AVAILABLE' } });
    await prisma.driver.update({ where: { id: C.driverId }, data: { status: 'AVAILABLE' } });
    const a = await order({ items: [{ itemId: C.itemId, quantity: 6 }] }); // 600 kg
    const b = await order({ items: [{ itemId: C.itemId, quantity: 6 }] }); // 600 kg

    const check = await request(app).post('/api/trips/load-check').set(auth(C)).send({ vehicleId: C.vehicleId, orderIds: [a.id, b.id] });
    expect(check.body.data.fits).toBe(false);
    expect(check.body.data.weightKg).toBe(1200);
    expect((await request(app).post('/api/trips').set(auth(C, 'DISPATCH_OFFICER')).send({ vehicleId: C.vehicleId, driverId: C.driverId, orderIds: [a.id, b.id] })).status).toBe(409);

    const planned = await request(app).post('/api/trips').set(auth(C, 'DISPATCH_OFFICER')).send({ vehicleId: C.vehicleId, driverId: C.driverId, orderIds: [a.id] });
    expect(planned.status).toBe(201);
    const board = await request(app).get('/api/trips/planner').set(auth(C));
    expect(board.body.data.orders.some((o: any) => o.id === a.id)).toBe(false);

    const sent = await request(app).post(`/api/trips/${planned.body.data.id}/dispatch`).set(auth(C));
    expect(sent.status).toBe(200);
    expect((await prisma.deliveryOrder.findUnique({ where: { id: a.id } }))?.status).toBe('DISPATCHED');
    expect((await prisma.driver.findUnique({ where: { id: C.driverId } }))?.status).toBe('ON_DUTY');

    await request(app).post(`/api/orders/${a.id}/status`).set(auth(C)).send({ status: 'DELIVERED' });
    expect((await prisma.trip.findUnique({ where: { id: planned.body.data.id } }))?.status).toBe('COMPLETED');
    expect((await prisma.driver.findUnique({ where: { id: C.driverId } }))?.status).toBe('AVAILABLE');
    await prisma.inventoryItem.update({ where: { id: C.itemId }, data: { weightKg: null } });
  });

  it('serial-numbered items are packed by serial and marked sold', async () => {
    const tag = Date.now().toString(36).toUpperCase();
    const reg = await request(app).post(`/api/inventory/${C.itemId}/serials`).set(auth(C, 'WAREHOUSE_STAFF')).send({ serialNumbers: [`SN-${tag}-1`, `SN-${tag}-2`, `SN-${tag}-1`] });
    expect(reg.body.data.added).toBe(2);
    const o = await order({ items: [{ itemId: C.itemId, quantity: 2 }] });
    const item = await prisma.inventoryItem.findUnique({ where: { id: C.itemId } });
    expect((await request(app).post(`/api/orders/${o.id}/packing/scan`).set(auth(C, 'WAREHOUSE_STAFF')).send({ code: item!.barcode })).status).toBe(400);
    for (const n of [1, 2]) expect((await request(app).post(`/api/orders/${o.id}/packing/scan`).set(auth(C, 'WAREHOUSE_STAFF')).send({ code: `SN-${tag}-${n}` })).status).toBe(200);
    expect((await request(app).post(`/api/orders/${o.id}/packing/complete`).set(auth(C, 'WAREHOUSE_STAFF')).send({})).status).toBe(200);
    const lookup = await request(app).get(`/api/serials/SN-${tag}-1`).set(auth(C));
    expect(lookup.body.data.status).toBe('SOLD');
    expect(lookup.body.data.order.id).toBe(o.id);
    await prisma.inventoryItem.update({ where: { id: C.itemId }, data: { trackSerials: false } });
  });

  it('reorder points follow demand and supplier lead time', async () => {
    const res = await request(app).get('/api/reorder-points').set(auth(C, 'WAREHOUSE_STAFF'));
    expect(res.status).toBe(200);
    const row = res.body.data.find((r: any) => r.id === C.itemId);
    expect(row.dailyDemand).toBeGreaterThan(0);
    expect(row.suggestedMinimum).toBe(Math.ceil(row.dailyDemand * (row.leadTimeDays + res.body.safetyDays)));
    expect((await request(app).post('/api/reorder-points').set(auth(C, 'WAREHOUSE_STAFF')).send({ itemIds: [C.itemId] })).body.data.updated).toBe(1);
    expect((await prisma.inventoryItem.findUnique({ where: { id: C.itemId } }))?.minQuantity).toBe(row.suggestedMinimum);
  });

  it('vehicle documents expiring soon are listed, and fuel efficiency is worked out from fill-ups', async () => {
    const doc = await request(app).post(`/api/vehicles/${C.vehicleId}/documents`).set(auth(C)).send({ type: 'INSURANCE', number: 'SORAS-1', expiresAt: new Date(Date.now() + 5 * 86400_000) });
    expect(doc.status).toBe(201);
    const soon = await request(app).get('/api/fleet/expiring-documents').set(auth(C));
    expect(soon.body.data.some((d: any) => d.kind === 'vehicle' && d.daysLeft <= 5)).toBe(true);

    for (const [odometer, liters] of [[10000, 40], [10400, 32], [10800, 40]]) {
      await request(app).post('/api/expenses').set(auth(C)).send({ type: 'FUEL', amount: liters * 1600, liters, odometer, vehicleId: C.vehicleId });
    }
    const fuel = await request(app).get('/api/fleet/fuel-efficiency').set(auth(C));
    const row = fuel.body.data.find((r: any) => r.vehicleId === C.vehicleId);
    expect(row.km).toBe(800);
    expect(row.kmPerLiter).toBe(11.1); // 800 km / 72 L
  });
});
