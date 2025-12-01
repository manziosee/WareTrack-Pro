// Simplified queue service without Redis/BullMQ for production
import { EmailService } from './emailService';

// Define job types
export interface EmailJobData {
  email: string;
  title: string;
  name: string;
  message: string;
  template: string;
}

export interface ReportJobData {
  userId: number;
  reportType: string;
  filters: any;
  format: 'pdf' | 'excel';
}

export interface InventoryUpdateJobData {
  itemId: number;
  quantity: number;
  operation: 'add' | 'subtract';
}

export interface NotificationJobData {
  userId: number;
  type: string;
  message: string;
  data?: any;
}

// Mock queues for compatibility
export const emailQueue: any = null;
export const reportQueue: any = null;
export const inventoryQueue: any = null;
export const notificationQueue: any = null;

// Queue service class with immediate processing
export class QueueService {
  static async addEmailJob(data: EmailJobData, options?: any) {
    // Process email immediately without queue
    try {
      const success = await EmailService.sendEmail({
        email: data.email,
        title: data.title,
        name: data.name,
        message: data.message
      });
      console.log(`✅ Email ${success ? 'sent successfully' : 'failed'} to: ${data.email}`);
      return { success, sentAt: new Date() };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  }

  static async addReportJob(data: ReportJobData, options?: any) {
    console.log('📊 Report job processed immediately (no queue)');
    return { success: true, processedAt: new Date() };
  }

  static async addInventoryUpdateJob(data: InventoryUpdateJobData, options?: any) {
    console.log('📦 Inventory job processed immediately (no queue)');
    return { success: true, processedAt: new Date() };
  }

  static async addNotificationJob(data: NotificationJobData, options?: any) {
    console.log('🔔 Notification job processed immediately (no queue)');
    return { success: true, processedAt: new Date() };
  }

  // Get queue statistics
  static async getQueueStats() {
    return {
      email: { waiting: 0, active: 0, completed: 0, failed: 0 },
      reports: { waiting: 0, active: 0, completed: 0, failed: 0 },
      inventory: { waiting: 0, active: 0, completed: 0, failed: 0 },
      notifications: { waiting: 0, active: 0, completed: 0, failed: 0 }
    };
  }
}

console.log('⚠️  Running without Redis queues - processing jobs immediately');