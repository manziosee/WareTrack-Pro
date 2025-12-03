import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import type { SystemConfiguration } from '../services/notificationService';
import toast from 'react-hot-toast';

const SystemConfigurationComponent = () => {
  const [config, setConfig] = useState<SystemConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await notificationService.getSystemConfig();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load system config:', error);
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SystemConfiguration, value: string) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const saveConfig = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const updated = await notificationService.updateSystemConfig({
        language: config.language,
        timezone: config.timezone,
        dateFormat: config.dateFormat,
        currency: config.currency
      });
      setConfig(updated);
      toast.success('System configuration saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save system configuration');
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

  if (!config) {
    return (
      <div className="text-center py-8 text-gray-500">
        Failed to load system configuration
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Language</label>
          <select 
            value={config.language}
            onChange={(e) => handleChange('language', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
          <select 
            value={config.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="UTC">UTC</option>
            <option value="EST">Eastern Time</option>
            <option value="PST">Pacific Time</option>
            <option value="CAT">Central Africa Time</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
        <select 
          value={config.dateFormat}
          onChange={(e) => handleChange('dateFormat', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
        <select 
          value={config.currency}
          onChange={(e) => handleChange('currency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="RWF">RWF (Rwandan Franc)</option>
          <option value="USD">USD (US Dollar)</option>
          <option value="EUR">EUR (Euro)</option>
        </select>
      </div>
      <button 
        onClick={saveConfig}
        disabled={saving}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
};

export default SystemConfigurationComponent;