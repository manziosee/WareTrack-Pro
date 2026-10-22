/**
 * Data for the browser tests (frontend/e2e). Creates one company with an admin,
 * a warehouse user and a driver whose browsers are already trusted, so the
 * tests sign in with a password and no emailed code. Only for test databases.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { runWithTenant } from '../src/lib/tenantContext';

export const E2E = {
  password: 'E2ePassw0rd!',
  users: {
    admin: { email: 'admin@e2e.local', role: 'ADMIN', device: 'e2e-trusted-device-admin-0123456789abcdef' },
    warehouse: { email: 'warehouse@e2e.local', role: 'WAREHOUSE_STAFF', device: 'e2e-trusted-device-warehouse-0123456789ab' },
    driver: { email: 'driver@e2e.local', role: 'DRIVER', device: 'e2e-trusted-device-driver-0123456789abcdef' },
  },
  item: { name: 'E2E Mineral Water 500ml', code: 'E2E-WATER', barcode: 'E2E-WATER-0001', price: 500 },
};

async function main() {
  const url = process.env.DATABASE_URL || '';
  if (!/localhost|127\.0\.0\.1|@postgres/.test(url) || !/test|e2e/i.test(url)) throw new Error('e2e-seed only runs against a local test database');

  const company = await prisma.company.create({ data: { name: 'E2E Distributors', slug: `e2e-${Date.now()}` } });
  const branch = await prisma.branch.create({ data: { companyId: company.id, name: 'Kigali', code: 'KGL' } });
  const password = await bcrypt.hash(E2E.password, 10);
  const ids: Record<string, number> = {};
  for (const [key, u] of Object.entries(E2E.users)) {
    const user = await prisma.user.create({ data: { companyId: company.id, name: `E2E ${key}`, email: u.email, password, role: u.role as any, status: 'ACTIVE', lastLogin: new Date() } });
    const membership = await prisma.companyMembership.create({ data: { companyId: company.id, userId: user.id, role: u.role } });
    await prisma.branchMembership.create({ data: { companyMembershipId: membership.id, branchId: branch.id } });
    await prisma.trustedDevice.create({ data: { userId: user.id, tokenHash: crypto.createHash('sha256').update(u.device).digest('hex'), label: 'Playwright', expiresAt: new Date(Date.now() + 30 * 86400000) } });
    ids[key] = user.id;
  }
  await runWithTenant({ companyId: company.id, branchId: branch.id }, async () => {
    const warehouse = await prisma.warehouse.create({ data: { name: 'Kigali Depot', code: 'KGL-01', city: 'Kigali', latitude: -1.95, longitude: 30.06 } });
    const item = await prisma.inventoryItem.create({
      data: { name: E2E.item.name, code: E2E.item.code, barcode: E2E.item.barcode, category: 'Beverages', quantity: 200, minQuantity: 10, unit: 'bottle', unitCategory: 'count', location: 'A-1-1', unitPrice: E2E.item.price },
    });
    await prisma.warehouseStock.create({ data: { warehouseId: warehouse.id, itemId: item.id, quantity: 200 } });
    await prisma.vehicle.create({ data: { plateNumber: 'RAE 001 E', type: 'Van', capacity: 1500, vehicleModel: 'Toyota HiAce' } });
    await prisma.driver.create({ data: { name: 'E2E Driver', userId: ids.driver, licenseNumber: 'E2E-LIC-1', phone: '+250788000099' } });
  });
  console.log(`E2E data ready: company ${company.id}, branch ${branch.id}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
