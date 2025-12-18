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

export const notificationService = {
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

  markAsRead: async (notificationId: string): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`);
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
  }
};