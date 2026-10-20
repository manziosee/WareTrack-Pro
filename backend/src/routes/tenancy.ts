import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { runWithoutTenant } from '../lib/tenantContext';
import { auth } from '../middleware/auth';

const router = Router();
const fail = (res: any, message: string, status = 400) => res.status(status).json({ success: false, error: { code: status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR', message } });
const roleKeys = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'];
const isConfiguredRole = async (companyId: number, role: string) => roleKeys.includes(role)
  || Boolean(await prisma.rolePermission.findFirst({ where: { companyId, role } }));
const tenantAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role === 'ADMIN' && req.user?.baseRole === 'ADMIN') return next();
  return fail(res, 'Company admin role required', 403);
};
const permissions = [
  'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.adjust', 'inventory.counts', 'inventory.transfers',
  'orders.read', 'orders.create', 'orders.update', 'orders.delete', 'purchasing.read', 'purchasing.create', 'purchasing.update', 'purchasing.delete',
  'returns.read', 'returns.create', 'returns.update', 'returns.delete', 'dispatch.read', 'dispatch.create', 'dispatch.update', 'dispatch.delete',
  'fleet.read', 'fleet.create', 'fleet.update', 'fleet.delete', 'finance.read', 'finance.create', 'finance.update', 'finance.delete',
  'users.read', 'users.create', 'users.update', 'users.delete', 'reports.read', 'reports.create', 'reports.update', 'reports.delete',
  'customers.read', 'customers.create', 'customers.update', 'customers.delete', 'operations.read', 'operations.create', 'operations.update', 'operations.delete',
  'feedback.read', 'feedback.create', 'feedback.update', 'feedback.delete',
  'usage.read', 'usage.create', 'usage.update', 'usage.delete',
];

/** @openapi
 * /api/tenancy/context:
 *   get:
 *     summary: List companies and branches available to the signed-in user
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Company memberships with branch role overrides }
 *       401: { description: Authentication required }
 */
router.get('/context', auth, async (req, res, next) => {
  try {
    const memberships = await runWithoutTenant(() => prisma.companyMembership.findMany({
      where: { userId: Number(req.user!.userId), active: true },
      include: {
        company: { select: { id: true, name: true, slug: true, legalName: true, legalAddress: true, taxNumber: true, taxRate: true, invoicePrefix: true, currency: true, timezone: true } },
        branches: { where: { active: true, branch: { active: true } }, include: { branch: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { companyId: 'asc' },
    }));
    res.json({
      success: true,
      data: memberships.map((membership) => ({
        company: membership.company,
        role: membership.role,
        branches: membership.branches.map((entry) => ({ ...entry.branch, role: entry.roleOverride || membership.role })),
        selected: membership.companyId === req.user!.companyId,
      })),
    });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/tenancy/companies:
 *   post:
 *     summary: Create a company and its first branch for the current administrator
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [name], properties: { name: { type: string }, slug: { type: string }, legalName: { type: string }, taxNumber: { type: string }, currency: { type: string }, timezone: { type: string } } }
 *     responses:
 *       201: { description: Created company, main branch, and admin membership }
 *       403: { description: Admin role required }
 */
router.post('/companies', auth, tenantAdmin, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const slug = String(req.body?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 80);
    if (name.length < 2 || name.length > 120 || slug.length < 2) return fail(res, 'Company name and a valid slug are required');
    const result = await runWithoutTenant(() => prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: {
        name, slug, legalName: req.body?.legalName ? String(req.body.legalName).slice(0, 160) : null,
        taxNumber: req.body?.taxNumber ? String(req.body.taxNumber).slice(0, 60) : null,
        currency: String(req.body?.currency || 'RWF').slice(0, 3).toUpperCase(), timezone: String(req.body?.timezone || 'Africa/Kigali').slice(0, 80),
      } });
      const branch = await tx.branch.create({ data: { companyId: company.id, name: 'Main Branch', code: 'MAIN' } });
      await tx.warehouse.create({ data: { companyId: company.id, branchId: branch.id, name: 'Main Warehouse', code: 'MAIN' } });
      const membership = await tx.companyMembership.create({ data: { companyId: company.id, userId: Number(req.user!.userId), role: 'ADMIN' } });
      await tx.branchMembership.create({ data: { companyMembershipId: membership.id, branchId: branch.id } });
      return { company, branch };
    }));
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/tenancy/branches:
 *   get:
 *     summary: List active branches in the selected company
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Company branches }
 */
router.get('/branches', auth, async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    const access = await prisma.branchMembership.findMany({
      where: { companyMembershipId: req.user!.companyMembershipId, active: true }, select: { branchId: true, roleOverride: true },
    });
    res.json({ success: true, data: branches.map((branch) => ({ ...branch, accessible: access.some((entry) => entry.branchId === branch.id), role: access.find((entry) => entry.branchId === branch.id)?.roleOverride || req.user!.baseRole })) });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/tenancy/branches:
 *   post:
 *     summary: Create a branch in the selected company
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [name, code], properties: { name: { type: string }, code: { type: string }, address: { type: string } } }
 *     responses:
 *       201: { description: Branch created and current admin assigned }
 *       403: { description: Admin role required }
 */
/** @openapi
 * /api/tenancy/company:
 *   get:
 *     summary: Read selected company legal and invoice settings
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Company legal details, currency, time zone, tax rate, and invoice prefix }
 *   patch:
 *     summary: Update company tax, invoice numbering, and legal details
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               legalName: { type: string, maxLength: 160 }
 *               legalAddress: { type: string, maxLength: 300 }
 *               taxNumber: { type: string, maxLength: 60 }
 *               taxRate: { type: number, minimum: 0, maximum: 1, example: 0.18 }
 *               invoicePrefix: { type: string, pattern: '^[A-Z0-9][A-Z0-9_-]{0,11}$' }
 *               currency: { type: string, pattern: '^[A-Z]{3}$' }
 *               timezone: { type: string, example: Africa/Kigali }
 *     responses:
 *       200: { description: Updated company settings }
 *       400: { description: Invalid tax, currency, time zone, or invoice prefix }
 *       403: { description: Company admin role required }
 */
router.get('/company', auth, async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.user!.companyId } });
    if (!company) return fail(res, 'Company not found', 404);
    res.json({ success: true, data: company });
  } catch (error) { next(error); }
});

