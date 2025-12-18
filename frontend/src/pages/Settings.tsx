import { useState } from 'react';
import { User, Bell, Shield, Database, Download, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/ui/Modal';
import ExportReportForm from '@/components/forms/ExportReportForm';
import UserProfile from '@/components/profile/UserProfile';
import NotificationPreferencesComponent from '@/components/NotificationPreferences';
import SecuritySettings from '@/components/SecuritySettings';
import SystemConfigurationComponent from '@/components/SystemConfiguration';
import ReportSettingsComponent from '@/components/ReportSettings';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showExportModal, setShowExportModal] = useState(false);

  // Role-based tabs configuration
  const getTabsForRole = (role: string) => {
    const baseTabs = [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    switch (role) {
      case 'ADMIN':
        return [
          ...baseTabs,
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'system', label: 'System', icon: Database },
          { id: 'reports', label: 'Reports', icon: Download },
        ];
      case 'DISPATCH_OFFICER':
        return [
          ...baseTabs,
          { id: 'reports', label: 'Reports', icon: Download },
        ];
      case 'WAREHOUSE_STAFF':
        return [
          ...baseTabs,
        ];
      case 'DRIVER':
        return [
          { id: 'profile', label: 'Profile', icon: User },
        ];
      default:
        return baseTabs;
    }
  };

  const tabs = getTabsForRole(user?.role || 'WAREHOUSE_STAFF');

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        {(user?.role === 'ADMIN' || user?.role === 'DISPATCH_OFFICER') && (
          <button 
            onClick={() => setShowExportModal(true)} 
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <Calendar className="w-4 h-4" />
            Export Report
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <UserProfile />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
              <NotificationPreferencesComponent />
            </div>
          )}

          {activeTab === 'security' && user?.role === 'ADMIN' && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Security Settings</h2>
              <SecuritySettings />
            </div>
          )}

          {activeTab === 'system' && user?.role === 'ADMIN' && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">System Configuration</h2>
              <SystemConfigurationComponent />
            </div>
          )}

          {activeTab === 'reports' && (user?.role === 'ADMIN' || user?.role === 'DISPATCH_OFFICER') && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Report Settings</h2>
              <ReportSettingsComponent onExportClick={() => setShowExportModal(true)} />
            </div>
          )}
        </div>
      </div>

      {(user?.role === 'ADMIN' || user?.role === 'DISPATCH_OFFICER') && (
        <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Export Report">
          <ExportReportForm onClose={() => setShowExportModal(false)} />
        </Modal>
      )}
    </div>
  );
};

export default Settings;