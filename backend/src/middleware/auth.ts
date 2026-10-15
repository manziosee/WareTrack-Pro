import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { getJwtSecret } from '../config/env';

// Short-lived cache of each user's current role/status so a deactivated or
// re-roled user loses access within seconds, without a DB hit on every request
const USER_CACHE_TTL_MS = 30 * 1000;
const userCache = new Map<number, { role: string; status: string; expires: number }>();

async function loadUser(userId: number) {
  const cached = userCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true }
  });
  if (!user) {
    userCache.delete(userId);
    return null;
  }
  const entry = { role: user.role as string, status: user.status as string, expires: Date.now() + USER_CACHE_TTL_MS };
  userCache.set(userId, entry);
  return entry;
}

/** Drop a user's cached role/status, e.g. right after an admin changes them. */
export const invalidateUserCache = (userId: number) => {
  userCache.delete(userId);
};

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token required'
      }
    });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }

  // Refresh tokens may only be used at /auth/refresh
  if (payload?.type === 'refresh' || !payload?.userId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }

  try {
    const user = await loadUser(Number(payload.userId));
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User no longer exists'
        }
      });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account is inactive. Please contact an administrator.'
        }
      });
    }

    // Use the role from the database, not the (possibly stale) token
    req.user = { userId: payload.userId, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

export const authenticate = auth;
export const authenticateToken = auth;

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to perform this action'
        }
      });
    }

    next();
  };
};

// Role groups shared by the route files
export const ROLES = {
  admin: ['ADMIN'],
  inventoryManagers: ['ADMIN', 'WAREHOUSE_STAFF'],
  orderManagers: ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'],
  fleetManagers: ['ADMIN', 'DISPATCH_OFFICER'],
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}