router.patch('/company', auth, tenantAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    for (const [key, max] of [['legalName', 160], ['legalAddress', 300], ['taxNumber', 60]] as const) {
      if (body[key] === undefined) continue;
      if (body[key] !== null && (typeof body[key] !== 'string' || body[key].length > max)) return fail(res, `${key} must be at most ${max} characters`);
      data[key] = typeof body[key] === 'string' ? body[key].trim() || null : null;
    }
    if (body.taxRate !== undefined) {
      const taxRate = Number(body.taxRate);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) return fail(res, 'taxRate must be between 0 and 1');
      data.taxRate = taxRate;
    }
    if (body.invoicePrefix !== undefined) {
      const prefix = String(body.invoicePrefix).trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{0,11}$/.test(prefix)) return fail(res, 'invoicePrefix must be 1–12 letters, numbers, dashes, or underscores');
      data.invoicePrefix = prefix;
    }
    if (body.currency !== undefined) {
      const currency = String(body.currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) return fail(res, 'currency must be a three-letter code');
      data.currency = currency;
    }
    if (body.timezone !== undefined) {
      const timezone = String(body.timezone).trim();
      try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { return fail(res, 'timezone must be a valid IANA time zone'); }
      data.timezone = timezone;
    }
    const company = await prisma.company.update({ where: { id: req.user!.companyId }, data: data as any });
    res.json({ success: true, data: company });
  } catch (error) { next(error); }
});

router.post('/branches', auth, tenantAdmin, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (name.length < 2 || name.length > 120 || !/^[A-Z0-9_-]{2,20}$/.test(code)) return fail(res, 'Branch name and a 2–20 character code are required');
    const result = await runWithoutTenant(() => prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({ data: { companyId: req.user!.companyId, name, code, address: req.body?.address ? String(req.body.address).slice(0, 240) : null } });
      await tx.warehouse.create({ data: { companyId: req.user!.companyId, branchId: branch.id, name: `${name} Warehouse`, code } });
      await tx.branchMembership.create({ data: { companyMembershipId: req.user!.companyMembershipId, branchId: branch.id } });
      return branch;
    }));
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/tenancy/branches/{branchId}/members:
 *   put:
 *     summary: Add or update a user's branch membership and optional branch role
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [userId], properties: { userId: { type: integer }, roleOverride: { type: string } } }
 *     responses:
 *       200: { description: Branch membership saved }
 *       404: { description: Company membership or branch not found }
 */
