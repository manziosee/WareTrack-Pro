import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('Orders API', () => {
  let authToken: string;
  let inventoryItemId: number;

  beforeEach(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123'
      });
    
    authToken = registerResponse.body.data.tokens.access;

    // Create inventory item with unique code
    const uniqueCode = `TEST${Date.now()}`;
    const item = await prisma.inventoryItem.create({
      data: {
        name: 'Test Product',
        code: uniqueCode,
        category: 'Electronics',
        quantity: 100,
        minQuantity: 10,
        unit: 'pieces',
        unitCategory: 'COUNT',
        location: 'A1',
        unitPrice: 25.99,
        status: 'ACTIVE'
      }
    });
    inventoryItemId = item.id;
  });



  describe('POST /api/orders', () => {
    it('should create delivery order', async () => {
      const orderData = {
        customerName: 'John Doe',
        deliveryAddress: '123 Main St, City',
        contactNumber: '+1234567890',
        priority: 'HIGH',
        orderType: 'Standard',
        paymentMethod: 'Cash',
        deliveryInstructions: 'Ring doorbell',
        items: [{
          itemId: inventoryItemId,
          quantity: 5,
          unit: 'pieces'
        }]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customerName).toBe(orderData.customerName);
      expect(response.body.data.orderNumber).toMatch(/^ORD-/);
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should reject order with insufficient stock', async () => {
      const orderData = {
        customerName: 'Jane Doe',
        deliveryAddress: '456 Oak St, City',
        contactNumber: '+1234567890',
        items: [{
          itemId: inventoryItemId,
          quantity: 200, // More than available stock
          unit: 'pieces'
        }]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status', async () => {
      // Create order first
      const order = await prisma.deliveryOrder.create({
        data: {
          orderNumber: 'ORD-TEST001',
          customerId: 1,
          customerName: 'Test Customer',
          deliveryAddress: '123 Test St',
          contactNumber: '+1234567890',
          priority: 'MEDIUM',
          status: 'PENDING',
          orderType: 'Standard',
          paymentMethod: 'Cash',
          totalAmount: 100,
          createdBy: 1
        }
      });

      const response = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'DISPATCHED' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('DISPATCHED');
    });
  });
});