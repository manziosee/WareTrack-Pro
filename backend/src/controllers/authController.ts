import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';

const cache = CacheService.getInstance();

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role } = req.body;

      // Check if this is the first user registration
      const userCount = await prisma.user.count();
      const isFirstUser = userCount === 0;
      
      // If not first user, registration is disabled (only admins can create users)
      if (!isFirstUser) {
        return res.status(403).json({ 
          success: false,
          error: {
            code: 'REGISTRATION_DISABLED',
            message: 'Public registration is disabled. Please contact an administrator to create your account.'
          }
        });
      }

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, email, and password are required'
          }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format'
          }
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 6 characters long'
          }
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          }
        });
      }

      // Split name into firstName and lastName
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // First user is always admin
      const userRole = 'admin';
      const userStatus = 'active';

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          name,
          email,
          password: hashedPassword,
          phone: phone || '',
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      });

      const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      
      try {
        await cache.setSession(accessToken, user.id);
      } catch (cacheError) {
        console.warn('Cache session failed:', cacheError);
      }
      
      // Send welcome email
      try {
        await QueueService.addEmailJob({
          email: user.email,
          title: 'Welcome to WareTrack-Pro',
          name: user.name,
          message: `Welcome to WareTrack-Pro, ${user.name}! Your account has been successfully created.`,
          template: 'welcome'
        });
      } catch (emailError) {
        console.warn('Welcome email failed:', emailError);
      }
      
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
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          }
        });
      }
      
      // Handle database connection errors
      if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          success: false,
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database is temporarily unavailable. Please try again later.'
          }
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed. Please try again.'
        }
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });
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
      if (user.status === 'INACTIVE') {
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
      
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Send welcome email for first-time users
      if (isFirstLogin) {
        console.log('✅ Welcome to WareTrack-Pro 🎉 - Sent successfully');
        await QueueService.addEmailJob({
          email: user.email,
          title: 'Welcome to WareTrack-Pro 🎉',
          name: user.name || user.firstName || 'User',
          message: `Welcome to WareTrack-Pro, ${user.name || user.firstName || 'User'}! You have successfully logged in for the first time.`,
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
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle database connection errors
      if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          success: false,
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database is temporarily unavailable. Please try again later.'
          }
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Login failed. Please try again.'
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
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
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
      const user = await prisma.user.findUnique({
        where: { id: Number(req.user?.userId) }
      });
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