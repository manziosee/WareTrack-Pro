import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export interface EmailNotification {
  type: 'welcome' | 'order_update' | 'low_stock' | 'delivery_assignment' | 'delivery_confirmation';
  recipient: string;
  data: any;
}

export class EmailService {
  // Test email functionality
  static async testEmail(type: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/test/email`, { type });
      return response.data;
    } catch (error) {
      console.error('Email test failed:', error);
      throw error;
    }
  }

  // Send notification (this would typically be handled by backend)
  static async sendNotification(notification: EmailNotification) {
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/send`, notification);
      return response.data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Get notification history
  static async getNotificationHistory() {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/history`);
      return response.data;
    } catch (error) {
      console.error('Failed to get notification history:', error);
      throw error;
    }
  }
}