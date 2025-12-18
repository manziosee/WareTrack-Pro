import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('Authentication API', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register first user as admin', async () => {
      const userData = {
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('ADMIN');
      expect(response.body.data.tokens.access).toBeDefined();
    });

    it('should allow multiple user registrations', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email: 'first@test.com',
          password: 'password123'
        });

      // Register second user should work
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'second@test.com',
          password: 'password123'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('WAREHOUSE_STAFF');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.access).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});