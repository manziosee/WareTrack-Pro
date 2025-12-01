import { db, schema } from '../db';
import { lt } from 'drizzle-orm';
import { QueueService } from '../services/queueService';

export class InventoryAlerts {
  static async checkLowStock() {
    try {
      const lowStockItems = await db.select()
        .from(schema.inventoryItems)
        .where(lt(schema.inventoryItems.quantity, schema.inventoryItems.minQuantity));

      if (lowStockItems.length > 0) {
        const itemsList = lowStockItems.map(item => 
          `${item.name} (${item.code}): ${item.quantity}/${item.minQuantity}`
        ).join('\n');

        await QueueService.addEmailJob({
          email: 'warehouse@example.com',
          title: 'Inventory Alert - Low Stock ⚠️',
          name: 'Warehouse Manager',
          message: `The following items are running low:\n\n${itemsList}`,
          template: 'low_stock_alert'
        });
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  }

  // Run every hour
  static startScheduledCheck() {
    setInterval(() => {
      this.checkLowStock();
    }, 60 * 60 * 1000); // 1 hour
  }
}