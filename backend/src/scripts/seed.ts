import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db, schema } from '../db';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    await db.delete(schema.dispatches);
    await db.delete(schema.orderItems);
    await db.delete(schema.deliveryOrders);
    await db.delete(schema.drivers);
    await db.delete(schema.vehicles);
    await db.delete(schema.inventoryItems);
    await db.delete(schema.users);
    console.log('Cleared existing data');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = await db.insert(schema.users).values([
      {
        name: 'John Admin',
        email: 'admin@waretrack.com',
        password: hashedPassword,
        phone: '+250 788 123 456',
        role: 'admin'
      },
      {
        name: 'Sarah Wilson',
        email: 'warehouse@waretrack.com',
        password: hashedPassword,
        phone: '+250 788 234 567',
        role: 'warehouse_staff'
      },
      {
        name: 'Mike Johnson',
        email: 'dispatch@waretrack.com',
        password: hashedPassword,
        phone: '+250 788 345 678',
        role: 'dispatch_officer'
      },
      {
        name: 'David Brown',
        email: 'driver@waretrack.com',
        password: hashedPassword,
        phone: '+250 788 456 789',
        role: 'driver'
      },
      {
        name: 'Alice Cooper',
        email: 'driver2@waretrack.com',
        password: hashedPassword,
        phone: '+250 788 567 890',
        role: 'driver'
      }
    ]).returning();
    console.log('Created users');

    // Create inventory items
    const inventoryItems = await db.insert(schema.inventoryItems).values([
      {
        name: 'Laptop Dell XPS 13',
        code: 'ELEC-001',
        category: 'Electronics',
        quantity: 25,
        minQuantity: 5,
        unit: 'pieces',
        unitCategory: 'Basic',
        location: 'A1-01',
        barcode: '1234567890123',
        unitPrice: '850000',
        status: 'active',
        supplier: 'Dell Rwanda',
        description: 'High-performance laptop for business use'
      },
      {
        name: 'Office Chair Ergonomic',
        code: 'FURN-001',
        category: 'Furniture',
        quantity: 15,
        minQuantity: 3,
        unit: 'pieces',
        unitCategory: 'Basic',
        location: 'B2-05',
        unitPrice: '125000',
        status: 'active',
        supplier: 'Office Solutions Ltd',
        description: 'Comfortable ergonomic office chair'
      },
      {
        name: 'Printer Paper A4',
        code: 'SUPP-001',
        category: 'Office Supplies',
        quantity: 2,
        minQuantity: 10,
        unit: 'reams',
        unitCategory: 'Basic',
        location: 'C1-03',
        unitPrice: '3500',
        status: 'active',
        supplier: 'Paper Plus',
        description: 'High-quality A4 printing paper'
      },
      {
        name: 'Smartphone Samsung Galaxy',
        code: 'ELEC-002',
        category: 'Electronics',
        quantity: 8,
        minQuantity: 5,
        unit: 'pieces',
        unitCategory: 'Basic',
        location: 'A1-02',
        unitPrice: '450000',
        status: 'active',
        supplier: 'Samsung Rwanda',
        description: 'Latest Samsung Galaxy smartphone'
      },
      {
        name: 'Conference Table',
        code: 'FURN-002',
        category: 'Furniture',
        quantity: 3,
        minQuantity: 2,
        unit: 'pieces',
        unitCategory: 'Basic',
        location: 'B2-01',
        unitPrice: '350000',
        status: 'active',
        supplier: 'Wood Works Ltd',
        description: '8-seater conference table'
      }
    ]).returning();
    console.log('Created inventory items');

    // Create vehicles
    const vehicles = await db.insert(schema.vehicles).values([
      {
        plateNumber: 'RAD 123A',
        type: 'Van',
        capacity: 1500,
        status: 'available',
        fuelType: 'Diesel',
        vehicleModel: 'Toyota Hiace',
        year: 2022
      },
      {
        plateNumber: 'RAD 456B',
        type: 'Truck',
        capacity: 3000,
        status: 'available',
        fuelType: 'Diesel',
        vehicleModel: 'Isuzu NPR',
        year: 2021
      },
      {
        plateNumber: 'RAD 789C',
        type: 'Pickup',
        capacity: 800,
        status: 'maintenance',
        fuelType: 'Petrol',
        vehicleModel: 'Toyota Hilux',
        year: 2020
      }
    ]).returning();
    console.log('Created vehicles');

    // Create drivers
    const driverUsers = users.filter(user => user.role === 'driver');
    const drivers = await db.insert(schema.drivers).values([
      {
        userId: driverUsers[0].id,
        name: driverUsers[0].name,
        licenseNumber: 'DL001234',
        phone: driverUsers[0].phone,
        status: 'available',
        experience: 5,
        rating: '4.8'
      },
      {
        userId: driverUsers[1].id,
        name: driverUsers[1].name,
        licenseNumber: 'DL005678',
        phone: driverUsers[1].phone,
        status: 'available',
        experience: 3,
        rating: '4.5'
      }
    ]).returning();
    console.log('Created drivers');

    console.log('Database seeded successfully!');
    console.log('Login credentials:');
    console.log('Admin: admin@waretrack.com / password123');
    console.log('Warehouse: warehouse@waretrack.com / password123');
    console.log('Dispatch: dispatch@waretrack.com / password123');
    console.log('Driver: driver@waretrack.com / password123');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();