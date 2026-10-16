import { useEffect, useState } from 'react';
import { BellRing, BellOff, Smartphone, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import { disablePush, enablePush, pushState, type PushState } from '@/utils/push';

/** Turn phone/browser notifications on or off for this device. */
export default function PushSettings({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')); }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === 'on') { await disablePush(); setState('off'); toast.success('Notifications turned off on this device'); }
      else { await enablePush(); setState('on'); toast.success('Notifications are on for this device'); }
    } catch (error: any) {
      toast.error(error.message, { duration: 7000 });
      setState(await pushState().catch(() => 'unsupported' as PushState));
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    const res = await api.post('/push/test');
    if (res.data?.success === false) toast.error(res.data?.error?.message || 'Could not send');
    else toast.success('Test sent. It should appear in a few seconds.');
  };

  if (state === null || (compact && (state === 'on' || state === 'unsupported'))) return null;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${state === 'on' ? 'border-success-100 bg-success-50' : 'border-primary-100 bg-primary-50'} ${compact ? 'mb-4' : 'mb-6'}`}>
      <span className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
        <span>
          <span className="block text-sm font-semibold text-gray-900">Phone notifications</span>
          <span className="text-xs text-gray-600">
            {state === 'on' ? 'On for this device: new deliveries, messages and alerts reach you even when the app is closed.'
              : state === 'blocked' ? 'Blocked in your browser settings. Allow notifications for this site, then try again.'
              : state === 'unsupported' ? 'Not supported here. On iPhone, add WareTrack to the Home Screen (Share → Add to Home Screen) and open it from there.'
              : 'Get new deliveries, messages and alerts even when the app is closed.'}
          </span>
        </span>
      </span>
      {state !== 'unsupported' && state !== 'blocked' && (
        <span className="flex gap-2">
          {state === 'on' && !compact && <Button size="sm" variant="secondary" onClick={test}><Send className="mr-1.5 h-4 w-4" /> Test</Button>}
          <Button size="sm" variant={state === 'on' ? 'secondary' : 'primary'} onClick={toggle} disabled={busy}>
            {state === 'on' ? <><BellOff className="mr-1.5 h-4 w-4" /> Turn off</> : <><BellRing className="mr-1.5 h-4 w-4" /> Turn on</>}
          </Button>
        </span>
      )}
    </div>
  );
}
