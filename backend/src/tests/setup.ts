import { prisma } from '../lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  try {
    await prisma.dispatch.deleteMany();
    await prisma.deliveryOrder.deleteMany();
    await prisma.inventoryHistory.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.warn('Database cleanup warning:', error);
  }
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.warn('Database disconnect warning:', error);
  }
});

jest.setTimeout(30000);