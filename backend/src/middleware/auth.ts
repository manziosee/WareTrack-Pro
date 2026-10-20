import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { getJwtSecret } from '../config/env';
import { runWithTenant } from '../lib/tenantContext';

// Short-lived cache of each user's current role/status so a deactivated or
// re-roled user loses access within seconds, without a DB hit on every request
const USER_CACHE_TTL_MS = 30 * 1000;
const userCache = new Map<number, { role: string; status: string; companyId: number; expires: number }>();

async function loadUser(userId: number) {
  const cached = userCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, companyId: true }
  });
  if (!user) {
    userCache.delete(userId);
    return null;
  }
  const entry = { role: user.role as string, status: user.status as string, companyId: user.companyId, expires: Date.now() + USER_CACHE_TTL_MS };
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

    const requestedCompany = req.header('X-Company-Id');
    let companyId = requestedCompany ? Number(requestedCompany) : user.companyId;
    if (!Number.isInteger(companyId) || companyId < 1) return res.status(400).json({ success: false, error: { code: 'INVALID_COMPANY', message: 'Choose a valid company' } });
    let membership = await prisma.companyMembership.findUnique({ where: { companyId_userId: { companyId, userId: Number(payload.userId) } } });
    // Users are global identities; their original company_id may not be one of
    // their memberships after joining another company.
    if (!requestedCompany && !membership?.active) {
      membership = await prisma.companyMembership.findFirst({ where: { userId: Number(payload.userId), active: true }, orderBy: { companyId: 'asc' } });
      if (membership) companyId = membership.companyId;
    }
    if (!membership?.active) return res.status(403).json({ success: false, error: { code: 'COMPANY_ACCESS_DENIED', message: 'You are not an active member of this company' } });

    const availableBranches = await prisma.branchMembership.findMany({
      where: { companyMembershipId: membership.id, active: true, branch: { active: true, companyId } },
      include: { branch: { select: { id: true } } },
    });
    const requestedBranch = req.header('X-Branch-Id');
    let branchId: number | null = null;
    let role = membership.role;
    if (requestedBranch) {
      branchId = Number(requestedBranch);
      if (!Number.isInteger(branchId) || !availableBranches.some((entry) => entry.branchId === branchId)) {
        return res.status(403).json({ success: false, error: { code: 'BRANCH_ACCESS_DENIED', message: 'You do not have access to this branch' } });
      }
      role = availableBranches.find((entry) => entry.branchId === branchId)?.roleOverride || role;
    } else if (availableBranches.length === 1) {
      branchId = availableBranches[0].branchId;
      role = availableBranches[0].roleOverride || role;
    } else if (availableBranches.length > 1) {
      // Give first-time sessions a valid branch. The client exposes a branch
      // switcher immediately after login and can persist the user's choice.
      branchId = availableBranches[0].branchId;
      role = availableBranches[0].roleOverride || role;
    }

    req.user = { userId: String(payload.userId), role, baseRole: membership.role, companyId, branchId, companyMembershipId: membership.id };

    // Apply configured action/location grants to every authenticated route,
    // including routes that only require authentication. Legacy role checks
    // remain the fallback until a role has an explicit permission policy.
    const isTenantAdminControl = req.baseUrl.includes('/tenancy') && role === 'ADMIN' && membership.role === 'ADMIN';
    if (!isTenantAdminControl) {
      const grants = await prisma.rolePermission.findMany({
        where: {
          companyId,
          role,
          ...(branchId === null ? { branchId: null } : { OR: [{ branchId }, { branchId: null }] }),
        },
        select: { permission: true, branchId: true, allowed: true },
      });
      if (grants.length) {
        const permission = permissionForRequest(req);
        const grant = grants.find((entry) => entry.permission === permission && entry.branchId === branchId)
          || grants.find((entry) => entry.permission === permission && entry.branchId === null);
        if (!grant?.allowed) return deny(res);
      }
    }
    runWithTenant({ companyId, branchId }, next);
  } catch (error) {
    next(error);
  }
};

export const authenticate = auth;
export const authenticateToken = auth;

export const authorizeRoles = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    try {
      const permission = permissionForRequest(req);
      const grants = await prisma.rolePermission.findMany({
        where: {
          companyId: req.user.companyId,
          role: req.user.role,
          permission,
          ...(req.user.branchId ? { OR: [{ branchId: req.user.branchId }, { branchId: null }] } : { branchId: null }),
        },
      });
      const grant = grants.find((entry) => entry.branchId === req.user!.branchId) || grants.find((entry) => entry.branchId === null);
      if (grant) {
        if (!grant.allowed) return deny(res);
        return next();
      }
      if (roles.includes(req.user.role) || (req.user.role === req.user.baseRole && roles.includes(req.user.baseRole))) return next();
      return deny(res);
    } catch (error) {
      next(error);
    }
  };
};

export const authorizePermission = (permission: string) => async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return deny(res, 401, 'UNAUTHORIZED');
  try {
    const grants = await prisma.rolePermission.findMany({
      where: {
        companyId: req.user.companyId,
        role: req.user.role,
        permission,
        ...(req.user.branchId ? { OR: [{ branchId: req.user.branchId }, { branchId: null }] } : { branchId: null }),
      },
    });
    const grant = grants.find((entry) => entry.branchId === req.user!.branchId) || grants.find((entry) => entry.branchId === null);
    if (grant?.allowed) return next();
    return deny(res);
  } catch (error) {
    next(error);
  }
};

function deny(res: Response, status = 403, code = 'INSUFFICIENT_PERMISSIONS') {
  return res.status(status).json({ success: false, error: { code, message: 'You do not have permission to perform this action' } });
}

/** Stable `resource.action` keys used by default role checks and the permission editor. */
export function permissionForRequest(req: Request): string {
  const path = `${req.baseUrl || ''}${req.route?.path || req.path}`.toLowerCase();
  const method = req.method.toUpperCase();
  const writeAction = /\/(status|complete|cancel|receive|approve|fail|resolve|start|assign|activate|deactivate)(\/|$)/.test(path) ? 'update' : 'create';
  const action = method === 'GET' ? 'read' : method === 'POST' ? writeAction : method === 'DELETE' ? 'delete' : 'update';
  if (path.includes('feedback')) return `feedback.${action}`;
  if (path.includes('usage-events')) return `usage.${action}`;
  if (path.includes('adjust')) return 'inventory.adjust';
  if (path.includes('stock-count')) return 'inventory.counts';
  if (path.includes('transfer')) return 'inventory.transfers';
  if (path.includes('purchase-order') || path.includes('supplier')) return `purchasing.${action}`;
  if (path.includes('inventory') || path.includes('warehouse')) return `inventory.${action}`;
  if (path.includes('order')) return `orders.${action}`;
  if (path.includes('return')) return `returns.${action}`;
  if (path.includes('dispatch') || path.includes('route') || path.includes('my-deliveries')) return `dispatch.${action}`;
  if (path.includes('driver') || path.includes('vehicle') || path.includes('maintenance')) return `fleet.${action}`;
  if (path.includes('payment') || path.includes('invoice') || path.includes('cash') || path.includes('accounting') || path.includes('expense')) return `finance.${action}`;
  if (path.includes('user') || path.includes('permission') || path.includes('branch') || path.includes('company')) return `users.${action}`;
  if (path.includes('report') || path.includes('analytics') || path.includes('insight')) return `reports.${action}`;
  if (path.includes('customer') || path.includes('account')) return `customers.${action}`;
  return `operations.${action}`;
}

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
        baseRole: string;
        companyId: number;
        branchId: number | null;
        companyMembershipId: number;
      };
    }
  }
}
