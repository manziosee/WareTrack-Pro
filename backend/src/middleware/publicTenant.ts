import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { runWithTenant } from '../lib/tenantContext';

/** Scope unauthenticated catalog and tracking calls to a company.
 * Order numbers and POD codes are capabilities, so they can resolve the tenant
 * when a customer follows a link without company-selection headers.
 */
export async function publicTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const explicitCompany = req.header('X-Company-Id');
    let companyId = explicitCompany ? Number(explicitCompany) : 1;
    let branchId = req.header('X-Branch-Id') ? Number(req.header('X-Branch-Id')) : null;

    const orderNumber = req.params?.orderNumber;
    const proofCode = req.params?.code;
    if (orderNumber) {
      const order = await prisma.deliveryOrder.findUnique({ where: { orderNumber: String(orderNumber).toUpperCase() }, select: { companyId: true, branchId: true } });
      if (order) {
        if (explicitCompany && Number(explicitCompany) !== order.companyId) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
        companyId = order.companyId;
        branchId = order.branchId;
      }
    } else if (proofCode) {
      const proof = await prisma.deliveryProof.findUnique({ where: { confirmationCode: proofCode }, select: { companyId: true, branchId: true } });
      if (proof) {
        if (explicitCompany && Number(explicitCompany) !== proof.companyId) return res.status(404).json({ success: false, error: { message: 'Proof not found' } });
        companyId = proof.companyId;
        branchId = proof.branchId;
      }
    }

    if (!Number.isInteger(companyId) || companyId < 1) return res.status(400).json({ success: false, error: { code: 'INVALID_COMPANY', message: 'A valid company must be selected' } });
    const company = await prisma.company.findFirst({ where: { id: companyId, active: true } });
    if (!company) return res.status(404).json({ success: false, error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found' } });
    if (branchId !== null) {
      if (!Number.isInteger(branchId) || !await prisma.branch.findFirst({ where: { id: branchId, companyId, active: true } })) return res.status(404).json({ success: false, error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found' } });
    }
    runWithTenant({ companyId, branchId }, next);
  } catch (error) {
    next(error);
  }
}
