import { test, expect } from '@playwright/test';
import { E2E, signIn, apiAs, expectToast } from './helpers';

/** Trip planner: put a waiting order on a vehicle, then take the trip back off. */
test('trip planner: plan a trip for a waiting order, then cancel it', async ({ browser }) => {
  const admin = await signIn(browser, 'admin');
  admin.on('dialog', (d) => d.accept());
  const items = await apiAs(admin, 'get', '/inventory?limit=50');
  const item = items.data.find((i: any) => i.name === E2E.item.name);
  const created = await apiAs(admin, 'post', '/orders', {
    customerName: `E2E Trip ${Date.now().toString(36)}`, contactNumber: '+250788777888', deliveryAddress: 'Nyarutarama, Kigali', items: [{ itemId: item.id, quantity: 2 }],
  });
  const orderNumber = created.data.orderNumber;

  await admin.goto('/trips');
  const card = admin.locator('div', { hasText: orderNumber }).filter({ has: admin.getByTitle('Add to the new trip') }).last();
  await card.getByTitle('Add to the new trip').click();
  const newTrip = admin.locator('div', { has: admin.getByRole('heading', { name: 'New trip' }) }).last();
  const choose = async (index: number, text: string) => {
    const select = newTrip.locator('select').nth(index);
    const value = await select.locator('option', { hasText: text }).first().getAttribute('value');
    await select.selectOption(value!);
  };
  await choose(0, 'RAE 001 E');
  await choose(1, 'E2E Driver');
  await expect(newTrip.getByText('Weight', { exact: true })).toBeVisible();
  await admin.getByRole('button', { name: /Plan trip \(1 order\)/ }).click();
  await expectToast(admin, 'Trip planned');

  const trip = admin.locator('div.rounded-2xl', { hasText: orderNumber }).filter({ hasText: 'Planned' }).last();
  await expect(trip).toBeVisible();
  await trip.getByRole('button', { name: 'Cancel' }).click();
  await expectToast(admin, /cancelled/);
  // The order is waiting for a vehicle again
  await expect(admin.getByTitle('Add to the new trip').first()).toBeVisible();
  await expect(admin.locator('a', { hasText: orderNumber }).first()).toBeVisible();
});

/** Pricing: a customer price list changes what that customer pays. */
test('pricing: create a price list, set a price and check it', async ({ browser }) => {
  const admin = await signIn(browser, 'admin');
  admin.on('dialog', (d) => d.accept());
  const name = `E2E Shops ${Date.now().toString(36)}`;
  await admin.goto('/pricing');
  await admin.getByRole('button', { name: 'New price list' }).click();
  await admin.getByRole('dialog').getByPlaceholder('e.g. Supermarkets').fill(name);
  await admin.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expectToast(admin, 'Price list created');

  const row = admin.locator('tr', { hasText: E2E.item.name });
  await row.locator('input').fill('450');
  await expect(row.getByText('10% off')).toBeVisible();
  await admin.getByRole('button', { name: 'Save prices' }).click();
  await expectToast(admin, /Saved 1 price/);

  // A walk-in customer still pays the normal price
  await admin.getByRole('button', { name: 'Check a price' }).click();
  const tool = admin.locator('div', { has: admin.getByRole('heading', { name: /What would this customer pay/ }) }).last();
  const itemSelect = tool.locator('select').nth(1);
  await itemSelect.selectOption((await itemSelect.locator('option', { hasText: E2E.item.name }).first().getAttribute('value'))!);
  await tool.getByRole('button', { name: 'Price it' }).click();
  await expect(tool.getByText(/RWF 500\b/).first()).toBeVisible();

  await admin.getByRole('button', { name: 'Price lists' }).click();
  await admin.getByRole('button', { name: new RegExp(name) }).click();
  await admin.getByRole('button', { name: 'Delete' }).click();
  await expect(admin.getByRole('button', { name: new RegExp(name) })).toHaveCount(0);
});
