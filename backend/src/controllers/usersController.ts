import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';
import { runWithoutTenant } from '../lib/tenantContext';

const cache = CacheService.getInstance();

export class UsersController {
  static async getUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;
      const take = Math.min(Math.max(Number(limit) || 10, 1), 200);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

      const where: any = {
        companyId: req.user!.companyId,
        ...(status === 'INACTIVE' ? {} : { active: true }),
        ...(role && { role: role as string }),
        AND: [
          ...(status && status !== 'INACTIVE' ? [{ user: { status: status as any } }] : []),
          ...(status === 'INACTIVE' ? [{ OR: [{ active: false }, { user: { status: 'INACTIVE' } }] }] : []),
          ...(search ? [{ user: { OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
          ] } }] : []),
        ],
      };

      const memberships = await prisma.companyMembership.findMany({
        skip,
        take,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, name: true, email: true, phone: true, status: true, lastLogin: true, createdAt: true, updatedAt: true } },
          branches: { where: { active: true }, select: { branchId: true, roleOverride: true } },
        },
      });

      const users = memberships.map(({ user, role: memberRole, active, branches }) => ({
        ...user, role: branches.find((entry) => entry.branchId === req.user!.branchId)?.roleOverride || memberRole,
        companyRole: memberRole, branchMemberships: branches, status: active ? user.status : 'INACTIVE',
      }));
      const total = await prisma.companyMembership.count({ where });

      res.json({
        success: true,
        data: users,
        pagination: { page: Number(page), limit: take, total, totalPages: Math.ceil(total / take) }
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
      const roles: { value: string; label: string }[] = [
        { value: 'ADMIN', label: 'Admin' },
        { value: 'WAREHOUSE_STAFF', label: 'Warehouse Staff' },
        { value: 'DISPATCH_OFFICER', label: 'Dispatch Officer' },
        { value: 'DRIVER', label: 'Driver' }
      ];
      const custom = await prisma.rolePermission.findMany({ where: { companyId: req.user!.companyId }, select: { role: true }, distinct: ['role'] });
      for (const entry of custom) if (!roles.some((role) => role.value === entry.role)) roles.push({ value: entry.role, label: entry.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) });
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
      const membership = await prisma.companyMembership.findUnique({
        where: { companyId_userId: { companyId: req.user!.companyId, userId: Number(id) } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, name: true, email: true, phone: true, status: true, lastLogin: true, createdAt: true, updatedAt: true } },
          branches: { where: { active: true }, select: { branchId: true, roleOverride: true } },
        },
      });
      if (!membership) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      res.json({ success: true, data: {
        ...membership.user, role: membership.branches.find((entry) => entry.branchId === req.user!.branchId)?.roleOverride || membership.role,
        companyRole: membership.role, branchMemberships: membership.branches, status: membership.active ? membership.user.status : 'INACTIVE',
      } });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role, status = 'ACTIVE' } = req.body;

      console.log('Creating user with data:', { name, email, phone, role, status });

      // Validate required fields
      const missingFields = [];
      if (!name?.trim()) missingFields.push('name');
      if (!email?.trim()) missingFields.push('email');
      if (!password?.trim()) missingFields.push('password');
      if (!role?.trim()) missingFields.push('role');
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Missing required fields: ${missingFields.join(', ')}`,
            details: { missingFields }
          }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Please provide a valid email address'
          }
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 6 characters long'
          }
        });
      }

      // Validate role
      const validRoleKey = /^[A-Z][A-Z0-9_:-]{1,63}$/.test(String(role));
      const roleConfigured = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'].includes(role)
        || Boolean(await prisma.rolePermission.findFirst({ where: { companyId: req.user!.companyId, role } }));
      if (!validRoleKey || !roleConfigured) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role specified'
          }
        });
      }

      // Validate status
      const validStatuses = ['ACTIVE', 'INACTIVE', 'PENDING'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid status specified'
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
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { firstName, lastName, name, email, password: hashedPassword, phone: phone || null, role: (['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'].includes(role) ? role : 'WAREHOUSE_STAFF') as any, status: status === 'PENDING' ? 'PENDING' : 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
        });
        const membership = await tx.companyMembership.create({ data: { companyId: req.user!.companyId, userId: created.id, role, active: status !== 'INACTIVE' } });
        if (req.user!.branchId) await tx.branchMembership.create({ data: { companyMembershipId: membership.id, branchId: req.user!.branchId } });
        return { ...created, role: membership.role };
      });

      try {
        await cache.invalidateUserCache();
      } catch (cacheError) {
        console.warn('Cache invalidation failed:', cacheError);
      }
      
      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      console.error('User creation error:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      
      // Handle Prisma specific errors
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'DUPLICATE_FIELD',
            message: 'A user with this email already exists'
          }
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Server error'
        }
      });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, role, status } = req.body;

      const userId = Number(id);
      if (role && (!/^[A-Z][A-Z0-9_:-]{1,63}$/.test(String(role)) || (!['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'].includes(role) && !await prisma.rolePermission.findFirst({ where: { companyId: req.user!.companyId, role } })))) return res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Choose a company role with configured permissions' } });
      const membership = await prisma.companyMembership.findUnique({ where: { companyId_userId: { companyId: req.user!.companyId, userId } } });
      if (!membership) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found in this company' } });
      const result = await runWithoutTenant(async () => {
        const user = await prisma.user.update({ where: { id: userId }, data: { name, phone } });
        const updatedMembership = await prisma.companyMembership.update({ where: { id: membership.id }, data: {
          ...(role ? { role } : {}), ...(status ? { active: status !== 'INACTIVE' } : {}),
        } });
        return { ...user, role: updatedMembership.role, status: updatedMembership.active ? user.status : 'INACTIVE' };
      });
      
      res.json({ success: true, data: result });
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
      
      const membership = await prisma.companyMembership.update({
        where: { companyId_userId: { companyId: req.user!.companyId, userId: Number(id) } }, data: { active: true }, include: { user: true },
      });
      
      res.json({ 
        success: true,
        data: { ...membership.user, role: membership.role },
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
      
      const membership = await prisma.companyMembership.update({
        where: { companyId_userId: { companyId: req.user!.companyId, userId: Number(id) } }, data: { active: false }, include: { user: true },
      });
      
      res.json({ 
        success: true,
        data: { ...membership.user, role: membership.role, status: 'INACTIVE' },
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
      const userId = Number(id);
      const membership = await prisma.companyMembership.findUnique({ where: { companyId_userId: { companyId: req.user!.companyId, userId } } });
      if (!membership) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User is not a member of this company' }
        });
      }
      await prisma.companyMembership.delete({ where: { id: membership.id } });
      
      res.json({ 
        success: true,
        message: 'User removed from this company. Their WareTrack account and memberships in other companies are unchanged.'
      });
    } catch (error: any) {
      console.error('Delete user error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          success: false,
          error: { code: 'FOREIGN_KEY_CONSTRAINT', message: 'Cannot delete user with existing references' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error' }
      });
    }
  }
}
