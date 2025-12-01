import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, schema } from '../db';
import { eq, like, and, or, sql, desc } from 'drizzle-orm';
import { CacheService } from '../services/cacheService';

const cacheService = CacheService.getInstance();

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    
    const conditions = [];
    if (role) conditions.push(eq(schema.users.role, role as any));
    if (status) conditions.push(eq(schema.users.status, status as any));
    if (search) {
      conditions.push(
        or(
          like(schema.users.name, `%${search}%`),
          like(schema.users.email, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [users, totalResult] = await Promise.all([
      db.select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        status: schema.users.status,
        createdAt: schema.users.createdAt,
        lastLogin: schema.users.lastLogin
      })
        .from(schema.users)
        .where(whereClause)
        .orderBy(desc(schema.users.createdAt))
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit)),
      
      db.select({ count: sql<number>`count(*)` })
        .from(schema.users)
        .where(whereClause)
    ]);

    const total = totalResult[0]?.count || 0;

    res.json({
      users,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const [user] = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      role: schema.users.role,
      status: schema.users.status,
      createdAt: schema.users.createdAt,
      lastLogin: schema.users.lastLogin
    })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createUser = async (req: Request, res: Response) => {
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
      role
    }).returning({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      role: schema.users.role,
      status: schema.users.status,
      createdAt: schema.users.createdAt
    });

    await cacheService.invalidateUserCache();
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, phone, role, status } = req.body;

    const [user] = await db.update(schema.users)
      .set({ name, email, phone, role, status, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        status: schema.users.status,
        createdAt: schema.users.createdAt
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await cacheService.invalidateUserCache();
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const [deletedUser] = await db.delete(schema.users)
      .where(eq(schema.users.id, userId))
      .returning();
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await cacheService.invalidateUserCache();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = parseInt(req.user?.userId || '0');

    const [user] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.update(schema.users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const cachedStats = await cacheService.getCachedUserStats();
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const [totalResult, activeResult, roleStatsResult, recentUsers] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.users),
      db.select({ count: sql<number>`count(*)` }).from(schema.users).where(eq(schema.users.status, 'active')),
      db.select({
        role: schema.users.role,
        count: sql<number>`count(*)`
      }).from(schema.users).groupBy(schema.users.role),
      db.select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        createdAt: schema.users.createdAt
      }).from(schema.users).orderBy(desc(schema.users.createdAt)).limit(5)
    ]);

    const stats = {
      totalUsers: totalResult[0]?.count || 0,
      activeUsers: activeResult[0]?.count || 0,
      roleStats: roleStatsResult,
      recentUsers
    };

    await cacheService.cacheUserStats(stats);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};