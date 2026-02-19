import api from './api';
import type { NotificationPreferences } from '@/types';

export interface SystemConfiguration {
  id: number;
  userId: number;
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSettings {
  id: number;
  userId: number;
  autoReportsEnabled: boolean;
  reportFrequency: string;
  reportFormat: string;
  emailReports: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  createdAt: string;
  timestamp?: string;
  timeAgo?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

export const notificationService = {
  // Get all notifications with pagination and filters
  getNotifications: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }): Promise<{ data: Notification[]; pagination: any }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');
    const response = await api.get(`/notifications?${searchParams.toString()}`);
    return response.data;
  },

  // Get notification statistics (total, unread count)
  getStats: async (): Promise<NotificationStats> => {
    const response = await api.get('/notifications/stats');
    return response.data.data;
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get('/notifications/preferences');
    return response.data.data;
  },

  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data.data;
  },

  getSystemConfig: async (): Promise<SystemConfiguration> => {
    const response = await api.get('/notifications/system-config');
    return response.data.data;
  },

  updateSystemConfig: async (config: Partial<SystemConfiguration>): Promise<SystemConfiguration> => {
    const response = await api.put('/notifications/system-config', config);
    return response.data.data;
  },

  getReportSettings: async (): Promise<ReportSettings> => {
    const response = await api.get('/notifications/report-settings');
    return response.data.data;
  },

  updateReportSettings: async (settings: Partial<ReportSettings>): Promise<ReportSettings> => {
    const response = await api.put('/notifications/report-settings', settings);
    return response.data.data;
  },

  markAsRead: async (notificationId: string | number): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/mark-all-read');
  },

  deleteNotification: async (notificationId: string | number): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
  }
};
