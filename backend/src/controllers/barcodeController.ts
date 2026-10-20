import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getTenantContext } from '../lib/tenantContext';

export class BarcodeController {
  static productBarcode(category: string, id: number): string {
    const categoryCode = (category || 'GENERAL').normalize('NFKD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'GENERAL';
    return `WTP-${categoryCode}-${id.toString().padStart(8, '0')}`;
  }

  static generateBarcode(prefix: string, id: number): string {
    const paddedId = id.toString().padStart(8, '0');
    return `${prefix}${paddedId}`;
  }

  static async generateForItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const userId = req.user?.userId;
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      
      const item = await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } });
      if (!item) {
        return res.status(404).json({ success: false, error: { message: 'Item not found' } });
      }
      
      const barcode = item.barcode || BarcodeController.productBarcode(item.category, item.id);
      
      await prisma.inventoryItem.update({
        where: { id: Number(itemId) },
        data: { barcode }
      });
      
      await prisma.$executeRaw`
        INSERT INTO barcode_logs (company_id, branch_id, item_id, barcode, format, generated_by)
        VALUES (${tenant.companyId}, ${tenant.branchId}, ${itemId}, ${barcode}, 'CODE128', ${userId})
      `;
      
      res.json({ success: true, data: { barcode, format: 'CODE128' } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async batchGenerate(req: Request, res: Response) {
    try {
      const { itemIds } = req.body;
      const userId = req.user?.userId;
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      const results = [];
      
      for (const itemId of itemIds) {
        const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (item) {
          const barcode = item.barcode || BarcodeController.productBarcode(item.category, item.id);
          
          await prisma.inventoryItem.update({
            where: { id: itemId },
            data: { barcode }
          });
          
          await prisma.$executeRaw`
            INSERT INTO barcode_logs (company_id, branch_id, item_id, barcode, format, generated_by)
            VALUES (${tenant.companyId}, ${tenant.branchId}, ${itemId}, ${barcode}, 'CODE128', ${userId})
          `;
          
          results.push({ itemId, barcode, name: item.name });
        }
      }
      
      res.json({ success: true, data: results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /** Generate category-coded barcodes for legacy products that do not have one yet. */
  static async backfillMissing(req: Request, res: Response) {
    try {
      const tenant = getTenantContext();
      if (!tenant) return res.status(400).json({ success: false, error: { message: 'Company context is required' } });
      const userId = req.user?.userId;
      const items = await prisma.inventoryItem.findMany({ where: { OR: [{ barcode: null }, { barcode: '' }] }, orderBy: { id: 'asc' }, take: 1000, select: { id: true, name: true, category: true, barcode: true } });
      const generated = [];
      for (const item of items) {
        const barcode = BarcodeController.productBarcode(item.category, item.id);
        const result = await prisma.inventoryItem.updateMany({ where: { id: item.id, OR: [{ barcode: null }, { barcode: '' }] }, data: { barcode } });
        if (!result.count) continue;
        await prisma.$executeRaw`INSERT INTO barcode_logs (company_id, branch_id, item_id, barcode, format, generated_by) VALUES (${tenant.companyId}, ${tenant.branchId}, ${item.id}, ${barcode}, 'CODE128', ${userId})`;
        generated.push({ itemId: item.id, name: item.name, category: item.category, barcode });
      }
      res.json({ success: true, data: { generated, count: generated.length, remaining: items.length === 1000 } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async lookupByBarcode(req: Request, res: Response) {
    try {
      const { barcode } = req.params;
      
      const item = await prisma.inventoryItem.findFirst({
        where: { barcode }
      });
      
      if (!item) {
        return res.status(404).json({ success: false, error: { message: 'Item not found' } });
      }
      
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
