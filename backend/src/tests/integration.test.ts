import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('Integration Tests - Complete Workflow', () => {
  let adminToken: string;
  let warehouseToken: string;
  let inventoryItemId: number;
  let orderId: number;
  let driverId: number;
  let vehicleId: number;

  beforeEach(async () => {
    // Register admin user
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123'
      });
    adminToken = adminResponse.body.data.tokens.access;

    // Register warehouse staff
    const warehouseResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Warehouse Staff',
        email: 'warehouse@test.com',
        password: 'password123'
      });
    warehouseToken = warehouseResponse.body.data.tokens.access;
  });

  describe('Complete Order Fulfillment Workflow', () => {
    it('1. Should create inventory item', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          name: 'Laptop Computer',
          code: `LAPTOP${Date.now()}`,
          category: 'Electronics',
          quantity: 50,
          minQuantity: 5,
          unit: 'pieces',
          unitCategory: 'count',
          location: 'A1-B2',
          unitPrice: 999.99
        })
        .expect(201);

      inventoryItemId = response.body.data.id;
      expect(response.body.data.name).toBe('Laptop Computer');
    });

    it('2. Should create vehicle', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plateNumber: `ABC${Date.now()}`,
          type: 'Van',
          capacity: 1000,
          fuelType: 'Diesel',
          vehicleModel: 'Ford Transit',
          year: 2022
        })
        .expect(201);

      vehicleId = response.body.data.id;
      expect(response.body.data.plateNumber).toBe('ABC-123');
    });

    it('3. Should create driver', async () => {
      const response = await request(app)
        .post('/api/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'John Driver',
          email: 'driver@test.com',
          licenseNumber: 'DL123456',
          phone: '+1234567890',
          address: '123 Driver St'
        })
        .expect(201);

      driverId = response.body.data.id;
      expect(response.body.data.name).toBe('John Driver');
    });

    it('4. Should create delivery order', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          customerName: 'Customer ABC',
          deliveryAddress: '456 Customer Ave',
          contactNumber: '+1987654321',
          priority: 'HIGH',
          orderType: 'Express',
          paymentMethod: 'Credit Card',
          items: [{
            itemId: inventoryItemId,
            quantity: 2,
            unit: 'pieces'
          }]
        })
        .expect(201);

      orderId = response.body.data.id;
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.items).toHaveLength(1);
    });

    it('5. Should create dispatch assignment', async () => {
      const response = await request(app)
        .post('/api/dispatch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId,
          driverId,
          vehicleId,
          scheduledDate: new Date().toISOString(),
          notes: 'Handle with care'
        })
        .expect(201);

      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.orderId).toBe(orderId);
    });

    it('6. Should update dispatch status to IN_TRANSIT', async () => {
      const dispatches = await request(app)
        .get('/api/dispatch')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const dispatchId = dispatches.body.data[0].id;

      const response = await request(app)
        .put(`/api/dispatch/${dispatchId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'IN_TRANSIT',
          notes: 'Package picked up'
        })
        .expect(200);

      expect(response.body.data.status).toBe('IN_TRANSIT');
    });

    it('7. Should complete delivery', async () => {
      const dispatches = await request(app)
        .get('/api/dispatch')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const dispatchId = dispatches.body.data[0].id;

      const response = await request(app)
        .put(`/api/dispatch/${dispatchId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'DELIVERED',
          notes: 'Package delivered successfully'
        })
        .expect(200);

      expect(response.body.data.status).toBe('DELIVERED');
    });

    it('8. Should verify inventory was updated', async () => {
      const response = await request(app)
        .get(`/api/inventory/${inventoryItemId}`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);

      expect(response.body.data.quantity).toBe(48); // 50 - 2 ordered
    });

    it('9. Should verify order status is DELIVERED', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('DELIVERED');
    });
  });
});