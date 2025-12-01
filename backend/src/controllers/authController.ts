import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';

const cache = CacheService.getInstance();

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { firstName, lastName, email, password, phone, role } = req.body;
      const name = `${firstName} ${lastName}`;

      const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User already exists'
          }
        });
      }

      // Check if this is the first user (make them admin)
      const allUsers = await db.select().from(schema.users);
      const isFirstUser = allUsers.length === 0;
      const userRole = isFirstUser ? 'admin' : (role || 'warehouse_staff');
      const userStatus = isFirstUser ? 'active' : 'inactive'; // New users are inactive until activated by admin

      const hashedPassword = await bcrypt.hash(password, 12);
      const [user] = await db.insert(schema.users).values({
        firstName,
        lastName,
        name,
        email,
        password: hashedPassword,
        phone,
        role: userRole,
        status: userStatus
      }).returning();

      const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      
      await cache.setSession(accessToken, user.id);
      
      // Send welcome email
      await QueueService.addEmailJob({
        email: user.email,
        title: 'Welcome to WareTrack-Pro',
        name: user.name,
        message: 'Welcome to WareTrack-Pro! Your account has been successfully created.',
        template: 'welcome'
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ 
        success: true,
        data: {
          user: userWithoutPassword,
          tokens: {
            access: accessToken,
            refresh: refreshToken
          }
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials'
          }
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials'
          }
        });
      }

      // Check if user account is active
      if (user.status === 'inactive') {
        return res.status(403).json({ 
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Your account is inactive. Please contact an administrator to activate your account.'
          }
        });
      }

      // Check if this is first login (lastLogin is null)
      const isFirstLogin = !user.lastLogin;
      
      await db.update(schema.users).set({ lastLogin: new Date() }).where(eq(schema.users.id, user.id));

      // Send welcome email for first-time users
      if (isFirstLogin) {
        console.log('✅ Welcome to WareTrack-Pro 🎉 - Sent successfully');
        await QueueService.addEmailJob({
          email: user.email,
          title: 'Welcome to WareTrack-Pro 🎉',
          name: user.firstName || user.name?.split(' ')[0] || 'User',
          message: 'Welcome to WareTrack-Pro! You have successfully logged in for the first time.',
          template: 'welcome'
        });
      }

      const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      
      await cache.setSession(accessToken, user.id);
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        success: true,
        data: {
          user: userWithoutPassword,
          tokens: {
            access: accessToken,
            refresh: refreshToken
          }
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          }
        });
      }
      
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, decoded.userId)).limit(1);
      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      const newAccessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      const newRefreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      await cache.setSession(newAccessToken, user.id);
      
      res.json({ 
        success: true,
        data: {
          access: newAccessToken,
          refresh: newRefreshToken
        }
      });
    } catch (error) {
      res.status(401).json({ 
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        }
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await cache.deleteSession(token);
      }
      res.json({ 
        success: true,
        message: 'Successfully logged out'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, Number(req.user?.userId))).limit(1);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }
}