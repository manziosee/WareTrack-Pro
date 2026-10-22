import { useQuery } from '@tanstack/react-query';
import { Laptop, LogOut, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import api from '@/services/api';
import { formatDateTime } from '@/utils/formatters';

const describe = (agent?: string | null) => {
  if (!agent) return 'Unknown browser';
  const browser = /Edg\//.test(agent) ? 'Edge' : /Chrome\//.test(agent) ? 'Chrome' : /Firefox\//.test(agent) ? 'Firefox' : /Safari\//.test(agent) ? 'Safari' : 'Browser';
  const os = /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iPhone/iPad' : /Windows/.test(agent) ? 'Windows' : /Mac OS/.test(agent) ? 'Mac' : /Linux/.test(agent) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
};

/** Browsers that skip the emailed sign-in code, with a way to forget them. */
export default function TrustedDevices() {
  const { data = [], refetch } = useQuery({ queryKey: ['trusted-devices'], queryFn: async () => (await api.get('/auth/trusted-devices', { params: { t: Date.now() } })).data?.data || [] });
  const forget = async (id?: number) => {
    const res = await api.delete(id ? `/auth/trusted-devices/${id}` : '/auth/trusted-devices');
    if (res.data?.success === false) return toast.error(res.data?.error?.message || 'Could not update');
    toast.success(id ? 'Device forgotten' : 'All devices forgotten: the next sign-in everywhere needs a code');
    refetch();
  };
  return (
    <section className="mt-8 border-t border-gray-100 pt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">Trusted devices</h3>
          <p className="text-sm text-gray-500">These browsers skip the emailed code for 30 days. Changing your password forgets all of them.</p>
        </div>
        {data.length > 0 && <Button size="sm" variant="secondary" onClick={() => forget()}><LogOut className="mr-1.5 h-4 w-4" /> Forget all</Button>}
      </div>
      {data.length ? (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {data.map((d: any) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2.5"><Laptop className="h-4 w-4 text-gray-400" /><span><span className="font-medium text-gray-900">{describe(d.label)}</span><span className="block text-xs text-gray-500">Last used {formatDateTime(d.lastUsedAt)} · until {formatDateTime(d.expiresAt)}</span></span></span>
              <button onClick={() => forget(d.id)} className="action-btn action-btn-delete" title="Forget"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-gray-500">No trusted devices. Tick “Trust this device” when you enter a sign-in code.</p>}
    </section>
  );
}
