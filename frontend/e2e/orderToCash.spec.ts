import { test, expect } from '@playwright/test';
import { E2E, signIn, field, expectToast, cancelOpenDispatches } from './helpers';

/**
 * The money path: an order is created, dispatched, delivered by the driver who
 * collects cash, and the cash is handed in at the office.
 */
test('order → dispatch → delivered with cash → handover', async ({ browser }) => {
  const customer = `E2E Shop ${Date.now().toString(36)}`;

  // Office: create the order
  const admin = await signIn(browser, 'admin');
  await cancelOpenDispatches(admin);
  await admin.goto('/orders');
  await admin.getByRole('button', { name: 'New order' }).first().click();
  await admin.getByPlaceholder('Search an account or type a new customer').fill(customer);
  await field(admin, 'Phone').fill('+250788555666');
  await field(admin, 'Delivery address').fill('KG 7 Ave, Kacyiru, Kigali');
  await field(admin, 'Item').selectOption({ label: new RegExp(E2E.item.name) as any }).catch(async () => {
    const select = field(admin, 'Item');
    const value = await select.locator('option', { hasText: E2E.item.name }).first().getAttribute('value');
    await select.selectOption(value!);
  });
  await field(admin, 'Quantity').fill('4');
  await admin.getByRole('button', { name: /Create order/ }).click();
  await expectToast(admin, /Order created/);

  // Office: dispatch it to the driver
  await admin.goto('/dispatch');
  await admin.getByRole('button', { name: /New dispatch/ }).first().click();
  const dialog = admin.getByRole('dialog').last();
  const selects = dialog.locator('select');
  const pick = async (index: number, text?: string) => {
    const select = selects.nth(index);
    await expect(select.locator('option').nth(1)).toBeAttached();
    const option = text ? select.locator('option', { hasText: text }).first() : select.locator('option').nth(1);
    await select.selectOption((await option.getAttribute('value'))!);
  };
  await pick(0, customer);
  await pick(1, 'E2E Driver');
  await pick(2);
  const when = new Date(Date.now() + 3600_000);
  await dialog.locator('input[type="datetime-local"]').first().fill(new Date(when.getTime() - when.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  await dialog.getByRole('button', { name: /Create|Save|Dispatch/ }).last().click();
  await expectToast(admin, /Dispatch created/);

  // Driver on the phone: start, scan, sign, collect cash
  const driver = await signIn(browser, 'driver', { mobile: true });
  await driver.goto('/my-deliveries');
  const stop = driver.locator('li', { hasText: customer }).first();
  await expect(stop).toBeVisible();
  await stop.getByRole('button', { name: 'Start' }).click();
  await expectToast(driver, /On the way/);
  await stop.getByRole('button', { name: 'Delivered' }).click();
  const scan = driver.getByPlaceholder('Scan product barcode or QR code');
  for (let i = 0; i < 4; i++) {
    await scan.fill(E2E.item.barcode);
    await scan.press('Enter');
  }
  const canvas = driver.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  await driver.mouse.move(box.x + 20, box.y + 40);
  await driver.mouse.down();
  await driver.mouse.move(box.x + 120, box.y + 70, { steps: 8 });
  await driver.mouse.move(box.x + 200, box.y + 30, { steps: 8 });
  await driver.mouse.up();
  await driver.getByRole('button', { name: /Confirm delivery/ }).click();
  await expectToast(driver, /Delivered/);
  await expect(driver.getByText(/Cash in hand/)).toBeVisible();
  await expect(driver.getByText('RWF 2,000').first()).toBeVisible();

  // Office: the driver hands the cash in
  await admin.goto('/cash');
  await admin.getByRole('row', { name: /E2E Driver/ }).getByRole('button', { name: /Receive/ }).click();
  await admin.getByPlaceholder('2000').fill('2000');
  await admin.getByRole('button', { name: /Confirm handover/ }).click();
  await expectToast(admin, /cash matches/);
});
