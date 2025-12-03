import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import type { NotificationPreferences } from '../types';
import toast from 'react-hot-toast';

const NotificationPreferencesComponent = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await notificationService.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field: keyof NotificationPreferences) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      [field]: !preferences[field]
    });
  };

  const savePreferences = async () => {
    if (!preferences) return;
    
    setSaving(true);
    try {
      const updated = await notificationService.updatePreferences({
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        orderUpdates: preferences.orderUpdates,
        lowStockAlerts: preferences.lowStockAlerts
      });
      setPreferences(updated);
      toast.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-8 text-gray-500">
        Failed to load notification preferences
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Email Notifications</p>
          <p className="text-sm text-gray-600">Receive notifications via email</p>
        </div>
        <input 
          type="checkbox" 
          checked={preferences.emailEnabled}
          onChange={() => handleToggle('emailEnabled')}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">SMS Notifications</p>
          <p className="text-sm text-gray-600">Receive notifications via SMS</p>
        </div>
        <input 
          type="checkbox" 
          checked={preferences.smsEnabled}
          onChange={() => handleToggle('smsEnabled')}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Order Updates</p>
          <p className="text-sm text-gray-600">Get notified about order status changes</p>
        </div>
        <input 
          type="checkbox" 
          checked={preferences.orderUpdates}
          onChange={() => handleToggle('orderUpdates')}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Low Stock Alerts</p>
          <p className="text-sm text-gray-600">Receive alerts when inventory is low</p>
        </div>
        <input 
          type="checkbox" 
          checked={preferences.lowStockAlerts}
          onChange={() => handleToggle('lowStockAlerts')}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
        />
      </div>
      
      <button 
        onClick={savePreferences}
        disabled={saving}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
};

export default NotificationPreferencesComponent;