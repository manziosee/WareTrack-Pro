import { emitEvent } from '../services/events';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';

const cache = CacheService.getInstance();

function stockInclude(req: Request) {
  return { warehouseStock: { where: {
    companyId: req.user!.companyId,
    ...(req.user!.branchId === null ? { branchId: null } : { OR: [{ branchId: req.user!.branchId }, { branchId: null }] }),
  }, select: { quantity: true } } };
}

function presentBranchStock<T extends { warehouseStock?: { quantity: number }[] }>(item: T) {
  const { warehouseStock = [], ...fields } = item;
  return { ...fields, quantity: warehouseStock.reduce((sum, row) => sum + row.quantity, 0) };
}

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
        },
        include: { ...stockInclude(req), packagings: { orderBy: { unitsPerPack: 'asc' } } }
      });

      const total = await prisma.inventoryItem.count();

      res.json({
        success: true,
        data: items.map(presentBranchStock),
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
      const [saved, items] = await Promise.all([
        prisma.inventoryCategory.findMany({ orderBy: { name: 'asc' } }),
        prisma.inventoryItem.findMany({ select: { category: true, ...stockInclude(req) } }),
      ]);
      const byName = new Map<string, any>();
      for (const c of saved) byName.set(c.name.toLowerCase(), { id: c.id, name: c.name, description: c.description, color: c.color, items: 0, units: 0 });
      for (const u of items) {
        if (!u.category) continue;
        const key = u.category.toLowerCase();
        const row = byName.get(key) || { id: null, name: u.category, description: null, color: null, items: 0, units: 0 };
        row.items += 1;
        row.units += u.warehouseStock.reduce((sum, stock) => sum + stock.quantity, 0);
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
      const items = (await prisma.inventoryItem.findMany({ include: stockInclude(req) })).map(presentBranchStock);
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
      const items = (await prisma.inventoryItem.findMany({ include: stockInclude(req) })).map(presentBranchStock);
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
      const rawItem = await prisma.inventoryItem.findUnique({
        where: { id: Number(id) }, include: stockInclude(req),
      });
      const item = rawItem && presentBranchStock(rawItem);
      
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
      const itemId = Number(id);
      if (!Number.isInteger(itemId) || itemId < 1) return res.status(400).json({ success: false, error: { code: 'INVALID_ITEM_ID', message: 'Item ID must be a positive integer' } });
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
      const search = String(req.query.search || '').trim();
      const action = String(req.query.action || '').trim();
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;
      if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: 'History dates must be valid ISO dates' } });
      }
      const where = {
        itemId,
        ...(action ? { action: { equals: action, mode: 'insensitive' as const } } : {}),
        ...(search ? { OR: [
          { action: { contains: search, mode: 'insensitive' as const } },
          { notes: { contains: search, mode: 'insensitive' as const } },
          { order: { orderNumber: { contains: search, mode: 'insensitive' as const } } },
          { performedByUser: { name: { contains: search, mode: 'insensitive' as const } } },
        ] } : {}),
        ...(from || to ? { performedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      };
      const [history, total] = await Promise.all([
        prisma.inventoryHistory.findMany({
          where, skip: (page - 1) * limit, take: limit, orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
          include: {
            performedByUser: { select: { id: true, name: true } },
            order: { select: { id: true, orderNumber: true } },
          },
        }),
        prisma.inventoryHistory.count({ where }),
      ]);
      res.json({ success: true, data: history, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
      console.error('Inventory history error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not load inventory history' } });
    }
  }

  static async createInventoryItem(req: Request, res: Response) {
    try {
      const { name, code, category, quantity, minQuantity, unit, unitCategory, location, unitPrice, supplier, description } = req.body;

      const created = await prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.create({ data: {
          name,
          code,
          category,
          quantity: quantity !== undefined ? Number(quantity) : undefined,
          minQuantity: minQuantity !== undefined ? Number(minQuantity) : undefined,
          unit,
          unitCategory,
          location,
          barcode: null,
          unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
          supplier,
          description,
          status: 'ACTIVE'
        } });
        if (!item.barcode) {
          const { BarcodeController } = await import('./barcodeController');
          await tx.inventoryItem.update({ where: { id: item.id }, data: { barcode: BarcodeController.productBarcode(item.category, item.id) } });
          item.barcode = BarcodeController.productBarcode(item.category, item.id);
        }
        const warehouse = await tx.warehouse.findFirst({ where: { active: true }, select: { id: true } });
        if (warehouse) await tx.warehouseStock.create({ data: { warehouseId: warehouse.id, itemId: item.id, quantity: Number(quantity || 0) } });
        await tx.inventoryHistory.create({ data: {
          itemId: item.id,
          action: 'stock_in',
          quantity: Number(quantity || 0),
          previousQuantity: 0,
          newQuantity: Number(quantity || 0),
          notes: 'Initial stock creation',
          performedBy: Number(req.user?.userId) || 1
        } });
        return item;
      });

      await cache.invalidateInventoryCache();
      
      res.status(201).json({ success: true, data: created });
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
      
      const result = await prisma.$transaction(async (tx) => {
        const insertedItems = await tx.inventoryItem.createMany({ data: items.map((item: any) => ({
          name: item.name,
          code: item.code,
          category: item.category,
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          unit: item.unit,
          unitCategory: item.unitCategory,
          location: item.location,
          barcode: null,
          unitPrice: item.unitPrice,
          supplier: item.supplier,
          description: item.description,
          status: 'ACTIVE'
        })) });
        const created = await tx.inventoryItem.findMany({ where: { code: { in: items.map((item: any) => item.code) } }, select: { id: true, name: true, code: true, category: true, quantity: true, barcode: true } });
        const { BarcodeController } = await import('./barcodeController');
        for (const item of created.filter((row) => !row.barcode)) await tx.inventoryItem.update({ where: { id: item.id }, data: { barcode: BarcodeController.productBarcode(item.category, item.id) } });
        const warehouse = await tx.warehouse.findFirst({ where: { active: true }, select: { id: true } });
        if (warehouse && created.length) await tx.warehouseStock.createMany({ data: created.map((item) => ({ warehouseId: warehouse.id, itemId: item.id, quantity: item.quantity })) });
        if (created.length) await tx.inventoryHistory.createMany({ data: created.map((item) => ({
          itemId: item.id, action: 'stock_in', quantity: item.quantity, previousQuantity: 0, newQuantity: item.quantity,
          notes: `Initial stock import: ${item.code}`, performedBy: Number(req.user?.userId) || 1,
        })) });
        return insertedItems;
      });
      await cache.invalidateInventoryCache();
      
      res.status(201).json({ 
        success: true,
        message: `${result.count} items imported successfully`
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

      const item = await prisma.$transaction(async (tx) => {
        let quantityChange: any = undefined;
        let branchQuantity = 0;
        let adjustment = 0;
        const stockRows = await tx.warehouseStock.findMany({ where: { itemId: Number(id) }, orderBy: { warehouseId: 'asc' } });
        branchQuantity = stockRows.reduce((sum, stock) => sum + stock.quantity, 0);
        if (quantity !== undefined) {
          const target = Number(quantity);
          if (!Number.isFinite(target) || target < 0) throw new Error('Stock quantity must be a non-negative number');
          adjustment = target - branchQuantity;
          if (adjustment > 0) {
            const warehouse = await tx.warehouse.findFirst({ where: { active: true }, orderBy: { id: 'asc' }, select: { id: true } });
            if (!warehouse) throw new Error('Create an active warehouse in this branch before adjusting stock');
            await tx.warehouseStock.upsert({
              where: { warehouseId_itemId: { warehouseId: warehouse.id, itemId: Number(id) } },
              create: { warehouseId: warehouse.id, itemId: Number(id), quantity: adjustment },
              update: { quantity: { increment: adjustment } },
            });
            quantityChange = { increment: adjustment };
          } else if (adjustment < 0) {
            let remaining = -adjustment;
            for (const stock of stockRows) {
              if (!remaining) break;
              const take = Math.min(stock.quantity, remaining);
              if (take) await tx.warehouseStock.update({ where: { id: stock.id }, data: { quantity: { decrement: take } } });
              remaining -= take;
            }
            if (remaining) throw new Error('The branch stock changed while the adjustment was being saved');
            quantityChange = { decrement: -adjustment };
          }
        }
        const updated = await tx.inventoryItem.update({ where: { id: Number(id) }, data: {
          name,
          code,
          category,
          quantity: quantityChange,
          minQuantity: minQuantity !== undefined ? Number(minQuantity) : undefined,
          unit,
          unitCategory,
          location,
          barcode,
          unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
          supplier,
          description,
          status: status as any
        } });

      // Create inventory history if quantity changed
      if (quantity !== undefined && adjustment !== 0) {
        const action = adjustment > 0 ? 'stock_in' : 'stock_out';
        await tx.inventoryHistory.create({ data: {
            itemId: updated.id,
            action,
            quantity: Math.abs(adjustment),
            previousQuantity: branchQuantity,
            newQuantity: Number(quantity),
            notes: 'Stock adjustment via update',
            performedBy: Number(req.user?.userId) || 1
        } });
      }
      return { ...updated, quantity: quantity === undefined ? branchQuantity : Number(quantity) };
      });

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
      
      await prisma.inventoryItem.update({ where: { id: Number(id) }, data: { status: 'DISCONTINUED' } });
      await cache.invalidateInventoryCache();
      
      res.json({ 
        success: true,
        message: 'Item archived. Stock and movement history have been preserved.'
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