router.put('/branches/:branchId/members', auth, tenantAdmin, async (req, res, next) => {
  try {
    const branchId = Number(req.params.branchId);
    const targetUserId = Number(req.body?.userId);
    const roleOverride = req.body?.roleOverride ? String(req.body.roleOverride).trim().toUpperCase() : null;
    if (!Number.isInteger(targetUserId) || targetUserId < 1 || (roleOverride && !/^[A-Z][A-Z0-9_:-]{1,63}$/.test(roleOverride))) return fail(res, 'Provide a valid user ID and role key');
    if (roleOverride && !await isConfiguredRole(req.user!.companyId, roleOverride)) return fail(res, 'Configure permissions for this role before assigning it');
    const [branch, membership] = await Promise.all([
      prisma.branch.findFirst({ where: { id: branchId, companyId: req.user!.companyId } }),
      prisma.companyMembership.findUnique({ where: { companyId_userId: { companyId: req.user!.companyId, userId: targetUserId } } }),
    ]);
    if (!branch || !membership?.active) return fail(res, 'Branch or active company membership not found', 404);
    const saved = await prisma.branchMembership.upsert({
      where: { companyMembershipId_branchId: { companyMembershipId: membership.id, branchId } },
      create: { companyMembershipId: membership.id, branchId, roleOverride },
      update: { roleOverride, active: true },
    });
    res.json({ success: true, data: saved });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/tenancy/permissions:
 *   get:
 *     summary: Read role permission grants for the selected company and branch
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Permission catalog and grants }
 */
router.get('/permissions', auth, tenantAdmin, async (req, res, next) => {
  try {
    const grants = await prisma.rolePermission.findMany({ where: { companyId: req.user!.companyId }, orderBy: [{ role: 'asc' }, { permission: 'asc' }] });
    res.json({ success: true, data: { permissions, roles: roleKeys, customRoles: [...new Set(grants.map((grant) => grant.role).filter((role) => !roleKeys.includes(role)))], grants } });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/tenancy/permissions:
 *   put:
 *     summary: Replace a role's action grants, optionally limited to one branch
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, grants]
 *             properties:
 *               role: { type: string, example: WAREHOUSE_STAFF }
 *               branchId: { type: integer, nullable: true }
 *               grants: { type: array, items: { type: object, required: [permission, allowed], properties: { permission: { type: string }, allowed: { type: boolean } } } }
 *     responses:
 *       200: { description: Grants replaced }
 *       400: { description: Invalid permission or branch }
 */
router.put('/permissions', auth, tenantAdmin, async (req, res, next) => {
  try {
    const role = String(req.body?.role || '').trim().toUpperCase();
    const branchId = req.body?.branchId === null || req.body?.branchId === undefined ? null : Number(req.body.branchId);
    const grants = req.body?.grants;
    if (!/^[A-Z][A-Z0-9_:-]{1,63}$/.test(role) || !Array.isArray(grants) || grants.length > permissions.length) return fail(res, 'Provide a valid role key and grant list');
    if (branchId !== null && (!Number.isInteger(branchId) || !await prisma.branch.findFirst({ where: { id: branchId, companyId: req.user!.companyId } }))) return fail(res, 'Branch not found in this company');
    if (grants.some((grant: any) => !permissions.includes(grant.permission) || typeof grant.allowed !== 'boolean')) return fail(res, 'A grant contains an unsupported permission or invalid allowed value');
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { companyId: req.user!.companyId, role, branchId } });
      if (grants.length) await tx.rolePermission.createMany({ data: grants.map((grant: any) => ({ companyId: req.user!.companyId, role, permission: grant.permission, branchId, allowed: grant.allowed })) });
    });
    res.json({ success: true, data: { role, branchId, grants: grants.length } });
  } catch (error) { next(error); }
});

/** @openapi
 * /api/tenancy/companies/{companyId}/members:
 *   post:
 *     summary: Add an existing WareTrack user to the selected company
 *     tags: [Tenancy and Permissions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [email, role], properties: { email: { type: string, format: email }, role: { type: string }, branchIds: { type: array, items: { type: integer } } } }
 *     responses:
 *       201: { description: Company membership created }
 *       404: { description: User or branch not found }
 */
router.post('/companies/:companyId/members', auth, tenantAdmin, async (req, res, next) => {
  try {
    const companyId = Number(req.params.companyId);
    if (companyId !== req.user!.companyId) return fail(res, 'Select this company before adding members', 403);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = String(req.body?.role || '').trim().toUpperCase();
    const branchIds: number[] = Array.isArray(req.body?.branchIds) ? req.body.branchIds.map(Number) : [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[A-Z][A-Z0-9_:-]{1,63}$/.test(role)) return fail(res, 'Provide a valid email and role key');
    if (!await isConfiguredRole(companyId, role)) return fail(res, 'Configure permissions for this role before assigning it');
    const result = await runWithoutTenant(async () => {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!user) return null;
      const uniqueBranchIds = [...new Set(branchIds)];
      const branches = uniqueBranchIds.length
        ? await prisma.branch.findMany({ where: { companyId, id: { in: uniqueBranchIds }, active: true }, select: { id: true } })
        : [];
      if (branches.length !== uniqueBranchIds.length) return { invalidBranches: true as const };
      return prisma.$transaction(async (tx) => {
        const membership = await tx.companyMembership.upsert({
          where: { companyId_userId: { companyId, userId: user.id } },
          create: { companyId, userId: user.id, role }, update: { role, active: true },
        });
        if (branches.length) await tx.branchMembership.createMany({ data: branches.map((branch) => ({ companyMembershipId: membership.id, branchId: branch.id })), skipDuplicates: true });
        return { userId: user.id, membership };
      });
    });
    if (!result) return fail(res, 'User not found', 404);
    if ('invalidBranches' in result) return fail(res, 'One or more branch IDs do not belong to this company');
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

export default router;
