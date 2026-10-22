import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { runWithTenant } from '../../lib/tenantContext';
import { getJwtSecret } from '../../config/env';

const ROLES = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'] as const;
type Role = (typeof ROLES)[number];

export interface TestCompany {
  id: number;
  name: string;
  branchId: number;
  users: Record<Role, { id: number; email: string; token: string }>;
  driverId: number;
  vehicleId: number;
  itemId: number;
  /** Run code as if inside a request of this company */
  as<T>(fn: () => Promise<T>): Promise<T>;
}

let seq = 0;
const unique = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const tokenFor = (userId: number, role: string) => jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: '1h' });

/** A complete company: one branch, one user per role, a driver, a vehicle and a stocked item. */
export async function createCompany(label: string): Promise<TestCompany> {
  const tag = unique();
  const company = await prisma.company.create({ data: { name: `${label} ${tag}`, slug: `${label.toLowerCase()}-${tag}` } });
  const branch = await prisma.branch.create({ data: { companyId: company.id, name: 'Main', code: 'MAIN' } });
  const password = await bcrypt.hash('Passw0rd!', 4);
  const users = {} as TestCompany['users'];
  for (const role of ROLES) {
    const email = `${role.toLowerCase()}-${tag}@test.local`;
    const user = await prisma.user.create({ data: { companyId: company.id, name: `${label} ${role}`, email, password, role, status: 'ACTIVE' } });
    const membership = await prisma.companyMembership.create({ data: { companyId: company.id, userId: user.id, role } });
    await prisma.branchMembership.create({ data: { companyMembershipId: membership.id, branchId: branch.id } });
    users[role] = { id: user.id, email, token: tokenFor(user.id, role) };
  }
  const as = <T>(fn: () => Promise<T>) => runWithTenant({ companyId: company.id, branchId: branch.id }, async () => await fn());
  const { driver, vehicle, item } = await as(async () => {
    const vehicle = await prisma.vehicle.create({ data: { plateNumber: `RA${tag}`.slice(0, 12).toUpperCase(), type: 'Van', capacity: 1500 } });
    const driver = await prisma.driver.create({ data: { name: `${label} Driver`, userId: users.DRIVER.id, licenseNumber: `LIC-${tag}`, phone: '+250788000000' } });
    const item = await prisma.inventoryItem.create({
      data: { name: `${label} Water 500ml`, code: `W-${tag}`.toUpperCase(), category: 'Beverages', quantity: 500, minQuantity: 10, unit: 'bottle', unitCategory: 'count', location: 'A-1-1', unitPrice: 500 },
    });
    // Stock lives in a warehouse of the branch
    const warehouse = await prisma.warehouse.create({ data: { name: `${label} Depot`, code: `WH-${tag}`.toUpperCase().slice(0, 20), city: 'Kigali', latitude: -1.95, longitude: 30.06 } });
    await prisma.warehouseStock.create({ data: { warehouseId: warehouse.id, itemId: item.id, quantity: 500 } });
    return { driver, vehicle, item };
  });
  return { id: company.id, name: company.name, branchId: branch.id, users, driverId: driver.id, vehicleId: vehicle.id, itemId: item.id, as };
}

export const auth = (company: TestCompany, role: Role = 'ADMIN') => ({ Authorization: `Bearer ${company.users[role].token}` });
