const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addDispatchData() {
  try {
    console.log('Adding dispatch-related data...');

    // Add some vehicles if they don't exist
    const vehicleCount = await prisma.vehicle.count();
    if (vehicleCount < 5) {
      await prisma.vehicle.createMany({
        data: [
          {
            plateNumber: 'RAD-001A',
            type: 'TRUCK',
            capacity: 1000,
            status: 'AVAILABLE',
            fuelType: 'Diesel',
            vehicleModel: 'Toyota Hiace',
            year: 2020
          },
          {
            plateNumber: 'RAD-002B',
            type: 'VAN',
            capacity: 500,
            status: 'IN_USE',
            fuelType: 'Petrol',
            vehicleModel: 'Nissan NV200',
            year: 2019
          },
          {
            plateNumber: 'RAD-003C',
            type: 'TRUCK',
            capacity: 1500,
            status: 'AVAILABLE',
            fuelType: 'Diesel',
            vehicleModel: 'Isuzu NPR',
            year: 2021
          },
          {
            plateNumber: 'RAD-004D',
            type: 'MOTORCYCLE',
            capacity: 50,
            status: 'MAINTENANCE',
            fuelType: 'Petrol',
            vehicleModel: 'Honda CB125',
            year: 2018
          },
          {
            plateNumber: 'RAD-005E',
            type: 'VAN',
            capacity: 750,
            status: 'AVAILABLE',
            fuelType: 'Diesel',
            vehicleModel: 'Ford Transit',
            year: 2020
          }
        ]
      });
      console.log('Added vehicles');
    }

    // Add some drivers if they don't exist
    const driverCount = await prisma.driver.count();
    if (driverCount < 5) {
      await prisma.driver.createMany({
        data: [
          {
            name: 'Jean Baptiste',
            email: 'jean@example.com',
            licenseNumber: 'DL001234',
            phone: '+250788111111',
            status: 'AVAILABLE',
            experience: 5,
            rating: 4.5,
            address: 'Kigali, Rwanda'
          },
          {
            name: 'Marie Claire',
            email: 'marie@example.com',
            licenseNumber: 'DL001235',
            phone: '+250788222222',
            status: 'ON_DUTY',
            experience: 3,
            rating: 4.2,
            address: 'Kigali, Rwanda'
          },
          {
            name: 'Paul Kagame',
            email: 'paul@example.com',
            licenseNumber: 'DL001236',
            phone: '+250788333333',
            status: 'AVAILABLE',
            experience: 7,
            rating: 4.8,
            address: 'Kigali, Rwanda'
          },
          {
            name: 'Grace Uwimana',
            email: 'grace@example.com',
            licenseNumber: 'DL001237',
            phone: '+250788444444',
            status: 'AVAILABLE',
            experience: 2,
            rating: 4.0,
            address: 'Kigali, Rwanda'
          },
          {
            name: 'Eric Nshimiyimana',
            email: 'eric@example.com',
            licenseNumber: 'DL001238',
            phone: '+250788555555',
            status: 'OFF_DUTY',
            experience: 4,
            rating: 4.3,
            address: 'Kigali, Rwanda'
          }
        ]
      });
      console.log('Added drivers');
    }

    // Get first user for created_by
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      console.log('No users found. Please create a user first.');
      return;
    }

    // Add some orders with different priorities
    const orderCount = await prisma.deliveryOrder.count();
    if (orderCount < 10) {
      const orders = [];
      for (let i = 1; i <= 15; i++) {
        const priorities = ['HIGH', 'MEDIUM', 'LOW'];
        const statuses = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'];
        
        orders.push({
          orderNumber: `ORD-${String(i).padStart(6, '0')}`,
          customerId: 1000 + i,
          customerName: `Customer ${i}`,
          deliveryAddress: `Address ${i}, Kigali`,
          contactNumber: `+25078800${String(i).padStart(4, '0')}`,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          orderType: 'DELIVERY',
          paymentMethod: 'CASH',
          totalAmount: Math.floor(Math.random() * 100000) + 10000,
          createdBy: firstUser.id,
          scheduledDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
      }

      await prisma.deliveryOrder.createMany({
        data: orders
      });
      console.log('Added delivery orders');
    }

    // Add some dispatches
    const dispatchCount = await prisma.dispatch.count();
    if (dispatchCount < 5) {
      const orders = await prisma.deliveryOrder.findMany({ take: 10 });
      const drivers = await prisma.driver.findMany({ take: 5 });
      const vehicles = await prisma.vehicle.findMany({ take: 5 });

      if (orders.length > 0 && drivers.length > 0 && vehicles.length > 0) {
        const dispatches = [];
        const statuses = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'];
        
        for (let i = 0; i < Math.min(8, orders.length); i++) {
          const driver = drivers[i % drivers.length];
          const vehicle = vehicles[i % vehicles.length];
          const order = orders[i];
          
          dispatches.push({
            orderId: order.id,
            driverId: driver.id,
            vehicleId: vehicle.id,
            scheduledDate: new Date(),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            createdBy: firstUser.id
          });
        }

        await prisma.dispatch.createMany({
          data: dispatches
        });
        console.log('Added dispatches');
      }
    }

    console.log('Dispatch data setup completed!');
  } catch (error) {
    console.error('Error adding dispatch data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDispatchData();