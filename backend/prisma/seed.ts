import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const hashedPassword = await bcrypt.hash('admin123', 12)
  const staffPassword = await bcrypt.hash('staff123', 12)
  const driverPassword = await bcrypt.hash('driver123', 12)
  const dispatchPassword = await bcrypt.hash('dispatch123', 12)

  // ─── Users ────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@waretrack.com' },
    update: {},
    create: {
      firstName: 'System',
      lastName: 'Administrator',
      name: 'System Administrator',
      email: 'admin@waretrack.com',
      password: hashedPassword,
      phone: '+250786416374',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  })
  console.log('✅ Admin user created:', admin.email)

  const warehouseStaff = await prisma.user.upsert({
    where: { email: 'warehouse@waretrack.com' },
    update: {},
    create: {
      firstName: 'Alice',
      lastName: 'Mukamana',
      name: 'Alice Mukamana',
      email: 'warehouse@waretrack.com',
      password: staffPassword,
      phone: '+250788123456',
      role: 'WAREHOUSE_STAFF',
      status: 'ACTIVE'
    }
  })
  console.log('✅ Warehouse staff created:', warehouseStaff.email)

  const dispatchOfficer = await prisma.user.upsert({
    where: { email: 'dispatch@waretrack.com' },
    update: {},
    create: {
      firstName: 'Jean',
      lastName: 'Habimana',
      name: 'Jean Habimana',
      email: 'dispatch@waretrack.com',
      password: dispatchPassword,
      phone: '+250789654321',
      role: 'DISPATCH_OFFICER',
      status: 'ACTIVE'
    }
  })
  console.log('✅ Dispatch officer created:', dispatchOfficer.email)

  const driverUser1 = await prisma.user.upsert({
    where: { email: 'driver1@waretrack.com' },
    update: {},
    create: {
      firstName: 'Patrick',
      lastName: 'Niyonzima',
      name: 'Patrick Niyonzima',
      email: 'driver1@waretrack.com',
      password: driverPassword,
      phone: '+250788111222',
      role: 'DRIVER',
      status: 'ACTIVE'
    }
  })

  const driverUser2 = await prisma.user.upsert({
    where: { email: 'driver2@waretrack.com' },
    update: {},
    create: {
      firstName: 'Emmanuel',
      lastName: 'Uwimana',
      name: 'Emmanuel Uwimana',
      email: 'driver2@waretrack.com',
      password: driverPassword,
      phone: '+250788333444',
      role: 'DRIVER',
      status: 'ACTIVE'
    }
  })

  const driverUser3 = await prisma.user.upsert({
    where: { email: 'driver3@waretrack.com' },
    update: {},
    create: {
      firstName: 'Claude',
      lastName: 'Ndayisaba',
      name: 'Claude Ndayisaba',
      email: 'driver3@waretrack.com',
      password: driverPassword,
      phone: '+250788555666',
      role: 'DRIVER',
      status: 'ACTIVE'
    }
  })
  console.log('✅ Driver users created')

  // ─── Inventory Items ──────────────────────────────────────
  const inventoryItems = [
    // Electronics
    { name: 'Dell Laptop XPS 15', code: 'ELEC-001', category: 'Electronics', quantity: 25, minQuantity: 5, unit: 'pcs', unitCategory: 'Electronics', location: 'A1-01', unitPrice: 1299.99, supplier: 'Dell Technologies', description: 'High-performance laptop for business use' },
    { name: 'HP ProBook 450 G10', code: 'ELEC-002', category: 'Electronics', quantity: 30, minQuantity: 8, unit: 'pcs', unitCategory: 'Electronics', location: 'A1-02', unitPrice: 899.99, supplier: 'HP Inc.', description: '15.6 inch business laptop' },
    { name: 'Samsung 27" Monitor', code: 'ELEC-003', category: 'Electronics', quantity: 40, minQuantity: 10, unit: 'pcs', unitCategory: 'Electronics', location: 'A1-03', unitPrice: 349.99, supplier: 'Samsung Electronics', description: '4K UHD LED Monitor' },
    { name: 'Wireless Mouse M720', code: 'ELEC-004', category: 'Electronics', quantity: 100, minQuantity: 20, unit: 'pcs', unitCategory: 'Electronics', location: 'A1-04', unitPrice: 49.99, supplier: 'Logitech', description: 'Triathlon multi-device wireless mouse' },
    { name: 'USB-C Docking Station', code: 'ELEC-005', category: 'Electronics', quantity: 15, minQuantity: 5, unit: 'pcs', unitCategory: 'Electronics', location: 'A1-05', unitPrice: 189.99, supplier: 'Anker', description: '13-in-1 USB-C dock' },
    // Office Supplies
    { name: 'A4 Printing Paper', code: 'OFF-001', category: 'Office Supplies', quantity: 500, minQuantity: 100, unit: 'box', unitCategory: 'Office Supplies', location: 'B1-01', unitPrice: 12.50, supplier: 'Staples Rwanda', description: '80gsm white A4 paper (500 sheets/box)' },
    { name: 'Ballpoint Pens (Box)', code: 'OFF-002', category: 'Office Supplies', quantity: 200, minQuantity: 50, unit: 'box', unitCategory: 'Office Supplies', location: 'B1-02', unitPrice: 8.99, supplier: 'BIC', description: 'Blue ink, 12 pens per box' },
    { name: 'Sticky Notes Pack', code: 'OFF-003', category: 'Office Supplies', quantity: 150, minQuantity: 30, unit: 'pkt', unitCategory: 'Office Supplies', location: 'B1-03', unitPrice: 5.49, supplier: '3M', description: '3x3 inch yellow sticky notes, 100 sheets' },
    { name: 'Manila Folders', code: 'OFF-004', category: 'Office Supplies', quantity: 3, minQuantity: 20, unit: 'pkt', unitCategory: 'Office Supplies', location: 'B1-04', unitPrice: 15.00, supplier: 'Staples Rwanda', description: 'A4 size, pack of 50' },
    // Furniture
    { name: 'Ergonomic Office Chair', code: 'FURN-001', category: 'Furniture', quantity: 20, minQuantity: 5, unit: 'pcs', unitCategory: 'Furniture', location: 'C1-01', unitPrice: 450.00, supplier: 'IKEA', description: 'Adjustable height with lumbar support' },
    { name: 'Standing Desk 160cm', code: 'FURN-002', category: 'Furniture', quantity: 10, minQuantity: 3, unit: 'pcs', unitCategory: 'Furniture', location: 'C1-02', unitPrice: 799.00, supplier: 'FlexiSpot', description: 'Electric height-adjustable standing desk' },
    { name: 'Bookshelf 5-Tier', code: 'FURN-003', category: 'Furniture', quantity: 8, minQuantity: 2, unit: 'pcs', unitCategory: 'Furniture', location: 'C1-03', unitPrice: 120.00, supplier: 'IKEA', description: 'Wooden 5-tier bookshelf' },
    // Warehouse Supplies
    { name: 'Packing Tape (Heavy)', code: 'WARE-001', category: 'Warehouse Supplies', quantity: 2, minQuantity: 25, unit: 'roll', unitCategory: 'Warehouse Supplies', location: 'D1-01', unitPrice: 4.50, supplier: 'PackPro', description: 'Heavy duty packing tape, 48mm x 100m' },
    { name: 'Bubble Wrap Roll', code: 'WARE-002', category: 'Warehouse Supplies', quantity: 30, minQuantity: 10, unit: 'roll', unitCategory: 'Warehouse Supplies', location: 'D1-02', unitPrice: 25.00, supplier: 'PackPro', description: '12mm bubble, 500mm x 100m roll' },
    { name: 'Cardboard Boxes (Large)', code: 'WARE-003', category: 'Warehouse Supplies', quantity: 200, minQuantity: 50, unit: 'pcs', unitCategory: 'Warehouse Supplies', location: 'D1-03', unitPrice: 3.50, supplier: 'BoxMart', description: '60x40x40cm double-wall corrugated' },
    { name: 'Shipping Labels', code: 'WARE-004', category: 'Warehouse Supplies', quantity: 1000, minQuantity: 200, unit: 'pcs', unitCategory: 'Warehouse Supplies', location: 'D1-04', unitPrice: 0.15, supplier: 'Avery', description: '100x150mm thermal labels' },
    // Safety Equipment
    { name: 'Safety Helmet', code: 'SAFE-001', category: 'Safety Equipment', quantity: 50, minQuantity: 15, unit: 'pcs', unitCategory: 'Safety Equipment', location: 'E1-01', unitPrice: 25.00, supplier: 'SafetyFirst', description: 'ANSI certified hard hat' },
    { name: 'Hi-Vis Safety Vest', code: 'SAFE-002', category: 'Safety Equipment', quantity: 60, minQuantity: 20, unit: 'pcs', unitCategory: 'Safety Equipment', location: 'E1-02', unitPrice: 12.00, supplier: 'SafetyFirst', description: 'Class 2 reflective safety vest' },
    { name: 'Work Gloves (Pair)', code: 'SAFE-003', category: 'Safety Equipment', quantity: 4, minQuantity: 30, unit: 'pair', unitCategory: 'Safety Equipment', location: 'E1-03', unitPrice: 8.50, supplier: 'SafetyFirst', description: 'Cut-resistant nitrile coated gloves' },
    // Cleaning Supplies
    { name: 'Floor Cleaner 5L', code: 'CLEAN-001', category: 'Cleaning Supplies', quantity: 20, minQuantity: 5, unit: 'bottle', unitCategory: 'Cleaning Supplies', location: 'F1-01', unitPrice: 18.00, supplier: 'CleanMax', description: 'All-purpose floor cleaning solution' },
    { name: 'Hand Sanitizer 500ml', code: 'CLEAN-002', category: 'Cleaning Supplies', quantity: 80, minQuantity: 20, unit: 'bottle', unitCategory: 'Cleaning Supplies', location: 'F1-02', unitPrice: 6.99, supplier: 'Purell', description: '70% alcohol hand sanitizer' },
  ]

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { code: item.code },
      update: {},
      create: item
    })
  }
  console.log(`✅ ${inventoryItems.length} inventory items created`)

  // ─── Vehicles ─────────────────────────────────────────────
  const vehicles = [
    { plateNumber: 'RAB 123A', type: 'van', capacity: 1500, status: 'AVAILABLE' as const, fuelType: 'diesel', vehicleModel: 'Toyota HiAce', year: 2022 },
    { plateNumber: 'RAC 456B', type: 'truck', capacity: 5000, status: 'AVAILABLE' as const, fuelType: 'diesel', vehicleModel: 'Isuzu NQR', year: 2021 },
    { plateNumber: 'RAD 789C', type: 'van', capacity: 2000, status: 'AVAILABLE' as const, fuelType: 'diesel', vehicleModel: 'Mercedes Sprinter', year: 2023 },
    { plateNumber: 'RAE 012D', type: 'truck', capacity: 8000, status: 'AVAILABLE' as const, fuelType: 'diesel', vehicleModel: 'Mitsubishi Canter', year: 2020 },
    { plateNumber: 'RAF 345E', type: 'pickup', capacity: 1000, status: 'AVAILABLE' as const, fuelType: 'petrol', vehicleModel: 'Toyota Hilux', year: 2023 },
    { plateNumber: 'RAG 678F', type: 'van', capacity: 1800, status: 'MAINTENANCE' as const, fuelType: 'diesel', vehicleModel: 'Ford Transit', year: 2021 },
    { plateNumber: 'RAH 901G', type: 'truck', capacity: 10000, status: 'AVAILABLE' as const, fuelType: 'diesel', vehicleModel: 'Hino 300', year: 2022 },
    { plateNumber: 'RAI 234H', type: 'motorcycle', capacity: 50, status: 'AVAILABLE' as const, fuelType: 'petrol', vehicleModel: 'Honda CG125', year: 2023 },
  ]

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { plateNumber: vehicle.plateNumber },
      update: {},
      create: vehicle
    })
  }
  console.log(`✅ ${vehicles.length} vehicles created`)

  // ─── Drivers ──────────────────────────────────────────────
  const driversData = [
    {
      userId: driverUser1.id,
      name: 'Patrick Niyonzima',
      email: 'driver1@waretrack.com',
      licenseNumber: 'DL-RW-2020-001',
      phone: '+250788111222',
      status: 'AVAILABLE' as const,
      experience: 5,
      rating: 4.8,
      address: 'Kigali, Kicukiro',
      hireDate: new Date('2020-03-15'),
      licenseExpiry: new Date('2027-03-15'),
      emergencyContact: '+250788999111',
      emergencyContactName: 'Marie Niyonzima'
    },
    {
      userId: driverUser2.id,
      name: 'Emmanuel Uwimana',
      email: 'driver2@waretrack.com',
      licenseNumber: 'DL-RW-2019-042',
      phone: '+250788333444',
      status: 'AVAILABLE' as const,
      experience: 7,
      rating: 4.6,
      address: 'Kigali, Gasabo',
      hireDate: new Date('2019-06-20'),
      licenseExpiry: new Date('2026-06-20'),
      emergencyContact: '+250788999222',
      emergencyContactName: 'Grace Uwimana'
    },
    {
      userId: driverUser3.id,
      name: 'Claude Ndayisaba',
      email: 'driver3@waretrack.com',
      licenseNumber: 'DL-RW-2021-088',
      phone: '+250788555666',
      status: 'AVAILABLE' as const,
      experience: 3,
      rating: 4.9,
      address: 'Kigali, Nyarugenge',
      hireDate: new Date('2021-01-10'),
      licenseExpiry: new Date('2028-01-10'),
      emergencyContact: '+250788999333',
      emergencyContactName: 'Joseph Ndayisaba'
    },
  ]

  for (const driver of driversData) {
    const existing = await prisma.driver.findUnique({ where: { userId: driver.userId } })
    if (!existing) {
      await prisma.driver.create({ data: driver })
    }
  }
  console.log(`✅ ${driversData.length} drivers created`)

  // ─── Sample Orders ────────────────────────────────────────
  const item1 = await prisma.inventoryItem.findUnique({ where: { code: 'ELEC-001' } })
  const item2 = await prisma.inventoryItem.findUnique({ where: { code: 'OFF-001' } })
  const item3 = await prisma.inventoryItem.findUnique({ where: { code: 'ELEC-003' } })

  if (item1 && item2 && item3) {
    const existingOrders = await prisma.deliveryOrder.count()
    if (existingOrders === 0) {
      await prisma.deliveryOrder.create({
        data: {
          orderNumber: 'ORD-000001',
          customerId: 1001,
          customerName: 'Kigali Tech Hub',
          deliveryAddress: 'KG 7 Ave, Kigali Innovation City',
          contactNumber: '+250788100200',
          priority: 'HIGH',
          status: 'PENDING',
          orderType: 'standard',
          paymentMethod: 'bank_transfer',
          totalAmount: 5199.96,
          deliveryInstructions: 'Deliver to reception desk, ask for IT Manager',
          createdBy: admin.id,
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          items: {
            create: [
              { itemId: item1.id, itemName: item1.name, quantity: 4, unit: 'pcs', unitPrice: item1.unitPrice, totalPrice: 4 * Number(item1.unitPrice) },
            ]
          }
        }
      })

      await prisma.deliveryOrder.create({
        data: {
          orderNumber: 'ORD-000002',
          customerId: 1002,
          customerName: 'Rwanda Revenue Authority',
          deliveryAddress: 'KN 4 Ave, Kimihurura',
          contactNumber: '+250788300400',
          priority: 'MEDIUM',
          status: 'PENDING',
          orderType: 'standard',
          paymentMethod: 'purchase_order',
          totalAmount: 1524.87,
          deliveryInstructions: 'Gate B entrance, supply room on ground floor',
          createdBy: admin.id,
          scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          items: {
            create: [
              { itemId: item2.id, itemName: item2.name, quantity: 50, unit: 'box', unitPrice: item2.unitPrice, totalPrice: 50 * Number(item2.unitPrice) },
              { itemId: item3.id, itemName: item3.name, quantity: 2, unit: 'pcs', unitPrice: item3.unitPrice, totalPrice: 2 * Number(item3.unitPrice) },
            ]
          }
        }
      })

      await prisma.deliveryOrder.create({
        data: {
          orderNumber: 'ORD-000003',
          customerId: 1003,
          customerName: 'University of Rwanda',
          deliveryAddress: 'KK 737 St, Huye Campus',
          contactNumber: '+250788500600',
          priority: 'LOW',
          status: 'PENDING',
          orderType: 'bulk',
          paymentMethod: 'bank_transfer',
          totalAmount: 8999.90,
          deliveryInstructions: 'Deliver to procurement office, building A',
          createdBy: warehouseStaff.id,
          scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          items: {
            create: [
              { itemId: item1.id, itemName: item1.name, quantity: 5, unit: 'pcs', unitPrice: item1.unitPrice, totalPrice: 5 * Number(item1.unitPrice) },
              { itemId: item3.id, itemName: item3.name, quantity: 5, unit: 'pcs', unitPrice: item3.unitPrice, totalPrice: 5 * Number(item3.unitPrice) },
            ]
          }
        }
      })

      console.log('✅ 3 sample orders created')
    }
  }

  // ─── Notifications ────────────────────────────────────────
  const existingNotifs = await prisma.notification.count()
  if (existingNotifs === 0) {
    await prisma.notification.createMany({
      data: [
        { type: 'WELCOME', title: 'Welcome to WareTrack Pro!', message: 'Your warehouse management system is ready to use. Explore the dashboard to get started.', severity: 'SUCCESS' },
        { type: 'SYSTEM', title: 'System Ready', message: 'All system components have been initialized successfully.', severity: 'INFO' },
        { type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'Manila Folders (OFF-004) is running low (3 remaining, min: 20)', severity: 'WARNING', userId: admin.id },
        { type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'Packing Tape (WARE-001) is critically low (2 remaining, min: 25)', severity: 'ERROR', userId: admin.id },
        { type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'Work Gloves (SAFE-003) needs restocking (4 remaining, min: 30)', severity: 'WARNING', userId: admin.id },
      ]
    })
    console.log('✅ Sample notifications created')
  }

  // ─── Maintenance Records ──────────────────────────────────
  const maintenanceVehicle = await prisma.vehicle.findFirst({ where: { plateNumber: 'RAG 678F' } })
  if (maintenanceVehicle) {
    const existingMaintenance = await prisma.maintenanceRecord.count({ where: { vehicleId: maintenanceVehicle.id } })
    if (existingMaintenance === 0) {
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: maintenanceVehicle.id,
          type: 'routine',
          description: 'Scheduled oil change and brake inspection',
          cost: 150000,
          odometerReading: 45000,
          nextServiceOdometer: 50000,
          performedBy: 'AutoTech Garage Kigali',
          scheduledDate: new Date(),
          nextServiceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }
      })
      console.log('✅ Maintenance record created')
    }
  }

  // ─── Dispatch Records ─────────────────────────────────────
  const orders = await prisma.deliveryOrder.findMany({ take: 3 })
  const driver1 = await prisma.driver.findFirst({ where: { email: 'driver1@waretrack.com' } })
  const driver2 = await prisma.driver.findFirst({ where: { email: 'driver2@waretrack.com' } })
  const vehicle1 = await prisma.vehicle.findFirst({ where: { plateNumber: 'RAB 123A' } })
  const vehicle2 = await prisma.vehicle.findFirst({ where: { plateNumber: 'RAC 456B' } })

  if (orders.length > 0 && driver1 && driver2 && vehicle1 && vehicle2) {
    const existingDispatch = await prisma.dispatch.count()
    if (existingDispatch === 0) {
      await prisma.dispatch.create({
        data: {
          order: { connect: { id: orders[0].id } },
          driver: { connect: { id: driver1.id } },
          vehicle: { connect: { id: vehicle1.id } },
          createdByUser: { connect: { id: dispatchOfficer.id } },
          status: 'IN_TRANSIT',
          scheduledDate: new Date(),
          dispatchedAt: new Date(),
          estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000),
          notes: 'Priority delivery - handle with care'
        }
      })

      await prisma.dispatch.create({
        data: {
          order: { connect: { id: orders[1].id } },
          driver: { connect: { id: driver2.id } },
          vehicle: { connect: { id: vehicle2.id } },
          createdByUser: { connect: { id: dispatchOfficer.id } },
          status: 'DISPATCHED',
          scheduledDate: new Date(),
          dispatchedAt: new Date(),
          estimatedDelivery: new Date(Date.now() + 6 * 60 * 60 * 1000),
          notes: 'Standard delivery'
        }
      })

      await prisma.dispatch.create({
        data: {
          order: { connect: { id: orders[2].id } },
          driver: { connect: { id: driver1.id } },
          vehicle: { connect: { id: vehicle1.id } },
          createdByUser: { connect: { id: dispatchOfficer.id } },
          status: 'DELIVERED',
          scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          dispatchedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          estimatedDelivery: new Date(Date.now() - 20 * 60 * 60 * 1000),
          actualDelivery: new Date(Date.now() - 20 * 60 * 60 * 1000),
          notes: 'Delivered successfully'
        }
      })

      await prisma.deliveryOrder.update({ where: { id: orders[0].id }, data: { status: 'IN_TRANSIT' } })
      await prisma.deliveryOrder.update({ where: { id: orders[1].id }, data: { status: 'DISPATCHED' } })
      await prisma.deliveryOrder.update({ where: { id: orders[2].id }, data: { status: 'DELIVERED', deliveredAt: new Date(Date.now() - 20 * 60 * 60 * 1000) } })

      console.log('✅ 3 dispatch records created')
    }
  }

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('  Admin:    admin@waretrack.com / admin123')
  console.log('  Staff:    warehouse@waretrack.com / staff123')
  console.log('  Dispatch: dispatch@waretrack.com / dispatch123')
  console.log('  Driver:   driver1@waretrack.com / driver123')
  console.log('  Driver:   driver2@waretrack.com / driver123')
  console.log('  Driver:   driver3@waretrack.com / driver123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
