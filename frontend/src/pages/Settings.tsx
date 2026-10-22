import { useState } from 'react';
import { User, Bell, Shield, Database, Download, Languages, KeyRound, Webhook, Plug, Check, Globe, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { LANGUAGES } from '@/i18n/translations';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import ExportReportForm from '@/components/forms/ExportReportForm';
import UserProfile from '@/components/profile/UserProfile';
import NotificationPreferencesComponent from '@/components/NotificationPreferences';
import SecuritySettings from '@/components/SecuritySettings';
import SystemConfigurationComponent from '@/components/SystemConfiguration';
import ReportSettingsComponent from '@/components/ReportSettings';
import TwoFactorSettings from '@/components/settings/TwoFactorSettings';
import TrustedDevices from '@/components/settings/TrustedDevices';
import WebhookSettings from '@/components/settings/WebhookSettings';
import IntegrationSettings from '@/components/settings/IntegrationSettings';
import PushSettings from '@/components/settings/PushSettings';
import OrderingSettings from '@/components/settings/OrderingSettings';
import PermissionMatrix from '@/components/settings/PermissionMatrix';
import CompanyBranches from '@/components/settings/CompanyBranches';

type Tab = { id: string; label: string; icon: typeof User; roles?: string[] };

const TABS: Tab[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'signin', label: 'Sign-in security', icon: KeyRound },
  { id: 'language', label: 'Language', icon: Languages },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reports', label: 'Reports', icon: Download, roles: ['ADMIN', 'DISPATCH_OFFICER'] },
  { id: 'security', label: 'Security policy', icon: Shield, roles: ['ADMIN'] },
  { id: 'system', label: 'System', icon: Database, roles: ['ADMIN'] },
  { id: 'integrations', label: 'Integrations', icon: Plug, roles: ['ADMIN'] },
  { id: 'ordering', label: 'Online ordering & API', icon: Globe, roles: ['ADMIN'] },
  { id: 'permissions', label: 'Roles & permissions', icon: Shield, roles: ['ADMIN'] },
  { id: 'company', label: 'Company & branches', icon: Globe, roles: ['ADMIN'] },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook, roles: ['ADMIN'] },
];

const TITLES: Record<string, [string, string]> = {
  profile: ['Profile', 'Your name, contact details and password'],
  signin: ['Sign-in security', 'How you prove it is you when signing in'],
  language: ['Language', 'Choose the language for menus and labels'],
  notifications: ['Notifications', 'What you hear about, and how'],
  reports: ['Report settings', 'Automatic report preferences'],
  security: ['Security policy', 'Organisation-wide security options'],
  system: ['System', 'Time zone, currency and formats'],
  integrations: ['Integrations', 'Email, SMS, WhatsApp, Mobile Money and monitoring'],
  webhooks: ['Webhooks', 'Send events to other systems'],
  ordering: ['Online ordering & API', 'An order page for customers, and keys for other systems'],
  permissions: ['Roles & permissions', 'Set role access by action and branch'],
  company: ['Company & branches', 'Manage company membership and branch access'],
};

export default function Settings() {
  const { user } = useAuth();
  const { language, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState('profile');
  const [showExportModal, setShowExportModal] = useState(false);
  const tabs = TABS.filter((t) => !t.roles || t.roles.includes(user?.role || ''));
  const [title, subtitle] = TITLES[activeTab];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your account and, for admins, the whole system" icon={<SettingsIcon className="h-5 w-5" />} />

      <div className="flex flex-col gap-5 lg:flex-row">
        <nav className="flex gap-1 overflow-x-auto lg:w-60 lg:shrink-0 lg:flex-col">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-accent-50 text-accent-700 shadow-[inset_3px_0_0_0] shadow-accent-500' : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="min-w-0 flex-1 rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>

          {activeTab === 'profile' && <UserProfile />}
          {activeTab === 'signin' && <><TwoFactorSettings /><TrustedDevices /></>}
          {activeTab === 'language' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {LANGUAGES.map((l) => (
                <button key={l.code} onClick={() => setLanguage(l.code)} className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${language === l.code ? 'border-primary-300 bg-primary-50 ring-2 ring-primary-100' : 'border-gray-200 hover:border-primary-200'}`}>
                  <span><span className="block text-xs font-bold text-gray-400">{l.short}</span><span className="font-semibold text-gray-900">{l.label}</span></span>
                  {language === l.code && <Check className="h-5 w-5 text-primary-500" />}
                </button>
              ))}
            </div>
          )}
          {activeTab === 'notifications' && <><PushSettings /><NotificationPreferencesComponent /></>}
          {activeTab === 'reports' && <ReportSettingsComponent onExportClick={() => setShowExportModal(true)} />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'system' && <SystemConfigurationComponent />}
          {activeTab === 'integrations' && <IntegrationSettings />}
          {activeTab === 'webhooks' && <WebhookSettings />}
          {activeTab === 'ordering' && <OrderingSettings />}
          {activeTab === 'permissions' && <PermissionMatrix />}
          {activeTab === 'company' && <CompanyBranches />}
        </section>
      </div>

      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Export Report">
        <ExportReportForm onClose={() => setShowExportModal(false)} />
      </Modal>
    </div>
  );
}
