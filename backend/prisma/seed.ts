import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
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

  // Create sample inventory items
  const laptopItem = await prisma.inventoryItem.create({
    data: {
      name: 'Dell Laptop XPS 15',
      code: 'LAP001',
      category: 'Electronics',
      quantity: 25,
      minQuantity: 5,
      unit: 'pcs',
      unitCategory: 'Electronics',
      location: 'A1-01',
      unitPrice: 1299.99,
      supplier: 'Dell Technologies',
      description: 'High-performance laptop for business use'
    }
  })

  console.log('✅ Sample inventory created:', laptopItem.name)

  // Create sample vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      plateNumber: 'RAB123A',
      type: 'van',
      capacity: 1500,
      status: 'AVAILABLE',
      fuelType: 'diesel',
      vehicleModel: 'Toyota Hiace',
      year: 2022
    }
  })

  console.log('✅ Sample vehicle created:', vehicle.plateNumber)

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })