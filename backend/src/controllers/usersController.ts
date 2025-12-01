import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, schema } from '../db';
import { eq, ilike, or } from 'drizzle-orm';
import { CacheService } from '../services/cacheService';

const cache = CacheService.getInstance();

export class UsersController {
  static async getUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, role } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const users = await db.select().from(schema.users).limit(Number(limit)).offset(offset);
      const usersWithoutPassword = users.map(({ password, ...user }) => user);

      res.json({
        data: usersWithoutPassword,
        pagination: { page: Number(page), limit: Number(limit), total: users.length }
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  static async getRoles(req: Request, res: Response) {
    try {
      const roles = ['admin', 'warehouse_staff', 'dispatch_officer', 'driver'];
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, Number(id))).limit(1);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role } = req.body;

      const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const [user] = await db.insert(schema.users).values({
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        status: 'active'
      }).returning();

      await cache.invalidateUserCache();
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, role, status } = req.body;

      const [user] = await db.update(schema.users)
        .set({ name, phone, role, status, updatedAt: new Date() })
        .where(eq(schema.users.id, Number(id)))
        .returning();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await cache.invalidateUserCache();
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async activateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const [user] = await db.update(schema.users)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(schema.users.id, Number(id)))
        .returning();

      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: { message: 'User not found' }
        });
      }

      await cache.invalidateUserCache();
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        success: true,
        data: userWithoutPassword,
        message: 'User activated successfully'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { message: 'Server error' }
      });
    }
  }

  static async deactivateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const [user] = await db.update(schema.users)
        .set({ status: 'inactive', updatedAt: new Date() })
        .where(eq(schema.users.id, Number(id)))
        .returning();

      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: { message: 'User not found' }
        });
      }

      await cache.invalidateUserCache();
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        success: true,
        data: userWithoutPassword,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { message: 'Server error' }
      });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await db.delete(schema.users).where(eq(schema.users.id, Number(id)));
      await cache.invalidateUserCache();
      
      res.json({ 
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { message: 'Server error' }
      });
    }
  }
}