import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import type { ReportSettings } from '../services/notificationService';
import toast from 'react-hot-toast';

interface ReportSettingsProps {
  onExportClick: () => void;
}

const ReportSettingsComponent = ({ onExportClick }: ReportSettingsProps) => {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await notificationService.getReportSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load report settings:', error);
      toast.error('Failed to load report settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field: keyof ReportSettings) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: !settings[field]
    });
  };

  const handleChange = (field: keyof ReportSettings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const updated = await notificationService.updateReportSettings({
        autoReportsEnabled: settings.autoReportsEnabled,
        reportFrequency: settings.reportFrequency,
        reportFormat: settings.reportFormat,
        emailReports: settings.emailReports
      });
      setSettings(updated);
      toast.success('Report settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save report settings');
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

  if (!settings) {
    return (
      <div className="text-center py-8 text-gray-500">
        Failed to load report settings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 mb-4">Configure automatic report generation and export settings.</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Automatic Reports</p>
              <p className="text-sm text-gray-600">Generate reports automatically based on schedule</p>
            </div>
            <input 
              type="checkbox" 
              checked={settings.autoReportsEnabled}
              onChange={() => handleToggle('autoReportsEnabled')}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
            />
          </div>

          {settings.autoReportsEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Frequency</label>
                <select 
                  value={settings.reportFrequency}
                  onChange={(e) => handleChange('reportFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Format</label>
                <select 
                  value={settings.reportFormat}
                  onChange={(e) => handleChange('reportFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Reports</p>
                  <p className="text-sm text-gray-600">Send reports via email automatically</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.emailReports}
                  onChange={() => handleToggle('emailReports')}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
                />
              </div>
            </>
          )}

          <button 
            onClick={saveSettings}
            disabled={saving}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="border-t pt-6">
        <button 
          onClick={onExportClick}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Export Custom Report
        </button>
      </div>
    </div>
  );
};

export default ReportSettingsComponent;