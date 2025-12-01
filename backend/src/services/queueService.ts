import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient, isRedisConnected } from '../config/redis';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { EmailService } from './emailService';

// Disable Redis queues for production to avoid connection issues
const isRedisAvailable = false;
let queueConfig: any = null;

if (process.env.NODE_ENV !== 'production' && process.env.REDIS_URL) {
  queueConfig = {
    connection: {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: 1,
      retryDelayOnFailover: 100,
    },
  };
}

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

// Queues disabled in production
export const emailQueue: any = null;
export const reportQueue: any = null;
export const inventoryQueue: any = null;
export const notificationQueue: any = null;

// Email worker
const emailWorker = new Worker('email', async (job: Job<EmailJobData>) => {
  const { email, title, name, message, template } = job.data;
  
  console.log(`Processing email job: ${job.id}`);
  console.log(`Sending email to: ${email}, Title: ${title}`);
  
  let success = false;
  
  try {
    // Use EmailJS service to send email
    success = await EmailService.sendEmail({
      email,
      title,
      name,
      message
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
  
  console.log(`Email ${success ? 'sent successfully' : 'failed'} to: ${email}`);
  return { success, sentAt: new Date() };
}, queueConfig);

// Report generation worker
const reportWorker = new Worker('reports', async (job: Job<ReportJobData>) => {
  const { userId, reportType, filters, format } = job.data;
  
  console.log(`Processing report job: ${job.id}`);
  console.log(`Generating ${reportType} report for user: ${userId}`);
  
  // Update job progress
  await job.updateProgress(10);
  
  // Simulate report generation
  await new Promise(resolve => setTimeout(resolve, 5000));
  await job.updateProgress(50);
  
  // Generate report based on type
  let reportData;
  switch (reportType) {
    case 'inventory':
      reportData = await generateInventoryReport(filters);
      break;
    case 'orders':
      reportData = await generateOrdersReport(filters);
      break;
    case 'performance':
      reportData = await generatePerformanceReport(filters);
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
  
  await job.updateProgress(80);
  
  // Convert to requested format
  const reportFile = await convertReportToFormat(reportData, format);
  await job.updateProgress(100);
  
  console.log(`Report generated successfully for user: ${userId}`);
  return { 
    success: true, 
    reportFile,
    generatedAt: new Date(),
    recordCount: reportData.length 
  };
}, queueConfig);

// Inventory update worker
const inventoryWorker = new Worker('inventory', async (job: Job<InventoryUpdateJobData>) => {
  const { itemId, quantity, operation } = job.data;
  
  console.log(`Processing inventory job: ${job.id}`);
  console.log(`${operation} ${quantity} for item: ${itemId}`);
  
  // Update inventory in database
  const [item] = await db.select()
    .from(schema.inventoryItems)
    .where(eq(schema.inventoryItems.id, itemId))
    .limit(1);
  
  if (!item) {
    throw new Error(`Item not found: ${itemId}`);
  }
  
  const newQuantity = operation === 'add' 
    ? item.quantity + quantity 
    : item.quantity - quantity;
  
  if (newQuantity < 0) {
    throw new Error(`Insufficient inventory for item: ${itemId}`);
  }
  
  await db.update(schema.inventoryItems)
    .set({ 
      quantity: newQuantity,
      lastUpdated: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.inventoryItems.id, itemId));
  
  // Check for low stock alert
  if (newQuantity <= item.minQuantity) {
    await notificationQueue.add('low-stock-alert', {
      userId: 1, // Admin user
      type: 'low_stock',
      message: `Low stock alert: ${item.name} (${newQuantity} remaining)`,
      data: { itemId, currentQuantity: newQuantity, minQuantity: item.minQuantity }
    });
  }
  
  console.log(`Inventory updated successfully for item: ${itemId}`);
  return { 
    success: true, 
    itemId,
    previousQuantity: item.quantity,
    newQuantity,
    updatedAt: new Date()
  };
}, queueConfig);

// Notification worker
const notificationWorker = new Worker('notifications', async (job: Job<NotificationJobData>) => {
  const { userId, type, message, data } = job.data;
  
  console.log(`Processing notification job: ${job.id}`);
  console.log(`Sending ${type} notification to user: ${userId}`);
  
  // Here you would integrate with your notification service
  // (WebSocket, Push notifications, SMS, etc.)
  
  // Simulate notification sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`Notification sent successfully to user: ${userId}`);
  return { 
    success: true, 
    userId,
    type,
    sentAt: new Date()
  };
}, queueConfig);

// Helper functions for report generation
async function generateInventoryReport(filters: any) {
  // Simulate complex inventory report generation
  const items = await db.select().from(schema.inventoryItems);
  return items.map(item => ({
    id: item.id,
    name: item.name,
    code: item.code,
    quantity: item.quantity,
    value: parseFloat(item.unitPrice) * item.quantity,
    status: item.status
  }));
}

async function generateOrdersReport(filters: any) {
  // Simulate complex orders report generation
  const orders = await db.select().from(schema.deliveryOrders);
  return orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    totalAmount: parseFloat(order.totalAmount),
    createdAt: order.createdAt
  }));
}

async function generatePerformanceReport(filters: any) {
  // Simulate complex performance report generation
  const drivers = await db.select().from(schema.drivers);
  return drivers.map(driver => ({
    id: driver.id,
    name: driver.name,
    rating: parseFloat(driver.rating || '0'),
    experience: driver.experience,
    status: driver.status
  }));
}

async function convertReportToFormat(data: any[], format: 'pdf' | 'excel') {
  // Simulate format conversion
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    filename: `report_${Date.now()}.${format}`,
    size: data.length * 100, // Simulate file size
    url: `/reports/download/report_${Date.now()}.${format}`
  };
}

// Queue service class
export class QueueService {
  static async addEmailJob(data: EmailJobData, options?: any) {
    // Process email immediately without queue in production
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
    return await reportQueue.add('generate-report', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options
    });
  }

  static async addInventoryUpdateJob(data: InventoryUpdateJobData, options?: any) {
    return await inventoryQueue.add('update-inventory', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      ...options
    });
  }

  static async addNotificationJob(data: NotificationJobData, options?: any) {
    return await notificationQueue.add('send-notification', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      ...options
    });
  }

  // Get queue statistics
  static async getQueueStats() {
    const [emailStats, reportStats, inventoryStats, notificationStats] = await Promise.all([
      emailQueue.getJobCounts(),
      reportQueue.getJobCounts(),
      inventoryQueue.getJobCounts(),
      notificationQueue.getJobCounts(),
    ]);

    return {
      email: emailStats,
      reports: reportStats,
      inventory: inventoryStats,
      notifications: notificationStats
    };
  }
}

console.log('⚠️  Running without Redis queues - processing jobs immediately');