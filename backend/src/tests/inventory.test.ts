import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('Inventory API', () => {
  let authToken: string;
  let userId: number;

  beforeEach(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123'
      });
    
    authToken = registerResponse.body.data.tokens.access;
    userId = registerResponse.body.data.user.id;
  });

  describe('POST /api/inventory', () => {
    it('should create inventory item', async () => {
      const itemData = {
        name: 'Test Product',
        code: `TEST${Date.now()}`,
        category: 'Electronics',
        quantity: 100,
        minQuantity: 10,
        unit: 'pieces',
        unitCategory: 'count',
        location: 'A1-B2',
        unitPrice: 25.99
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(itemData.name);
      expect(response.body.data.code).toBe(itemData.code);
    });

    it('should reject duplicate product codes', async () => {
      const itemData = {
        name: 'Test Product',
        code: `DUP${Date.now()}`,
        category: 'Electronics',
        quantity: 100,
        minQuantity: 10,
        unit: 'pieces',
        unitCategory: 'count',
        location: 'A1-B2'
      };

      // Create first item
      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...itemData, name: 'Different Name' })
        .expect(400);

      expect(response.body.error.code).toBe('DUPLICATE_CODE');
    });
  });

  describe('GET /api/inventory/low-stock', () => {
    it('should return low stock items', async () => {
      // Create low stock item
      await prisma.inventoryItem.create({
        data: {
          name: 'Low Stock Item',
          code: `LOW${Date.now()}`,
          category: 'Test',
          quantity: 5,
          minQuantity: 10,
          unit: 'pieces',
          unitCategory: 'count',
          location: 'A1',
          unitPrice: 10
        }
      });

      const response = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Low Stock Item');
    });
  });
});