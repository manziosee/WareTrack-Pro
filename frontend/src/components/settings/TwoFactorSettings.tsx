import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { ShieldCheck, ShieldOff, Smartphone, KeyRound, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import api from '@/services/api';

/** Turn on sign-in with an authenticator app (Google Authenticator, Authy, 1Password). */
export default function TwoFactorSettings() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['2fa'], queryFn: async () => (await api.get('/auth/2fa', { params: { t: Date.now() } })).data?.data });
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const enabled = Boolean(data?.enabled);

  const begin = async () => {
    const res = await api.post('/auth/2fa/setup', {});
    if (!res.data?.success) return toast.error(res.data?.error?.message || 'Could not start setup');
    const qr = await QRCode.toDataURL(res.data.data.otpauthUrl, { margin: 1, width: 220 });
    setSetup({ secret: res.data.data.secret, qr });
  };

  const enable = async () => {
    setBusy(true);
    const res = await api.post('/auth/2fa/enable', { code });
    setBusy(false);
    if (res.data?.success) {
      toast.success('Two-factor sign-in is on');
      setSetup(null);
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['2fa'] });
    } else toast.error(res.data?.error?.message || 'That code did not work');
  };

  const disable = async () => {
    setBusy(true);
    const res = await api.post('/auth/2fa/disable', { password });
    setBusy(false);
    if (res.data?.success) {
      toast.success('Two-factor sign-in is off. You will get codes by email again.');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['2fa'] });
    } else toast.error(res.data?.error?.message || 'Could not turn it off');
  };

  return (
    <div className="space-y-5">
      <div className={`flex items-start gap-3 rounded-2xl p-4 ${enabled ? 'bg-success-50' : 'bg-gray-50'}`}>
        {enabled ? <ShieldCheck className="mt-0.5 h-5 w-5 text-success-600" /> : <Smartphone className="mt-0.5 h-5 w-5 text-gray-500" />}
        <div>
          <p className="font-semibold text-gray-900">{enabled ? 'Authenticator app is on' : 'Use an authenticator app'}</p>
          <p className="text-sm text-gray-600">
            {enabled
              ? 'When you sign in, enter the 6-digit code from your app instead of waiting for an email.'
              : 'Get sign-in codes from an app on your phone. It is faster than email and works without internet.'}
          </p>
        </div>
      </div>

      {!enabled && !setup && <Button onClick={begin}><KeyRound className="mr-1.5 h-4 w-4" /> Set up authenticator app</Button>}

      {!enabled && setup && (
        <div className="grid grid-cols-1 gap-5 rounded-2xl border border-gray-100 p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
          <img src={setup.qr} alt="Scan this QR code with your authenticator app" className="h-44 w-44 rounded-xl border border-gray-100" />
          <div className="space-y-3 text-sm">
            <p><b>1.</b> Open Google Authenticator, Authy or 1Password and scan the code.</p>
            <p className="text-gray-500">Can't scan? Enter this key:</p>
            <button onClick={() => { navigator.clipboard?.writeText(setup.secret); toast.success('Key copied'); }} className="inline-flex max-w-full items-center gap-2 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 hover:bg-gray-100">
              {setup.secret} <Copy className="h-3.5 w-3.5 shrink-0" />
            </button>
            <p><b>2.</b> Enter the 6-digit code the app shows:</p>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="123456" className="h-10 w-32 rounded-xl border border-gray-200 px-3 text-center text-lg tracking-widest" />
              <Button disabled={code.length !== 6 || busy} onClick={enable}>Turn on</Button>
            </div>
          </div>
        </div>
      )}

      {enabled && (
        <div className="space-y-2 rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-700">Turn off (confirm with your password)</p>
          <div className="flex flex-wrap gap-2">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-10 w-60 rounded-xl border border-gray-200 px-3 text-sm" />
            <Button variant="secondary" disabled={!password || busy} onClick={disable}><ShieldOff className="mr-1.5 h-4 w-4" /> Turn off</Button>
          </div>
        </div>
      )}
    </div>
  );
}
