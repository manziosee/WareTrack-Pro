import { QueueService } from '../services/queueService';

export class EmailTriggers {
  // Welcome email for first-time login
  static async sendWelcomeEmail(email: string, firstName: string) {
    await QueueService.addEmailJob({
      email,
      title: 'Welcome to WareTrack-Pro 🎉',
      name: firstName,
      message: 'Welcome to WareTrack-Pro! You have successfully logged in for the first time.',
      template: 'welcome'
    });
  }

  // Order status update email
  static async sendOrderUpdateEmail(email: string, customerName: string, orderNumber: string, status: string) {
    await QueueService.addEmailJob({
      email,
      title: `Order ${orderNumber} Status Update 📦`,
      name: customerName,
      message: `Your order ${orderNumber} status has been updated to: ${status}`,
      template: 'order_update'
    });
  }

  // Low stock alert email
  static async sendLowStockAlert(email: string, itemName: string, itemCode: string, currentStock: number, minStock: number) {
    await QueueService.addEmailJob({
      email,
      title: 'Inventory Alert - Low Stock ⚠️',
      name: 'Warehouse Manager',
      message: `Item "${itemName}" (${itemCode}) is running low. Current stock: ${currentStock}, Minimum required: ${minStock}`,
      template: 'low_stock_alert'
    });
  }

  // Delivery assignment email
  static async sendDeliveryAssignment(email: string, driverName: string, orderNumber: string, customerName: string, scheduledDate: Date) {
    await QueueService.addEmailJob({
      email,
      title: 'New Delivery Assignment 🚛',
      name: driverName,
      message: `You have been assigned a new delivery: Order ${orderNumber} to ${customerName}. Scheduled for ${scheduledDate.toLocaleString()}`,
      template: 'delivery_assignment'
    });
  }

  // Delivery confirmation email
  static async sendDeliveryConfirmation(email: string, customerName: string, orderNumber: string) {
    await QueueService.addEmailJob({
      email,
      title: 'Order Delivered Successfully ✅',
      name: customerName,
      message: `Your order ${orderNumber} has been delivered successfully.`,
      template: 'delivery_confirmation'
    });
  }
}