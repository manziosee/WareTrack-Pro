import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class BarcodeController {
  static generateBarcode(prefix: string, id: number): string {
    const paddedId = id.toString().padStart(8, '0');
    return `${prefix}${paddedId}`;
  }

  static async generateForItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const userId = req.user?.userId;
      
      const item = await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } });
      if (!item) {
        return res.status(404).json({ success: false, error: { message: 'Item not found' } });
      }
      
      const barcode = item.barcode || BarcodeController.generateBarcode('WTP', item.id);
      
      await prisma.inventoryItem.update({
        where: { id: Number(itemId) },
        data: { barcode }
      });
      
      await prisma.$executeRaw`
        INSERT INTO barcode_logs (item_id, barcode, format, generated_by)
        VALUES (${itemId}, ${barcode}, 'CODE128', ${userId})
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
      const results = [];
      
      for (const itemId of itemIds) {
        const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (item) {
          const barcode = item.barcode || BarcodeController.generateBarcode('WTP', item.id);
          
          await prisma.inventoryItem.update({
            where: { id: itemId },
            data: { barcode }
          });
          
          await prisma.$executeRaw`
            INSERT INTO barcode_logs (item_id, barcode, format, generated_by)
            VALUES (${itemId}, ${barcode}, 'CODE128', ${userId})
          `;
          
          results.push({ itemId, barcode, name: item.name });
        }
      }
      
      res.json({ success: true, data: results });
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
