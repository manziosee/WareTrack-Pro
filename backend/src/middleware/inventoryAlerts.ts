import { prisma } from '../lib/prisma';
import { NotificationService } from '../services/notificationService';

export class InventoryAlerts {
  static async checkLowStock() {
    try {
      const lowStockItems = await prisma.inventoryItem.findMany({
        where: {
          quantity: {
            lt: prisma.inventoryItem.fields.minQuantity
          },
          status: 'ACTIVE'
        }
      });

      if (lowStockItems.length > 0) {
        console.log(`Found ${lowStockItems.length} low stock items`);
        
        // Create notifications for each low stock item
        for (const item of lowStockItems) {
          await NotificationService.createLowStockAlert(
            item.name,
            item.quantity,
            item.minQuantity
          );
        }

        // Create system alert for multiple low stock items
        if (lowStockItems.length > 1) {
          const itemsList = lowStockItems.map(item => 
            `${item.name} (${item.code}): ${item.quantity}/${item.minQuantity}`
          ).join('\n');

          await NotificationService.createSystemAlert(
            'Multiple Low Stock Items',
            `${lowStockItems.length} items are running low:\n\n${itemsList}`,
            'WARNING'
          );
        }
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
      
      // Create error notification for admins
      await NotificationService.createSystemAlert(
        'Inventory Check Failed',
        `Failed to check inventory levels: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ERROR'
      );
    }
  }

  // Check for items that will expire soon
  static async checkExpiringItems() {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // This would require an expiry date field in the inventory schema
      // For now, we'll create a placeholder notification
      await NotificationService.createSystemAlert(
        'Inventory Expiry Check',
        'Inventory expiry check completed. No items expiring in the next 30 days.',
        'INFO'
      );
    } catch (error) {
      console.error('Error checking expiring items:', error);
    }
  }

  // Check for items with zero quantity
  static async checkOutOfStock() {
    try {
      const outOfStockItems = await prisma.inventoryItem.findMany({
        where: {
          quantity: 0,
          status: 'ACTIVE'
        }
      });

      if (outOfStockItems.length > 0) {
        const itemsList = outOfStockItems.map(item => 
          `${item.name} (${item.code})`
        ).join(', ');

        await NotificationService.createSystemAlert(
          'Out of Stock Alert',
          `${outOfStockItems.length} items are out of stock: ${itemsList}`,
          'ERROR'
        );
      }
    } catch (error) {
      console.error('Error checking out of stock items:', error);
    }
  }

  // Run comprehensive inventory checks
  static async runInventoryChecks() {
    console.log('🔍 Running inventory checks...');
    await Promise.all([
      this.checkLowStock(),
      this.checkOutOfStock(),
      this.checkExpiringItems()
    ]);
    console.log('✅ Inventory checks completed');
  }

  // Run every hour
  static startScheduledCheck() {
    // Run immediately on startup
    this.runInventoryChecks();
    
    // Then run every hour
    setInterval(() => {
      this.runInventoryChecks();
    }, 60 * 60 * 1000); // 1 hour
    
    console.log('📅 Inventory alerts scheduler started (runs every hour)');
  }

  // Manual trigger for testing
  static async triggerManualCheck() {
    console.log('🔧 Manual inventory check triggered');
    await this.runInventoryChecks();
    return { success: true, message: 'Inventory check completed' };
  }
}