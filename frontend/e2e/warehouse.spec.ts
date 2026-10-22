import { test, expect } from '@playwright/test';
import { E2E, signIn, field, expectToast, apiAs } from './helpers';

test('stock count: warehouse counts and submits, admin approves and stock changes', async ({ browser }) => {
  const warehouse = await signIn(browser, 'warehouse');
  // Leftovers from an earlier run would block a new count of the same items
  const existing = await apiAs(warehouse, 'get', '/stock-counts');
  for (const c of existing.data || []) {
    if (['OPEN', 'SUBMITTED'].includes(c.status)) await apiAs(warehouse, 'post', `/stock-counts/${c.id}/cancel`);
  }
  await warehouse.goto('/stock-counts');
  await warehouse.getByRole('button', { name: 'New count' }).first().click();
  await warehouse.getByRole('button', { name: /Full stocktake/ }).click();
  await warehouse.getByRole('button', { name: 'Start count' }).click();
  await expectToast(warehouse, /started/);

  const line = warehouse.locator('li', { hasText: E2E.item.name }).first();
  const expected = Number((await line.innerText()).match(/system (\d+)/)![1]);
  const count = line.getByPlaceholder('Count');
  await count.fill(String(expected - 2));
  await count.press('Enter');
  await expect(line.getByText('-2')).toBeVisible();
  for (const input of await warehouse.getByPlaceholder('Count').all()) {
    if (!(await input.inputValue())) { await input.fill('0'); await input.press('Enter'); }
  }
  warehouse.once('dialog', (d) => d.accept());
  await warehouse.getByRole('button', { name: 'Submit for approval' }).click();
  await expectToast(warehouse, /Sent for approval/);

  const admin = await signIn(browser, 'admin');
  await admin.goto('/stock-counts');
  await admin.getByRole('row', { name: /Waiting|Submitted/i }).first().click();
  await admin.getByRole('button', { name: /Approve & adjust stock/ }).click();
  await expectToast(admin, /Approved/);

  await admin.goto('/inventory');
  await expect(admin.getByRole('row', { name: new RegExp(E2E.item.name) })).toContainText(String(expected - 2));
});

test('packing: scan every unit, then mark the order packed', async ({ browser }) => {
  const admin = await signIn(browser, 'admin');
  await admin.goto('/orders');
  await admin.getByRole('button', { name: 'New order' }).first().click();
  const customer = `Pack Shop ${Date.now().toString(36)}`;
  await admin.getByPlaceholder('Search an account or type a new customer').fill(customer);
  await field(admin, 'Phone').fill('+250788777888');
  await field(admin, 'Delivery address').fill('Remera, Kigali');
  const item = field(admin, 'Item');
  await item.selectOption((await item.locator('option', { hasText: E2E.item.name }).first().getAttribute('value'))!);
  await field(admin, 'Quantity').fill('2');
  await admin.getByRole('button', { name: /Create order/ }).click();
  await expectToast(admin, /Order created/);

  await admin.goto('/packing');
  await admin.getByRole('row', { name: new RegExp(customer) }).click();
  const scan = admin.getByPlaceholder('Scan each item or pack into the parcel');
  for (let i = 0; i < 2; i++) { await scan.fill(E2E.item.barcode); await scan.press('Enter'); }
  await expect(admin.getByText('2/2')).toBeVisible();
  await admin.getByRole('button', { name: 'Mark packed' }).click();
  await expectToast(admin, /packed and ready for dispatch/);
});
