import { prisma } from '../lib/prisma';
import { QueueService } from '../services/queueService';

export class InventoryAlerts {
  static async checkLowStock() {
    try {
      const lowStockItems = await prisma.$queryRaw`
        SELECT * FROM inventory_items WHERE quantity < min_quantity
      `;

      if (Array.isArray(lowStockItems) && lowStockItems.length > 0) {
        const itemsList = (lowStockItems as any[]).map((item: any) => 
          `${item.name} (${item.code}): ${item.quantity}/${item.min_quantity}`
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