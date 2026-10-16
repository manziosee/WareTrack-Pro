import { emitEvent } from '../services/events';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';

const cache = CacheService.getInstance();

export class InventoryController {
  static async getInventory(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, search, category, status } = req.query;
      // Lists return up to 500 rows so the UI can sort, filter and page instantly
      const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 500);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * pageSize;

      const items = await prisma.inventoryItem.findMany({
        skip,
        take: pageSize,
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
        pagination: { page: Number(page), limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  /** Every category: the managed list plus any name already used by an item, with item counts. */
  static async getCategories(req: Request, res: Response) {
    try {
      const [saved, used] = await Promise.all([
        prisma.inventoryCategory.findMany({ orderBy: { name: 'asc' } }),
        prisma.inventoryItem.groupBy({ by: ['category'], _count: { _all: true }, _sum: { quantity: true } }),
      ]);
      const byName = new Map<string, any>();
      for (const c of saved) byName.set(c.name.toLowerCase(), { id: c.id, name: c.name, description: c.description, color: c.color, items: 0, units: 0 });
      for (const u of used) {
        if (!u.category) continue;
        const key = u.category.toLowerCase();
        const row = byName.get(key) || { id: null, name: u.category, description: null, color: null, items: 0, units: 0 };
        row.items += u._count._all;
        row.units += u._sum.quantity || 0;
        byName.set(key, row);
      }
      const data = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
      // ?names=1 keeps the old plain list for simple clients
      res.json({ success: true, data: req.query.names ? data.map((c) => c.name) : data });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async createCategory(req: Request, res: Response) {
    try {
      const name = String(req.body?.name || '').trim().replace(/\s+/g, ' ');
      if (name.length < 2 || name.length > 60) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category name must be 2 to 60 characters' } });
      }
      const existing = await prisma.inventoryCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
      if (existing) return res.json({ success: true, data: existing });
      const category = await prisma.inventoryCategory.create({
        data: { name, description: req.body?.description ? String(req.body.description).slice(0, 200) : null, color: req.body?.color || null },
      });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
    }
  }

  /** Rename (by current name, so categories only used by items can be renamed too). */
  static async renameCategory(req: Request, res: Response) {
    try {
      const from = String(req.body?.from || '').trim();
      const to = String(req.body?.to || '').trim().replace(/\s+/g, ' ');
      if (!from || to.length < 2 || to.length > 60) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Give the current name and a new name of 2 to 60 characters' } });
      }
      const result = await prisma.$transaction(async (tx) => {
        const items = await tx.inventoryItem.updateMany({ where: { category: { equals: from, mode: 'insensitive' } }, data: { category: to } });
        const current = await tx.inventoryCategory.findFirst({ where: { name: { equals: from, mode: 'insensitive' } } });
        const target = await tx.inventoryCategory.findFirst({ where: { name: { equals: to, mode: 'insensitive' } } });
        if (current && target && current.id !== target.id) await tx.inventoryCategory.delete({ where: { id: current.id } });
        else if (current) await tx.inventoryCategory.update({ where: { id: current.id }, data: { name: to, description: req.body?.description ?? current.description } });
        else if (!target) await tx.inventoryCategory.create({ data: { name: to } });
        return items.count;
      });
      res.json({ success: true, data: { name: to, itemsUpdated: result } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
    }
  }

  /** Delete a category; items in it move to `moveTo` (required when it has items). */
  static async deleteCategory(req: Request, res: Response) {
    try {
      const name = String(req.query.name || req.body?.name || '').trim();
      const moveTo = String(req.query.moveTo || req.body?.moveTo || '').trim();
      if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category name is required' } });
      const count = await prisma.inventoryItem.count({ where: { category: { equals: name, mode: 'insensitive' } } });
      if (count && !moveTo) {
        return res.status(409).json({ success: false, error: { code: 'CATEGORY_IN_USE', message: `${count} item${count === 1 ? ' is' : 's are'} in this category. Choose a category to move ${count === 1 ? 'it' : 'them'} to.` } });
      }
      await prisma.$transaction(async (tx) => {
        if (count) await tx.inventoryItem.updateMany({ where: { category: { equals: name, mode: 'insensitive' } }, data: { category: moveTo } });
        await tx.inventoryCategory.deleteMany({ where: { name: { equals: name, mode: 'insensitive' } } });
        if (moveTo) {
          const exists = await tx.inventoryCategory.findFirst({ where: { name: { equals: moveTo, mode: 'insensitive' } } });
          if (!exists) await tx.inventoryCategory.create({ data: { name: moveTo } });
        }
      });
      res.json({ success: true, data: { moved: count } });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } });
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
            value: item.quantity * Number(item.unitPrice),
            currency: 'RWF'
          });
        }
        return acc;
      }, []);

      res.json({
        success: true,
        data: {
          totalItems,
          totalValue,
          currency: 'RWF',
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
          quantity: quantity !== undefined ? Number(quantity) : undefined,
          minQuantity: minQuantity !== undefined ? Number(minQuantity) : undefined,
          unit,
          unitCategory,
          location,
          barcode,
          unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
          supplier,
          description,
          status: 'ACTIVE'
        }
      });

      // Create inventory history record
      await prisma.inventoryHistory.create({
        data: {
          itemId: item.id,
          action: 'stock_in',
          quantity: Number(quantity),
          previousQuantity: 0,
          newQuantity: Number(quantity),
          notes: 'Initial stock creation',
          performedBy: Number(req.user?.userId) || 1
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

      // Get current item for history tracking
      const currentItem = await prisma.inventoryItem.findUnique({
        where: { id: Number(id) }
      });

      if (!currentItem) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' }
        });
      }

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

      // Create inventory history if quantity changed
      if (quantity !== undefined && currentItem.quantity !== Number(quantity)) {
        const action = Number(quantity) > currentItem.quantity ? 'stock_in' : 'stock_out';
        await prisma.inventoryHistory.create({
          data: {
            itemId: item.id,
            action,
            quantity: Math.abs(Number(quantity) - currentItem.quantity),
            previousQuantity: currentItem.quantity,
            newQuantity: Number(quantity),
            notes: 'Stock adjustment via update',
            performedBy: Number(req.user?.userId) || 1
          }
        });
      }

      // Check for low stock and send alert
      if (quantity !== undefined && minQuantity !== undefined && Number(quantity) <= Number(minQuantity)) {
        emitEvent('stock.low', { id: item.id, name: item.name, code: item.code, quantity: item.quantity, minQuantity: item.minQuantity });
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