import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import type { NotificationPreferences } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const NotificationPreferencesComponent = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Role-based notification options
  const getNotificationOptionsForRole = (role: string) => {
    const baseOptions = [
      {
        key: 'emailEnabled' as keyof NotificationPreferences,
        title: 'Email Notifications',
        description: 'Receive notifications via email'
      },
      {
        key: 'smsEnabled' as keyof NotificationPreferences,
        title: 'SMS Notifications', 
        description: 'Receive notifications via SMS'
      }
    ];

    const roleSpecificOptions = {
      ADMIN: [
        {
          key: 'orderUpdates' as keyof NotificationPreferences,
          title: 'Order Updates',
          description: 'Get notified about order status changes'
        },
        {
          key: 'lowStockAlerts' as keyof NotificationPreferences,
          title: 'Low Stock Alerts',
          description: 'Receive alerts when inventory is low'
        }
      ],
      WAREHOUSE_STAFF: [
        {
          key: 'orderUpdates' as keyof NotificationPreferences,
          title: 'Order Updates',
          description: 'Get notified about new orders and updates'
        },
        {
          key: 'lowStockAlerts' as keyof NotificationPreferences,
          title: 'Low Stock Alerts',
          description: 'Receive alerts when inventory is low'
        }
      ],
      DISPATCH_OFFICER: [
        {
          key: 'orderUpdates' as keyof NotificationPreferences,
          title: 'Order Updates',
          description: 'Get notified about dispatch and delivery updates'
        }
      ],
      DRIVER: [
        {
          key: 'orderUpdates' as keyof NotificationPreferences,
          title: 'Delivery Updates',
          description: 'Get notified about assigned deliveries'
        }
      ]
    };

    return [...baseOptions, ...(roleSpecificOptions[role as keyof typeof roleSpecificOptions] || [])];
  };

  const notificationOptions = getNotificationOptionsForRole(user?.role || 'WAREHOUSE_STAFF');

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
      {notificationOptions.map((option) => (
        <div key={option.key} className="flex items-center justify-between">
          <div>
            <p className="font-medium">{option.title}</p>
            <p className="text-sm text-gray-600">{option.description}</p>
          </div>
          <input 
            type="checkbox" 
            checked={preferences[option.key] as boolean}
            onChange={() => handleToggle(option.key)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
          />
        </div>
      ))}
      
      <div className="pt-4 border-t">
        <button 
          onClick={savePreferences}
          disabled={saving}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferencesComponent;