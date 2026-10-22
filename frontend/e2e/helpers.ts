import { expect, type Browser, type Page } from '@playwright/test';

/** Must match backend/prisma/e2e-seed.ts */
export const E2E = {
  password: 'E2ePassw0rd!',
  users: {
    admin: { email: 'admin@e2e.local', device: 'e2e-trusted-device-admin-0123456789abcdef' },
    warehouse: { email: 'warehouse@e2e.local', device: 'e2e-trusted-device-warehouse-0123456789ab' },
    driver: { email: 'driver@e2e.local', device: 'e2e-trusted-device-driver-0123456789abcdef' },
  },
  item: { name: 'E2E Mineral Water 500ml', barcode: 'E2E-WATER-0001', price: 500 },
};

type Who = keyof typeof E2E.users;

/** Sign in through the login page. The seeded browsers are trusted, so no emailed code is needed. */
export async function signIn(browser: Browser, who: Who, options: { mobile?: boolean } = {}) {
  const context = await browser.newContext(options.mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const user = E2E.users[who];
  await context.addInitScript(([email, device]) => {
    localStorage.setItem('waretrack-trusted-devices', JSON.stringify({ [email]: device }));
    localStorage.setItem('waretrack-onboarding-dismissed', '1');
  }, [user.email, user.device]);
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(E2E.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/dashboard|\/my-deliveries/, { timeout: 30_000 });
  return page;
}

/** The input right after a label with this text (forms here don't use htmlFor). */
export const field = (page: Page, label: string) => page.locator(`label:text-is("${label}") + *`).locator('xpath=self::input|self::select|self::textarea|.//input|.//select|.//textarea').first();

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('[role="status"]').filter({ hasText: text }).first()).toBeVisible();
}

export const API_URL = (process.env.E2E_API_URL || 'http://localhost:5056/api').replace(/\/$/, '');

/** Call the API as the signed-in user of this page. */
export async function apiAs(page: Page, method: 'get' | 'post', path: string, data?: unknown) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const res = await page.request[method](`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  return res.json();
}

/** Cancel dispatches left open by an earlier, interrupted run, so the driver is free again. */
export async function cancelOpenDispatches(page: Page) {
  const list = await apiAs(page, 'get', '/dispatch?limit=500');
  for (const d of list.data || []) {
    if (['PENDING', 'DISPATCHED', 'IN_TRANSIT'].includes(d.status)) await apiAs(page, 'post', `/dispatch/${d.id}/status`, { status: 'CANCELLED' });
  }
}
