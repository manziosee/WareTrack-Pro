import { emailTemplates } from '../config/emailTemplates';
import axios from 'axios';

interface EmailData {
  email: string;
  title: string;
  name: string;
  message: string;
  time?: string;
}

export class EmailService {
  private static serviceId = process.env.EMAILJS_SERVICE_ID;
  private static templateId = process.env.EMAILJS_TEMPLATE_ID;
  private static publicKey = process.env.EMAILJS_PUBLIC_KEY;
  private static privateKey = process.env.EMAILJS_PRIVATE_KEY;

  static async sendEmail(data: EmailData): Promise<boolean> {
    try {
      const emailData = {
        service_id: this.serviceId,
        template_id: this.templateId,
        user_id: this.publicKey,
        accessToken: this.privateKey,
        template_params: {
          email: data.email,
          title: data.title,
          name: data.name,
          message: data.message,
          time: data.time || new Date().toLocaleString()
        }
      };

      const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', emailData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      email: userEmail,
      title: emailTemplates.welcome.title,
      name: userName,
      message: emailTemplates.welcome.getMessage(userName)
    });
  }

  static async sendOrderNotification(userEmail: string, userName: string, orderNumber: string, status: string): Promise<boolean> {
    return this.sendEmail({
      email: userEmail,
      title: emailTemplates.orderUpdate.title(orderNumber),
      name: userName,
      message: emailTemplates.orderUpdate.getMessage(orderNumber, status, userName)
    });
  }

  static async sendLowStockAlert(adminEmail: string, itemName: string, currentStock: number, minStock: number = 10): Promise<boolean> {
    return this.sendEmail({
      email: adminEmail,
      title: emailTemplates.lowStock.title,
      name: 'Inventory System',
      message: emailTemplates.lowStock.getMessage(itemName, currentStock, minStock)
    });
  }

  static async sendDispatchNotification(driverEmail: string, driverName: string, orderNumber: string, customerName: string, address: string): Promise<boolean> {
    return this.sendEmail({
      email: driverEmail,
      title: emailTemplates.dispatch.title,
      name: driverName,
      message: emailTemplates.dispatch.getMessage(driverName, orderNumber, customerName, address)
    });
  }

  static async sendDeliveryConfirmation(customerEmail: string, customerName: string, orderNumber: string, deliveryTime: string = new Date().toLocaleTimeString()): Promise<boolean> {
    return this.sendEmail({
      email: customerEmail,
      title: emailTemplates.delivery.title,
      name: customerName,
      message: emailTemplates.delivery.getMessage(customerName, orderNumber, deliveryTime)
    });
  }
}