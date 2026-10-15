import { useQuery } from '@tanstack/react-query';
import { Mail, MessageSquare, Smartphone, Wallet, Activity, CheckCircle2, CircleDashed } from 'lucide-react';
import api from '@/services/api';

const ITEMS = [
  { key: 'email', icon: Mail, title: 'Email', setup: 'Set RESEND_API_KEY (or BREVO_API_KEY) and EMAIL_FROM on the server. EmailJS is used until then.' },
  { key: 'sms', icon: MessageSquare, title: 'SMS', setup: "Create an Africa's Talking account, then set AT_USERNAME, AT_API_KEY and AT_SENDER_ID." },
  { key: 'whatsapp', icon: MessageSquare, title: 'WhatsApp', setup: 'In Meta for Developers, add WhatsApp Cloud API and set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.' },
  { key: 'mtnMomo', icon: Smartphone, title: 'MTN Mobile Money', setup: 'Register on momodeveloper.mtn.com and set MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY and MOMO_TARGET_ENV.' },
  { key: 'airtelMoney', icon: Wallet, title: 'Airtel Money', setup: 'Register on developers.airtel.africa and set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET.' },
  { key: 'monitoring', icon: Activity, title: 'Error monitoring', setup: 'Create a Sentry project and set SENTRY_DSN (server) and VITE_SENTRY_DSN (website).' },
];

/** Which outside services are switched on, and how to switch on the rest. */
export default function IntegrationSettings() {
  const { data } = useQuery({ queryKey: ['integrations'], queryFn: async () => (await api.get('/integrations', { params: { t: Date.now() } })).data?.data || {} });

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Add keys in the Render dashboard (Environment), then redeploy. Each service switches on by itself.</p>
      {ITEMS.map(({ key, icon: Icon, title, setup }) => {
        const on = data?.[key]?.configured;
        return (
          <div key={key} className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-400'}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-gray-900">
                {title}
                {on ? <span className="inline-flex items-center gap-1 text-xs font-medium text-success-600"><CheckCircle2 className="h-3.5 w-3.5" /> Connected{data?.[key]?.provider && key === 'email' ? ` (${data[key].provider})` : ''}</span> : <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400"><CircleDashed className="h-3.5 w-3.5" /> Not set up</span>}
              </p>
              {!on && <p className="mt-0.5 text-xs text-gray-500">{setup}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
