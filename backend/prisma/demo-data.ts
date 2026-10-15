/**
 * Realistic sample data for WareTrack-Pro (Kigali-based operations).
 *
 *   npx ts-node prisma/demo-data.ts
 *
 * - Safe to run on production: it never creates login accounts there; it uses the
 *   existing ACTIVE users (one per role) as the people who performed each action.
 * - On a local database (localhost) it also creates development users so you can sign in.
 * - Runs only once: it stops if the sample warehouses already exist.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

// ---------------------------------------------------------------------------
// Deterministic random helpers (same data every run)
// ---------------------------------------------------------------------------
let seed = 20261015;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)];
const chance = (p: number) => rand() < p;
const weighted = <T>(entries: [T, number][]): T => {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
};
const jitter = (value: number, spread: number) => value + (rand() - 0.5) * spread;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = new Date();
const daysAgo = (d: number, hour = 9) => {
  const date = new Date(now.getTime() - d * DAY);
  date.setHours(hour, int(0, 59), 0, 0);
  return date;
};
const pad = (n: number, size = 6) => String(n).padStart(size, '0');
const dec = (n: number) => new Prisma.Decimal(Math.round(n * 100) / 100);
const phone = () => `+2507${pick(['8', '9', '2', '3'])}${pad(int(0, 9999999), 7)}`;

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const NEIGHBORHOODS: [string, number, number][] = [
  ['Kimihurura', -1.9536, 30.0937], ['Kacyiru', -1.9441, 30.0619], ['Remera', -1.9577, 30.1127],
  ['Nyamirambo', -1.9792, 30.0442], ['Kicukiro Centre', -1.9706, 30.1044], ['Gikondo', -1.9781, 30.0735],
  ['Kanombe', -1.9686, 30.1394], ['Kibagabaga', -1.9306, 30.1178], ['Gisozi', -1.9214, 30.0590],
  ['Nyarutarama', -1.9389, 30.1036], ['Kimironko', -1.9497, 30.1264], ['Nyabugogo', -1.9381, 30.0444],
  ['Kagugu', -1.9208, 30.0928], ['Rebero', -1.9906, 30.0856], ['Kabeza', -1.9719, 30.1240],
  ['Kiyovu', -1.9530, 30.0600], ['Gacuriro', -1.9187, 30.1045], ['Niboye', -1.9800, 30.1100],
];

const WAREHOUSES = [
  { code: 'KGL-GKD', name: 'Gikondo Central Warehouse', city: 'Kigali', address: 'KK 15 Rd, Gikondo Industrial Zone', lat: -1.9781, lng: 30.0735, capacity: 12000 },
  { code: 'KGL-MSR', name: 'Masoro Distribution Hub', city: 'Kigali', address: 'Kigali Special Economic Zone, Masoro', lat: -1.9086, lng: 30.1336, capacity: 9000 },
  { code: 'MUS-01', name: 'Musanze North Depot', city: 'Musanze', address: 'NM 3 Rd, Musanze', lat: -1.4998, lng: 29.6350, capacity: 4000 },
  { code: 'HUY-01', name: 'Huye South Depot', city: 'Huye', address: 'NR 1 Rd, Huye', lat: -2.5967, lng: 29.7394, capacity: 3500 },
];

const SUPPLIERS = [
  { name: 'Akagera Packaging Ltd', contactName: 'Diane Uwase', leadTimeDays: 5, rating: 4.6 },
  { name: 'Virunga Food Distributors', contactName: 'Samuel Kagame', leadTimeDays: 3, rating: 4.3 },
  { name: 'Nyungwe Safety Supplies', contactName: 'Grace Ingabire', leadTimeDays: 7, rating: 4.1 },
  { name: 'Kivu Electronics Trading', contactName: 'Alain Mugabo', leadTimeDays: 10, rating: 3.9 },
  { name: 'Muhabura Building Materials', contactName: 'Josiane Umutoni', leadTimeDays: 6, rating: 4.4 },
  { name: 'Isange Medical Supplies', contactName: 'Fabrice Nkurunziza', leadTimeDays: 4, rating: 4.7 },
];

interface ItemSpec {
  code: string; name: string; category: string; unit: string; unitCategory: string;
  price: number; min: number; perishable?: boolean; supplier: number;
}
const ITEMS: ItemSpec[] = [
  { code: 'FB-RICE25', name: 'Rice 25kg Bag', category: 'Food & Beverage', unit: 'bag', unitCategory: 'weight', price: 35000, min: 40, supplier: 1 },
  { code: 'FB-OIL20', name: 'Cooking Oil 20L', category: 'Food & Beverage', unit: 'jerrycan', unitCategory: 'volume', price: 42000, min: 25, supplier: 1 },
  { code: 'FB-WATER24', name: 'Mineral Water 500ml (24 pack)', category: 'Food & Beverage', unit: 'pack', unitCategory: 'count', price: 6500, min: 80, perishable: true, supplier: 1 },
  { code: 'FB-MILK12', name: 'UHT Milk 1L (12 pack)', category: 'Food & Beverage', unit: 'pack', unitCategory: 'count', price: 14400, min: 50, perishable: true, supplier: 1 },
  { code: 'FB-SUGAR50', name: 'Sugar 50kg Bag', category: 'Food & Beverage', unit: 'bag', unitCategory: 'weight', price: 62000, min: 20, supplier: 1 },
  { code: 'FB-MAIZE25', name: 'Maize Flour 25kg', category: 'Food & Beverage', unit: 'bag', unitCategory: 'weight', price: 21000, min: 30, supplier: 1 },
  { code: 'FB-COFFEE1', name: 'Rwandan Coffee Beans 1kg', category: 'Food & Beverage', unit: 'bag', unitCategory: 'weight', price: 12000, min: 40, perishable: true, supplier: 1 },
  { code: 'FB-TEA500', name: 'Black Tea Leaves 500g', category: 'Food & Beverage', unit: 'box', unitCategory: 'weight', price: 4500, min: 60, perishable: true, supplier: 1 },
  { code: 'EL-SCAN01', name: 'Handheld Barcode Scanner', category: 'Electronics', unit: 'pcs', unitCategory: 'count', price: 85000, min: 5, supplier: 3 },
  { code: 'EL-PRINT01', name: 'Thermal Label Printer', category: 'Electronics', unit: 'pcs', unitCategory: 'count', price: 240000, min: 3, supplier: 3 },
  { code: 'EL-TAB10', name: 'Rugged Tablet 10"', category: 'Electronics', unit: 'pcs', unitCategory: 'count', price: 310000, min: 4, supplier: 3 },
  { code: 'EL-PWR20K', name: 'Power Bank 20,000mAh', category: 'Electronics', unit: 'pcs', unitCategory: 'count', price: 28000, min: 15, supplier: 3 },
  { code: 'PK-FILM', name: 'Stretch Film Roll', category: 'Packaging', unit: 'roll', unitCategory: 'count', price: 15000, min: 30, supplier: 0 },
  { code: 'PK-BOXM50', name: 'Corrugated Box Medium (50)', category: 'Packaging', unit: 'bundle', unitCategory: 'count', price: 32000, min: 20, supplier: 0 },
  { code: 'PK-BUBBLE', name: 'Bubble Wrap 50m', category: 'Packaging', unit: 'roll', unitCategory: 'length', price: 18000, min: 15, supplier: 0 },
  { code: 'PK-PALLET', name: 'Wooden Pallet', category: 'Packaging', unit: 'pcs', unitCategory: 'count', price: 12000, min: 40, supplier: 0 },
  { code: 'SF-VEST', name: 'Hi-Vis Safety Vest', category: 'Safety', unit: 'pcs', unitCategory: 'count', price: 5500, min: 50, supplier: 2 },
  { code: 'SF-HELMET', name: 'Safety Helmet', category: 'Safety', unit: 'pcs', unitCategory: 'count', price: 9000, min: 30, supplier: 2 },
  { code: 'SF-EXT6', name: 'Fire Extinguisher 6kg', category: 'Safety', unit: 'pcs', unitCategory: 'count', price: 45000, min: 10, supplier: 2 },
  { code: 'CN-CEM50', name: 'Cement 50kg Bag', category: 'Construction', unit: 'bag', unitCategory: 'weight', price: 13500, min: 100, supplier: 4 },
  { code: 'CN-ROD12', name: 'Steel Rod 12mm', category: 'Construction', unit: 'pcs', unitCategory: 'length', price: 11000, min: 80, supplier: 4 },
  { code: 'CN-PAINT20', name: 'Exterior Paint 20L', category: 'Construction', unit: 'bucket', unitCategory: 'volume', price: 52000, min: 15, supplier: 4 },
  { code: 'MD-FAK', name: 'First Aid Kit', category: 'Medical', unit: 'kit', unitCategory: 'count', price: 25000, min: 20, supplier: 5 },
  { code: 'MD-SANI5', name: 'Hand Sanitizer 5L', category: 'Medical', unit: 'jerrycan', unitCategory: 'volume', price: 16000, min: 25, perishable: true, supplier: 5 },
  { code: 'MD-GLOVE100', name: 'Nitrile Gloves (100)', category: 'Medical', unit: 'box', unitCategory: 'count', price: 9500, min: 40, supplier: 5 },
  { code: 'OF-PAPER', name: 'A4 Paper Ream', category: 'Office', unit: 'ream', unitCategory: 'count', price: 5200, min: 60, supplier: 0 },
  { code: 'OF-TONER', name: 'Printer Toner Cartridge', category: 'Office', unit: 'pcs', unitCategory: 'count', price: 68000, min: 8, supplier: 3 },
];

const CUSTOMERS = [
  'Ubumwe Grocers', 'Inzozi Bakery', 'Hirwa Hardware', 'Ineza Clinic', 'Akeza Boutique', 'Twese Supermarket',
  'Imena Electronics', 'Agaciro Office Supplies', 'Isoko Fresh Market', 'Ubuzima Pharmacy', 'Amahoro Café',
  'Intore Construction', 'Urumuri Primary School', 'Iriba Water Services', 'Kundwa Restaurant', 'Mpore Guest House',
  'Gisubizo Hotel', 'Umurava Tech Hub', 'Ikirezi Salon', 'Inyenyeri Mini-Mart', 'Rugwiro Logistics', 'Ihirwe Stationery',
];

const DRIVERS = [
  'Jean Bosco Habimana', 'Eric Niyonzima', 'Claude Mugisha', 'Patrick Uwimana', 'Aline Mukamana',
  'Emmanuel Nshimiyimana', 'Olivier Hakizimana', 'Didier Ndayisaba', 'Vestine Uwera', 'Innocent Bizimana',
];

const VEHICLES: [string, string, number, string, string, number][] = [
  ['RAD 214 C', 'Van', 1500, 'Diesel', 'Toyota HiAce', 2021],
  ['RAE 879 B', 'Truck', 7000, 'Diesel', 'Isuzu NPR', 2020],
  ['RAF 102 A', 'Pickup', 1000, 'Diesel', 'Toyota Hilux', 2022],
  ['RAG 553 D', 'Van', 1800, 'Diesel', 'Nissan Urvan', 2019],
  ['RAH 330 C', 'Truck', 10000, 'Diesel', 'Mitsubishi Fuso Canter', 2018],
  ['RAB 771 M', 'Motorcycle', 80, 'Petrol', 'TVS Apache', 2023],
  ['RAB 905 M', 'Motorcycle', 80, 'Petrol', 'Bajaj Boxer', 2022],
  ['RAD 640 E', 'Van', 1500, 'Electric', 'BYD T3', 2024],
];

const FAILURE_REASONS = ['Customer not available', 'Wrong address', 'Customer refused delivery', 'Road closed', 'Business closed'];
const RETURN_REASONS = ['Damaged packaging', 'Wrong item delivered', 'Expired product', 'Customer changed mind', 'Quantity mismatch'];

// ---------------------------------------------------------------------------

async function ensureUsers() {
  const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');
  const active = await prisma.user.findMany({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } });
  const byRole = (role: string) => active.find((u) => u.role === role);

  if (isLocal) {
    // Local development only: create one user per role so you can sign in.
    const password = await bcrypt.hash('DevPassw0rd!', 10);
    const devUsers = [
      { email: 'admin@local.test', name: 'Manzi Admin', role: 'ADMIN' },
      { email: 'warehouse@local.test', name: 'Grace Warehouse', role: 'WAREHOUSE_STAFF' },
      { email: 'dispatch@local.test', name: 'Eric Dispatch', role: 'DISPATCH_OFFICER' },
      { email: 'driver@local.test', name: 'Jean Driver', role: 'DRIVER' },
    ];
    for (const u of devUsers) {
      if (!byRole(u.role)) {
        const [firstName, ...rest] = u.name.split(' ');
        active.push(await prisma.user.create({
          data: { ...u, role: u.role as any, firstName, lastName: rest.join(' '), password, status: 'ACTIVE', phone: phone() },
        }));
      }
    }
    console.log('Local dev users (password DevPassw0rd!): admin@local.test, warehouse@local.test, dispatch@local.test, driver@local.test');
  }

  const admin = byRole('ADMIN') || active.find((u) => u.role === 'ADMIN');
  if (!admin) throw new Error('No active ADMIN user found; create one first.');
  return {
    admin,
    warehouse: byRole('WAREHOUSE_STAFF') || admin,
    dispatch: byRole('DISPATCH_OFFICER') || admin,
    driverUser: byRole('DRIVER'),
  };
}

async function main() {
  if (await prisma.warehouse.findUnique({ where: { code: 'KGL-GKD' } })) {
    console.log('Sample data already present (warehouse KGL-GKD exists). Nothing to do.');
    return;
  }

  const people = await ensureUsers();
  const staff = [people.admin, people.warehouse, people.dispatch];
  console.log(`Acting users: admin=${people.admin.email}, warehouse=${people.warehouse.email}, dispatch=${people.dispatch.email}`);

  // --- Warehouses -----------------------------------------------------------
  const warehouses = [];
  for (const w of WAREHOUSES) {
    warehouses.push(await prisma.warehouse.create({
      data: { code: w.code, name: w.name, city: w.city, address: w.address, latitude: dec(w.lat), longitude: dec(w.lng), capacity: w.capacity, managerId: people.warehouse.id },
    }));
  }

  // --- Suppliers ------------------------------------------------------------
  const suppliers = [];
  for (const s of SUPPLIERS) {
    const slug = s.name.toLowerCase().replace(/[^a-z]+/g, '');
    suppliers.push(await prisma.supplier.create({
      data: { ...s, rating: dec(s.rating), email: `orders@${slug.slice(0, 14)}.rw`, phone: phone(), address: `${pick(NEIGHBORHOODS)[0]}, Kigali` },
    }));
  }

  // --- Inventory items ------------------------------------------------------
  const existingItems = await prisma.inventoryItem.findMany();
  const items: { id: number; name: string; unit: string; price: number; min: number; perishable: boolean; supplierIdx: number }[] =
    existingItems.map((i) => ({ id: i.id, name: i.name, unit: i.unit, price: Number(i.unitPrice) || 5000, min: i.minQuantity || 10, perishable: false, supplierIdx: int(0, suppliers.length - 1) }));
  for (const spec of ITEMS) {
    const found = await prisma.inventoryItem.findUnique({ where: { code: spec.code } });
    const item = found || await prisma.inventoryItem.create({
      data: {
        code: spec.code, name: spec.name, category: spec.category, unit: spec.unit, unitCategory: spec.unitCategory,
        unitPrice: dec(spec.price), minQuantity: spec.min, quantity: 0, location: `${pick(['A', 'B', 'C', 'D'])}-${int(1, 12)}-${int(1, 5)}`,
        barcode: `629${pad(int(0, 999999999), 9)}${int(0, 9)}`, supplier: SUPPLIERS[spec.supplier].name,
        description: `${spec.name} supplied by ${SUPPLIERS[spec.supplier].name}.`,
      },
    });
    if (!found) items.push({ id: item.id, name: item.name, unit: item.unit, price: spec.price, min: spec.min, perishable: !!spec.perishable, supplierIdx: spec.supplier });
  }

  // --- Vehicles & drivers ---------------------------------------------------
  for (const [plate, type, capacity, fuelType, model, year] of VEHICLES) {
    if (!(await prisma.vehicle.findUnique({ where: { plateNumber: plate } }))) {
      await prisma.vehicle.create({
        data: { plateNumber: plate, type, capacity, fuelType, vehicleModel: model, year, managerId: people.dispatch.id, lastMaintenance: daysAgo(int(10, 80)) },
      });
    }
  }
  const vehicles = await prisma.vehicle.findMany({ orderBy: { id: 'asc' } });

  for (const [i, name] of DRIVERS.entries()) {
    const license = `RW-DL-${pad(240100 + i, 6)}`;
    if (!(await prisma.driver.findUnique({ where: { licenseNumber: license } }))) {
      await prisma.driver.create({
        data: {
          name, licenseNumber: license, phone: phone(), experience: int(1, 12), rating: dec(jitter(4.4, 0.8)),
          email: `${name.split(' ')[0].toLowerCase()}.${i}@drivers.waretrack.rw`, managerId: people.dispatch.id,
          address: `${pick(NEIGHBORHOODS)[0]}, Kigali`, hireDate: daysAgo(int(120, 1500)), licenseExpiry: new Date(now.getTime() + int(-20, 700) * DAY),
          currentVehicleId: vehicles[i % vehicles.length]?.id,
        },
      });
    }
  }
  // Give the real driver account a driver profile so its dashboard has data
  if (people.driverUser && !(await prisma.driver.findUnique({ where: { userId: people.driverUser.id } }))) {
    await prisma.driver.create({
      data: {
        userId: people.driverUser.id, name: people.driverUser.name, email: people.driverUser.email, phone: people.driverUser.phone || phone(),
        licenseNumber: `RW-DL-${pad(250000 + people.driverUser.id, 6)}`, experience: 5, rating: dec(4.7), managerId: people.dispatch.id,
        hireDate: daysAgo(400), licenseExpiry: new Date(now.getTime() + 500 * DAY), currentVehicleId: vehicles[0]?.id,
      },
    });
  }
  const drivers = await prisma.driver.findMany({ orderBy: { id: 'asc' } });
  const ownDriver = people.driverUser ? drivers.find((d) => d.userId === people.driverUser!.id) : undefined;

  // --- Customers ------------------------------------------------------------
  const customerPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  const customers = [];
  for (const [i, name] of CUSTOMERS.entries()) {
    const [hood, lat, lng] = NEIGHBORHOODS[i % NEIGHBORHOODS.length];
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.$/, '')}@example.rw`;
    const existing = await prisma.customer.findUnique({ where: { email } });
    const c = existing || await prisma.customer.create({ data: { name, email, password: customerPassword, phone: phone(), address: `${hood}, Kigali` } });
    customers.push({ id: c.id, name, email, phone: c.phone || phone(), hood, lat, lng });
  }

  // --- Orders, dispatches, payments, invoices -------------------------------
  const lastOrder = await prisma.deliveryOrder.findFirst({ orderBy: { id: 'desc' } });
  let orderSeq = (lastOrder?.id || 0) + 1000;
  const ORDER_DAYS = 120;
  const stockOut = new Map<number, number>();
  const orderEvents: { at: Date; summary: string; entityId: number; userId: number; action: string }[] = [];
  let ordersCreated = 0;

  for (let day = ORDER_DAYS; day >= 0; day--) {
    const date = daysAgo(day);
    const weekday = date.getDay();
    const growth = 1 + (ORDER_DAYS - day) / ORDER_DAYS; // business is growing
    const base = weekday === 0 ? 0.6 : weekday === 6 ? 1.2 : 2.2;
    const count = Math.max(0, Math.round(base * growth + jitter(0, 1.6)));

    for (let n = 0; n < count; n++) {
      const customer = pick(customers);
      const createdAt = daysAgo(day, int(7, 17));
      const priority = weighted([['HIGH', 2], ['MEDIUM', 5], ['LOW', 3]]) as 'HIGH' | 'MEDIUM' | 'LOW';
      const lines = Array.from({ length: weighted([[1, 4], [2, 4], [3, 2], [4, 1]]) }, () => pick(items));
      const uniqueLines = Array.from(new Map(lines.map((l) => [l.id, l])).values());
      const orderItems = uniqueLines.map((item) => {
        const quantity = int(1, item.price > 100000 ? 2 : item.price > 30000 ? 6 : 20);
        return { itemId: item.id, itemName: item.name, unit: item.unit, quantity, unitPrice: dec(item.price), totalPrice: dec(item.price * quantity) };
      });
      const total = orderItems.reduce((s, l) => s + Number(l.totalPrice), 0);

      const age = day;
      const status = (age > 6
        ? weighted([['DELIVERED', 85], ['CANCELLED', 5], ['FAILED', 5], ['RETURNED', 5]])
        : age > 2
          ? weighted([['DELIVERED', 60], ['IN_TRANSIT', 15], ['DISPATCHED', 12], ['PENDING', 8], ['FAILED', 3], ['CANCELLED', 2]])
          : weighted([['PENDING', 40], ['DISPATCHED', 25], ['IN_TRANSIT', 20], ['DELIVERED', 15]])) as any;

      const scheduledDate = new Date(createdAt.getTime() + int(2, 30) * HOUR);
      scheduledDate.setMinutes(0, 0, 0);
      const slotStart = new Date(scheduledDate);
      const slotEnd = new Date(slotStart.getTime() + 2 * HOUR);
      const slaHours = priority === 'HIGH' ? 24 : priority === 'MEDIUM' ? 48 : 96;
      const slaDeadline = new Date(createdAt.getTime() + slaHours * HOUR);
      const late = chance(0.12);
      const deliveredAt = status === 'DELIVERED'
        ? new Date((late ? slaDeadline.getTime() + int(1, 20) * HOUR : slotStart.getTime() + int(10, 110) * 60000))
        : null;
      const needsDriver = status !== 'PENDING' && status !== 'CANCELLED';
      const driver = needsDriver ? (ownDriver && chance(0.18) ? ownDriver : pick(drivers)) : null;
      const vehicle = needsDriver ? (vehicles.find((v) => v.id === driver?.currentVehicleId) || pick(vehicles)) : null;
      const paid = status === 'DELIVERED' ? chance(0.86) : status === 'IN_TRANSIT' || status === 'DISPATCHED' ? chance(0.4) : false;
      const paymentMethod = weighted([['MTN_MOMO', 5], ['AIRTEL_MONEY', 2], ['CASH', 2], ['BANK_TRANSFER', 1]]);
      const orderNumber = `ORD-${pad(++orderSeq)}`;

      const order = await prisma.deliveryOrder.create({
        data: {
          orderNumber, customerId: customer.id, customerName: customer.name, customerEmail: customer.email,
          deliveryAddress: `${pick(['KG', 'KK', 'KN'])} ${int(1, 700)} St, ${customer.hood}, Kigali`, contactNumber: customer.phone,
          latitude: dec(jitter(customer.lat, 0.012)), longitude: dec(jitter(customer.lng, 0.012)),
          priority, status, orderType: weighted([['STANDARD', 6], ['EXPRESS', 2], ['BULK', 2]]),
          paymentMethod, totalAmount: dec(total), paymentStatus: paid ? 'PAID' : status === 'RETURNED' ? 'REFUNDED' : 'UNPAID',
          deliveryInstructions: chance(0.3) ? pick(['Call on arrival', 'Deliver to reception', 'Gate 2, ask for the manager', 'Fragile, handle with care']) : null,
          driverId: driver?.id, vehicleId: vehicle?.id, createdBy: pick(staff).id,
          scheduledDate, timeSlotStart: slotStart, timeSlotEnd: slotEnd, slaDeadline, deliveredAt,
          warehouseId: weighted([[warehouses[0].id, 6], [warehouses[1].id, 3], [warehouses[2].id, 1], [warehouses[3].id, 1]]),
          failureReason: status === 'FAILED' ? pick(FAILURE_REASONS) : null,
          deliveryAttempts: status === 'FAILED' ? int(1, 2) : status === 'DELIVERED' ? 1 : 0,
          createdAt, updatedAt: deliveredAt || createdAt,
          items: { create: orderItems.map((l) => ({ ...l, createdAt })) },
        },
      });
      ordersCreated++;
      orderEvents.push({ at: createdAt, summary: `Created order ${orderNumber} for ${customer.name}`, entityId: order.id, userId: order.createdBy, action: 'CREATE' });

      if (status !== 'CANCELLED') {
        for (const l of orderItems) stockOut.set(l.itemId, (stockOut.get(l.itemId) || 0) + l.quantity);
      }

      if (driver && vehicle) {
        const dispatchedAt = new Date(slotStart.getTime() - int(20, 90) * 60000);
        await prisma.dispatch.create({
          data: {
            orderId: order.id, driverId: driver.id, vehicleId: vehicle.id, scheduledDate: slotStart,
            dispatchedAt, estimatedDelivery: slotEnd, actualDelivery: deliveredAt,
            fuelAllowance: dec(int(3, 15) * 1000), route: `${WAREHOUSES[0].name} → ${customer.hood}`,
            status: status === 'FAILED' || status === 'RETURNED' ? 'CANCELLED' : status,
            createdBy: people.dispatch.id, createdAt: dispatchedAt,
          },
        });
        if (dispatchedAt < now) orderEvents.push({ at: dispatchedAt, summary: `Dispatched ${orderNumber} with ${driver.name} (${vehicle.plateNumber})`, entityId: order.id, userId: people.dispatch.id, action: 'UPDATE' });
      }

      if (paid) {
        await prisma.payment.create({
          data: {
            orderId: order.id, provider: paymentMethod, amount: dec(total), status: 'SUCCESSFUL',
            phoneNumber: paymentMethod.includes('MONEY') || paymentMethod === 'MTN_MOMO' ? customer.phone : null,
            externalRef: `TX${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
            createdAt: deliveredAt || createdAt, completedAt: deliveredAt || createdAt,
          },
        });
      }
      if (status === 'DELIVERED') {
        const tax = Math.round(total * 0.18);
        await prisma.invoice.create({
          data: {
            invoiceNumber: `INV-${pad(order.id)}`, orderId: order.id, subtotal: dec(total), tax: dec(tax), total: dec(total + tax),
            status: paid ? 'PAID' : 'UNPAID', issuedAt: deliveredAt!, dueDate: new Date(deliveredAt!.getTime() + 14 * DAY), paidAt: paid ? deliveredAt : null,
          },
        });
        if (driver && chance(0.45)) {
          await prisma.customerRating.create({
            data: { customerId: customer.id, orderId: order.id, driverId: driver.id, rating: weighted([[5, 6], [4, 3], [3, 1]]), comment: chance(0.4) ? pick(['Very professional', 'On time, thank you', 'Friendly driver', 'A bit late but fine']) : null, createdAt: deliveredAt! },
          }).catch(() => undefined);
        }
      }
      if (status === 'FAILED' || status === 'RETURNED' || (status === 'DELIVERED' && chance(0.03))) {
        const isFailed = status === 'FAILED';
        await prisma.returnRequest.create({
          data: {
            returnNumber: `RET-${pad(order.id)}`, orderId: order.id, type: isFailed ? 'FAILED_DELIVERY' : 'RETURN',
            reason: isFailed ? order.failureReason! : pick(RETURN_REASONS),
            status: isFailed ? weighted([['RESCHEDULED', 3], ['REQUESTED', 2]]) : weighted([['REFUNDED', 3], ['RECEIVED', 2], ['APPROVED', 1], ['REQUESTED', 1]]),
            rescheduledDate: isFailed ? new Date(createdAt.getTime() + int(1, 3) * DAY) : null,
            refundAmount: dec(isFailed ? 0 : total), createdBy: people.dispatch.id,
            createdAt: new Date(createdAt.getTime() + int(4, 40) * HOUR),
          },
        });
      }
    }
  }

  // --- Purchase orders & stock received -------------------------------------
  const stockIn = new Map<number, number>();
  let poSeq = 1;
  for (let week = 13; week >= 0; week--) {
    const poCount = int(1, 2);
    for (let k = 0; k < poCount; k++) {
      const supplierIdx = int(0, suppliers.length - 1);
      const supplier = suppliers[supplierIdx];
      const supplierItems = items.filter((i) => i.supplierIdx === supplierIdx);
      const lines = (supplierItems.length ? supplierItems : items).slice(0, int(2, 4));
      const createdAt = daysAgo(week * 7 + int(0, 4), 10);
      const status = week > 1 ? weighted([['RECEIVED', 9], ['CANCELLED', 1]]) : weighted([['SENT', 3], ['DRAFT', 1]]);
      const poItems = lines.map((l) => {
        const quantity = Math.max(10, Math.round(l.min * (1.5 + rand() * 2)));
        return { itemId: l.id, quantity, receivedQuantity: status === 'RECEIVED' ? quantity : 0, unitCost: dec(l.price * 0.72) };
      });
      const totalAmount = poItems.reduce((s, l) => s + l.quantity * Number(l.unitCost), 0);
      const receivedAt = status === 'RECEIVED' ? new Date(createdAt.getTime() + SUPPLIERS[supplierIdx].leadTimeDays * DAY) : null;
      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-${now.getFullYear()}-${pad(poSeq++, 4)}`, supplierId: supplier.id, warehouseId: warehouses[week % 2].id,
          status, expectedDate: new Date(createdAt.getTime() + SUPPLIERS[supplierIdx].leadTimeDays * DAY), receivedAt,
          totalAmount: dec(totalAmount), autoGenerated: chance(0.3), createdBy: people.warehouse.id, createdAt,
          notes: chance(0.3) ? 'Restock before month-end demand' : null,
          items: { create: poItems },
        },
      });
      if (status === 'RECEIVED') {
        for (const l of poItems) {
          stockIn.set(l.itemId, (stockIn.get(l.itemId) || 0) + l.quantity);
          const spec = items.find((i) => i.id === l.itemId)!;
          await prisma.inventoryBatch.create({
            data: {
              itemId: l.itemId, batchNumber: `B${pad(po.id, 4)}-${l.itemId}`, quantity: l.quantity, receivedAt: receivedAt!,
              warehouseId: po.warehouseId, purchaseOrderId: po.id,
              expiryDate: spec.perishable ? new Date(receivedAt!.getTime() + int(20, 140) * DAY) : null,
            },
          });
          await prisma.inventoryHistory.create({
            data: { itemId: l.itemId, action: 'stock_in', quantity: l.quantity, previousQuantity: 0, newQuantity: l.quantity, notes: `Received ${po.poNumber}`, performedBy: people.warehouse.id, performedAt: receivedAt! },
          });
        }
      }
    }
  }

  // --- Stock-out history (daily aggregates per item) -------------------------
  const outRows = await prisma.orderItem.findMany({
    where: { order: { status: { not: 'CANCELLED' }, createdAt: { gte: daysAgo(ORDER_DAYS + 1) } } },
    select: { itemId: true, quantity: true, order: { select: { createdAt: true, orderNumber: true } } },
  });
  const history = outRows.map((r) => ({
    itemId: r.itemId, action: 'stock_out', quantity: r.quantity, previousQuantity: 0, newQuantity: 0,
    notes: `Picked for ${r.order.orderNumber}`, performedBy: people.warehouse.id, performedAt: r.order.createdAt,
  }));
  for (let i = 0; i < history.length; i += 500) await prisma.inventoryHistory.createMany({ data: history.slice(i, i + 500) });

  // --- Final stock levels and per-warehouse split ----------------------------
  for (const item of items) {
    const opening = Math.round(item.min * (3 + rand() * 3));
    let quantity = Math.max(0, opening + (stockIn.get(item.id) || 0) - (stockOut.get(item.id) || 0));
    // Make a realistic mix: a few items low or out of stock
    if (chance(0.12)) quantity = int(1, Math.max(1, item.min - 1));
    if (chance(0.04)) quantity = 0;
    if (quantity < item.min * 0.5 && chance(0.5)) quantity = Math.round(item.min * (1.2 + rand() * 2));
    await prisma.inventoryItem.update({ where: { id: item.id }, data: { quantity, lastUpdated: daysAgo(int(0, 5)) } });
    const shares = [0.5, 0.3, 0.12, 0.08];
    let remaining = quantity;
    for (const [w, share] of shares.entries()) {
      const q = w === shares.length - 1 ? remaining : Math.round(quantity * share);
      remaining -= q;
      await prisma.warehouseStock.create({ data: { warehouseId: warehouses[w].id, itemId: item.id, quantity: Math.max(0, q) } });
    }
  }

  // --- Stock transfers --------------------------------------------------------
  for (let i = 0; i < 10; i++) {
    const item = pick(items);
    const from = warehouses[int(0, 1)];
    const to = warehouses[int(2, 3)];
    const createdAt = daysAgo(int(1, 60), 11);
    const status = i < 2 ? 'IN_TRANSIT' : i < 3 ? 'PENDING' : 'COMPLETED';
    await prisma.stockTransfer.create({
      data: {
        transferNumber: `TR-${pad(i + 1, 4)}`, fromWarehouseId: from.id, toWarehouseId: to.id, itemId: item.id, quantity: int(5, 40),
        status, createdBy: people.warehouse.id, createdAt, completedAt: status === 'COMPLETED' ? new Date(createdAt.getTime() + 2 * DAY) : null,
        notes: `Rebalance stock for ${to.city}`,
      },
    });
  }

  // --- Vehicle maintenance & health ------------------------------------------
  for (const v of vehicles) {
    for (let m = 0; m < int(2, 4); m++) {
      const scheduled = daysAgo(int(5, 170), 8);
      const completed = scheduled < daysAgo(3) ? new Date(scheduled.getTime() + int(0, 2) * DAY) : null;
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: v.id, type: pick(['ROUTINE', 'OIL_CHANGE', 'TIRE_REPLACEMENT', 'BRAKE_SERVICE', 'INSPECTION']),
          description: pick(['Scheduled service', 'Oil and filter change', 'Front tyres replaced', 'Brake pads replaced', 'Annual inspection']),
          cost: dec(int(25, 450) * 1000), odometerReading: int(15000, 160000), performedBy: pick(['Gikondo Auto Garage', 'Remera Motors', 'In-house mechanic']),
          scheduledDate: scheduled, completedDate: completed,
        },
      });
    }
    // An upcoming service for the calendar
    await prisma.maintenanceRecord.create({
      data: { vehicleId: v.id, type: 'ROUTINE', description: 'Upcoming scheduled service', cost: dec(int(40, 120) * 1000), scheduledDate: new Date(now.getTime() + int(2, 28) * DAY) },
    });
    for (let month = 5; month >= 0; month--) {
      const health = Math.max(48, Math.min(99, int(70, 98) - month * int(0, 2)));
      await prisma.vehicleHealth.create({
        data: {
          vehicleId: v.id, odometerReading: 20000 + (6 - month) * int(1500, 4000) + v.id * 9000, fuelEfficiency: dec(jitter(v.type === 'Truck' ? 6 : v.type === 'Motorcycle' ? 38 : 11, 2)),
          engineHours: 400 + (6 - month) * int(60, 140), healthScore: health,
          predictedMaintenanceDate: new Date(now.getTime() + int(5, 60) * DAY), maintenanceCostEstimate: dec(int(30, 300) * 1000),
          recordedAt: daysAgo(month * 30 + int(0, 5)),
        },
      });
    }
  }

  // --- Driver statuses, live positions and leaderboard ----------------------
  const inTransit = await prisma.deliveryOrder.findMany({ where: { status: { in: ['IN_TRANSIT', 'DISPATCHED'] } }, select: { driverId: true, latitude: true, longitude: true } });
  for (const d of drivers) {
    const active = inTransit.find((o) => o.driverId === d.id);
    const [, lat, lng] = pick(NEIGHBORHOODS);
    await prisma.driver.update({
      where: { id: d.id },
      data: {
        status: active ? 'ON_DUTY' : chance(0.7) ? 'AVAILABLE' : 'OFF_DUTY',
        currentLat: dec(active ? jitter(Number(active.latitude), 0.02) : jitter(lat, 0.01)),
        currentLng: dec(active ? jitter(Number(active.longitude), 0.02) : jitter(lng, 0.01)),
        lastLocationAt: new Date(now.getTime() - int(1, 25) * 60000),
      },
    });
  }
  for (const v of vehicles) {
    const busy = inTransit.some((o) => drivers.find((d) => d.id === o.driverId)?.currentVehicleId === v.id);
    if (busy) await prisma.vehicle.update({ where: { id: v.id }, data: { status: 'IN_USE' } });
  }

  for (let m = 3; m >= 0; m--) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
    const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const rows = [];
    for (const d of drivers) {
      const orders = await prisma.deliveryOrder.findMany({
        where: { driverId: d.id, createdAt: { gte: start, lt: end }, status: { in: ['DELIVERED', 'FAILED', 'RETURNED'] } },
        select: { status: true, totalAmount: true },
      });
      const delivered = orders.filter((o) => o.status === 'DELIVERED');
      rows.push({
        driverId: d.id, month, totalDeliveries: delivered.length,
        totalRevenue: dec(delivered.reduce((s, o) => s + Number(o.totalAmount), 0)),
        successRate: dec(orders.length ? (delivered.length / orders.length) * 100 : 0), points: delivered.length * 10,
      });
    }
    rows.sort((a, b) => b.points - a.points).forEach((r, i) => Object.assign(r, { rank: i + 1 }));
    await prisma.driverLeaderboard.createMany({ data: rows, skipDuplicates: true });
  }
  for (const d of drivers.slice(0, 6)) {
    await prisma.driverAchievement.create({ data: { driverId: d.id, achievementType: 'ON_TIME_STREAK', title: '10 on-time deliveries', description: 'Ten deliveries in a row within the time slot', points: 50, earnedAt: daysAgo(int(1, 40)) } });
  }

  // --- Forecasts, smart alerts ------------------------------------------------
  for (const item of items.slice(0, 14)) {
    const avg = (stockOut.get(item.id) || 20) / ORDER_DAYS;
    for (let d = 1; d <= 14; d++) {
      const date = new Date(now.getTime() + d * DAY);
      date.setHours(0, 0, 0, 0);
      await prisma.inventoryForecast.create({
        data: { itemId: item.id, forecastDate: date, predictedDemand: Math.max(0, Math.round(avg * (date.getDay() === 0 ? 0.5 : 1.1) * (1 + d * 0.01) + jitter(0, 2))), confidenceLevel: dec(jitter(82, 10)), seasonalFactor: dec(date.getDay() === 6 ? 1.2 : 1), trendFactor: dec(1.05) },
      }).catch(() => undefined);
    }
  }

  // --- Chat between dispatch and the driver account --------------------------
  if (people.driverUser && people.dispatch.id !== people.driverUser.id) {
    const convo = [
      [people.dispatch.id, 'Good morning! You have 4 drops in Kimihurura today. Start with the clinic.'],
      [people.driverUser.id, 'Morning. Noted, leaving Gikondo in 10 minutes.'],
      [people.dispatch.id, 'Traffic is heavy near Sonatubes, take KK 15 Rd instead.'],
      [people.driverUser.id, 'Thanks. First delivery done, customer signed.'],
      [people.dispatch.id, 'Great work 👍 Next one is marked high priority.'],
    ] as const;
    for (const [i, [sender, message]] of convo.entries()) {
      await prisma.chatMessage.create({
        data: { senderId: sender, receiverId: sender === people.dispatch.id ? people.driverUser.id : people.dispatch.id, message, read: i < 4, createdAt: new Date(now.getTime() - (convo.length - i) * 12 * 60000) },
      });
    }
  }

  // --- Audit trail -------------------------------------------------------------
  const userById = new Map([people.admin, people.warehouse, people.dispatch].map((u) => [u.id, u]));
  const audit = orderEvents
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 400)
    .map((e) => {
      const u = userById.get(e.userId) || people.admin;
      return { userId: u.id, userName: u.name, userRole: u.role, action: e.action, entityType: 'Order', entityId: String(e.entityId), summary: e.summary, createdAt: e.at };
    });
  await prisma.auditLog.createMany({ data: audit });

  // --- Settings rows that some screens expect --------------------------------
  for (const u of [people.admin, people.warehouse, people.dispatch]) {
    await prisma.userPreferences.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
  }

  console.log(`Done: ${warehouses.length} warehouses, ${suppliers.length} suppliers, ${items.length} items, ${drivers.length} drivers, ${vehicles.length} vehicles, ${ordersCreated} orders.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
