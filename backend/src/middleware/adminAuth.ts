import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated (auth middleware should run first)
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: Number(req.user?.userId) }
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

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required'
        }
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server error'
      }
    });
  }
};