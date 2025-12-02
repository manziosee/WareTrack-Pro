import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';

const cache = CacheService.getInstance();

export class UsersController {
  static async getUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, role } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const users = await prisma.user.findMany({
        skip,
        take: Number(limit),
        where: {
          ...(role && { role: role as any }),
          ...(search && {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const total = await prisma.user.count();

      res.json({
        success: true,
        data: users,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getRoles(req: Request, res: Response) {
    try {
      const roles = [
        { value: 'ADMIN', label: 'Admin' },
        { value: 'WAREHOUSE_STAFF', label: 'Warehouse Staff' },
        { value: 'DISPATCH_OFFICER', label: 'Dispatch Officer' },
        { value: 'DRIVER', label: 'Driver' }
      ];
      res.json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role } = req.body;

      // Validate required fields
      if (!name || !email || !password || !role) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, email, password, and role are required'
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

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          name,
          email,
          password: hashedPassword,
          phone: phone || '',
          role: role as any,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true
        }
      });

      await cache.invalidateUserCache();
      
      res.status(201).json({
        success: true,
        data: user
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

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, role, status } = req.body;

      const user = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          name,
          phone,
          role: role as any,
          status: status as any
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await cache.invalidateUserCache();
      
      res.json({ success: true, data: user });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async activateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.update({
        where: { id: Number(id) },
        data: { status: 'ACTIVE' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await cache.invalidateUserCache();
      
      res.json({ 
        success: true,
        data: user,
        message: 'User activated successfully'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async deactivateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.update({
        where: { id: Number(id) },
        data: { status: 'INACTIVE' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await cache.invalidateUserCache();
      
      res.json({ 
        success: true,
        data: user,
        message: 'User deactivated successfully'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.user.delete({
        where: { id: Number(id) }
      });
      await cache.invalidateUserCache();
      
      res.json({ 
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}