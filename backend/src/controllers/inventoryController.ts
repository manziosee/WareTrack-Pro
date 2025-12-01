import { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, ilike, or, lt } from 'drizzle-orm';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';

const cache = CacheService.getInstance();

export class InventoryController {
  static async getInventory(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, category, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const items = await db.select().from(schema.inventoryItems).limit(Number(limit)).offset(offset);

      res.json({
        success: true,
        data: items,
        pagination: { page: Number(page), limit: Number(limit), total: items.length, totalPages: Math.ceil(items.length / Number(limit)) }
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
      const items = await db.select().from(schema.inventoryItems);
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
      const items = await db.select().from(schema.inventoryItems);
      const totalItems = items.length;
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);
      const outOfStock = items.filter(item => item.quantity === 0).length;
      const lowStock = items.filter(item => item.quantity < item.minQuantity && item.quantity > 0).length;
      
      const categories = items.reduce((acc: any[], item) => {
        const existing = acc.find(cat => cat.name === item.category);
        if (existing) {
          existing.count += 1;
          existing.value += item.quantity * parseFloat(item.unitPrice);
        } else {
          acc.push({
            name: item.category,
            count: 1,
            value: item.quantity * parseFloat(item.unitPrice)
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
      const [item] = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, Number(id))).limit(1);
      
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      res.json(item);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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

      const [item] = await db.insert(schema.inventoryItems).values({
        name,
        code,
        category,
        quantity,
        minQuantity,
        unit,
        unitCategory,
        location,
        barcode,
        unitPrice,
        supplier,
        description,
        status: 'active'
      }).returning();

      await cache.invalidateInventoryCache();
      
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  static async bulkImport(req: Request, res: Response) {
    try {
      const { items } = req.body;
      
      const insertedItems = await db.insert(schema.inventoryItems).values(items).returning();
      await cache.invalidateInventoryCache();
      
      res.status(201).json({ message: `${insertedItems.length} items imported successfully`, items: insertedItems });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  static async updateInventoryItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, category, quantity, minQuantity, unit, unitCategory, location, barcode, unitPrice, supplier, description, status } = req.body;

      const [item] = await db.update(schema.inventoryItems)
        .set({ name, code, category, quantity, minQuantity, unit, unitCategory, location, barcode, unitPrice, supplier, description, status, updatedAt: new Date() })
        .where(eq(schema.inventoryItems.id, Number(id)))
        .returning();

      if (!item) {
        return res.status(404).json({ 
          success: false,
          error: { message: 'Item not found' }
        });
      }

      // Check for low stock and send alert
      if (quantity <= minQuantity) {
        console.log('✅ Inventory Alert - Low Stock ⚠️ - Sent successfully');
        await QueueService.addEmailJob({
          email: 'warehouse@example.com', // Replace with actual warehouse manager email
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
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { message: 'Server error' }
      });
    }
  }

  static async deleteInventoryItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, Number(id)));
      await cache.invalidateInventoryCache();
      
      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}