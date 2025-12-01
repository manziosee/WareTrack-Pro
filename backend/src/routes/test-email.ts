import { Router } from 'express';
import { QueueService } from '../services/queueService';

const router = Router();

// Test all email notifications
router.post('/email', async (req, res) => {
  try {
    const { type } = req.body;

    switch (type) {
      case 'welcome':
        console.log('✅ Welcome to WareTrack-Pro 🎉 - Sent successfully');
        await QueueService.addEmailJob({
          email: 'test@example.com',
          title: 'Welcome to WareTrack-Pro 🎉',
          name: 'Test User',
          message: 'Welcome to WareTrack-Pro! You have successfully logged in for the first time.',
          template: 'welcome'
        });
        break;

      case 'order_update':
        console.log('✅ Order ORD-000123 Status Update 📦 - Sent successfully');
        await QueueService.addEmailJob({
          email: 'test@example.com',
          title: 'Order ORD-000123 Status Update 📦',
          name: 'Test Customer',
          message: 'Your order ORD-000123 status has been updated to: dispatched',
          template: 'order_update'
        });
        break;

      case 'low_stock':
        console.log('✅ Inventory Alert - Low Stock ⚠️ - Sent successfully');
        await QueueService.addEmailJob({
          email: 'warehouse@example.com',
          title: 'Inventory Alert - Low Stock ⚠️',
          name: 'Warehouse Manager',
          message: 'Item "Laptop Dell XPS 15" (LAP001) is running low. Current stock: 2, Minimum required: 10',
          template: 'low_stock_alert'
        });
        break;

      case 'delivery_assignment':
        console.log('✅ New Delivery Assignment 🚛 - Sent successfully');
        await QueueService.addEmailJob({
          email: 'driver@example.com',
          title: 'New Delivery Assignment 🚛',
          name: 'Test Driver',
          message: 'You have been assigned a new delivery: Order ORD-000123 to TechCorp Inc. Scheduled for today at 2:00 PM',
          template: 'delivery_assignment'
        });
        break;

      case 'delivery_confirmation':
        console.log('✅ Order Delivered Successfully ✅ - Sent successfully');
        await QueueService.addEmailJob({
          email: 'customer@example.com',
          title: 'Order Delivered Successfully ✅',
          name: 'Test Customer',
          message: 'Your order ORD-000123 has been delivered successfully.',
          template: 'delivery_confirmation'
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid email type' }
        });
    }

    res.json({
      success: true,
      message: `${type} email sent successfully`
    });
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Email test failed' }
    });
  }
});

export default router;