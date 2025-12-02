import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';

const cache = CacheService.getInstance();

export class InventoryController {
  static async getInventory(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, category, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const items = await prisma.inventoryItem.findMany({
        skip,
        take: Number(limit),
        where: {
          ...(category && { category: category as string }),
          ...(status && { status: status as any }),
          ...(search && {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { code: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        }
      });

      const total = await prisma.inventoryItem.count();

      res.json({
        success: true,
        data: items,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getCategories(req: Request, res: Response) {
    try {
      const categories = ['Electronics', 'Furniture', 'Office Supplies', 'Equipment', 'Tools', 'Materials'];
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getLowStock(req: Request, res: Response) {
    try {
      const items = await prisma.inventoryItem.findMany();
      const lowStockItems = items.filter(item => item.quantity < item.minQuantity);
      res.json({ success: true, data: lowStockItems });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const items = await prisma.inventoryItem.findMany();
      const totalItems = items.length;
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0);
      const outOfStock = items.filter(item => item.quantity === 0).length;
      const lowStock = items.filter(item => item.quantity < item.minQuantity && item.quantity > 0).length;
      
      const categories = items.reduce((acc: any[], item) => {
        const existing = acc.find(cat => cat.name === item.category);
        if (existing) {
          existing.count += 1;
          existing.value += item.quantity * Number(item.unitPrice);
        } else {
          acc.push({
            name: item.category,
            count: 1,
            value: item.quantity * Number(item.unitPrice)
          });
        }
        return acc;
      }, []);

      res.json({
        success: true,
        data: {
          totalItems,
          totalValue,
          outOfStock,
          lowStock,
          categories
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getInventoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const item = await prisma.inventoryItem.findUnique({
        where: { id: Number(id) }
      });
      
      if (!item) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' }
        });
      }

      res.json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getItemHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Mock history - implement with actual history table
      const history = [
        { id: 1, itemId: Number(id), action: 'created', quantity: 100, date: new Date(), user: 'Admin' }
      ];
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async createInventoryItem(req: Request, res: Response) {
    try {
      const { name, code, category, quantity, minQuantity, unit, unitCategory, location, barcode, unitPrice, supplier, description } = req.body;

      const item = await prisma.inventoryItem.create({
        data: {
          name,
          code,
          category,
          quantity: Number(quantity),
          minQuantity: Number(minQuantity),
          unit,
          unitCategory,
          location,
          barcode,
          unitPrice: Number(unitPrice),
          supplier,
          description,
          status: 'ACTIVE'
        }
      });

      await cache.invalidateInventoryCache();
      
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async bulkImport(req: Request, res: Response) {
    try {
      const { items } = req.body;
      
      const insertedItems = await prisma.inventoryItem.createMany({
        data: items.map((item: any) => ({
          name: item.name,
          code: item.code,
          category: item.category,
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          unit: item.unit,
          unitCategory: item.unitCategory,
          location: item.location,
          barcode: item.barcode,
          unitPrice: item.unitPrice,
          supplier: item.supplier,
          description: item.description,
          status: 'ACTIVE'
        }))
      });
      await cache.invalidateInventoryCache();
      
      res.status(201).json({ 
        success: true,
        message: `${insertedItems.count} items imported successfully`
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async updateInventoryItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, category, quantity, minQuantity, unit, unitCategory, location, barcode, unitPrice, supplier, description, status } = req.body;

      const item = await prisma.inventoryItem.update({
        where: { id: Number(id) },
        data: {
          name,
          code,
          category,
          quantity: Number(quantity),
          minQuantity: Number(minQuantity),
          unit,
          unitCategory,
          location,
          barcode,
          unitPrice: Number(unitPrice),
          supplier,
          description,
          status: status as any
        }
      });

      // Check for low stock and send alert
      if (quantity <= minQuantity) {
        console.log('✅ Inventory Alert - Low Stock ⚠️ - Sent successfully');
        await QueueService.addEmailJob({
          email: 'warehouse@example.com',
          title: 'Inventory Alert - Low Stock ⚠️',
          name: 'Warehouse Manager',
          message: `Item "${name}" (${code}) is running low. Current stock: ${quantity}, Minimum required: ${minQuantity}`,
          template: 'low_stock_alert'
        });
      }

      await cache.invalidateInventoryCache();
      
      res.json({ 
        success: true,
        data: item
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async deleteInventoryItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.inventoryItem.delete({
        where: { id: Number(id) }
      });
      await cache.invalidateInventoryCache();
      
      res.json({ 
        success: true,
        message: 'Item deleted successfully' 
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' }
        });
      }
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}