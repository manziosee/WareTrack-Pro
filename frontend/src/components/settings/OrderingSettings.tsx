import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, KeyRound, Copy, Trash2, Plus, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import { formatDateTime } from '@/utils/formatters';

const field = 'h-10 w-full rounded-xl border border-gray-200 px-3 text-sm';
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** Online order page for customers, and API keys for other systems to send orders. */
export default function OrderingSettings() {
  const [form, setForm] = useState<any>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: async () => (await api.get('/api-keys')).data?.data || [] });

  useEffect(() => { api.get('/settings/online-ordering').then((r) => setForm(r.data?.data)); }, []);
  const orderUrl = `${window.location.origin}/order`;

  const save = async (patch: any) => {
    const next = { ...form, ...patch };
    setForm(next);
    const res = await api.put('/settings/online-ordering', next);
    if (res.data?.success === false) toast.error(res.data?.error?.message || 'Could not save');
    else toast.success('Saved');
  };
  const createKey = async () => {
    const res = await api.post('/api-keys', { name: keyName || 'Online shop' });
    if (res.data?.success === false) return toast.error(res.data?.error?.message || 'Could not create');
    setNewKey(res.data.data.key);
    setKeyName('');
    keys.refetch();
  };
  const revoke = async (id: number) => {
    if (!window.confirm('Revoke this key? Systems using it will stop working.')) return;
    await api.delete(`/api-keys/${id}`);
    keys.refetch();
  };
  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success('Copied'));

  if (!form) return <p className="text-sm text-gray-500">Loading…</p>;
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-gray-900"><Globe className="h-4 w-4 text-primary-600" /> Online order page</h3>
        <p className="mb-3 text-sm text-gray-500">Customers pick products, enter their address and order. New orders appear in Orders and staff get a notification.</p>
        <label className="mb-4 flex items-center gap-3 text-sm font-medium text-gray-800">
          <input type="checkbox" checked={form.enabled} onChange={(e) => save({ enabled: e.target.checked })} className="h-5 w-5 rounded" />
          Accept orders online
        </label>
        {form.enabled && (
          <p className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-success-50 p-3 text-sm text-success-800">
            Share this link: <a href={orderUrl} target="_blank" rel="noreferrer" className="font-mono font-semibold underline">{orderUrl}</a>
            <button onClick={() => copy(orderUrl)} className="inline-flex items-center gap-1 text-xs font-semibold"><Copy className="h-3.5 w-3.5" /> Copy</button>
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Business name</span><input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} onBlur={() => save({})} className={field} /></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Phone for questions</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} onBlur={() => save({})} className={field} /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-gray-700">Welcome message</span><input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} onBlur={() => save({})} className={field} /></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Minimum order (RWF)</span><input type="number" min={0} value={form.minimumOrder} onChange={(e) => setForm({ ...form, minimumOrder: e.target.value })} onBlur={() => save({ minimumOrder: Number(form.minimumOrder) || 0 })} className={field} /></label>
        </div>
      </section>

      <section>
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-gray-900"><KeyRound className="h-4 w-4 text-primary-600" /> API keys</h3>
        <p className="mb-3 text-sm text-gray-500">Let a client's online shop or system send orders straight into WareTrack.</p>
        {newKey && (
          <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm">
            <p className="mb-1 font-semibold text-warning-900">Copy this key now. It won't be shown again.</p>
            <div className="flex items-center gap-2"><code className="flex-1 break-all rounded-lg bg-white px-2 py-1.5 font-mono text-xs">{newKey}</code><Button size="sm" variant="secondary" onClick={() => copy(newKey)}><Copy className="mr-1 h-3.5 w-3.5" /> Copy</Button></div>
          </div>
        )}
        <div className="mb-3 flex gap-2"><input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Name, e.g. Ineza online shop" className={field} /><Button size="sm" className="shrink-0 whitespace-nowrap" onClick={createKey}><Plus className="mr-1 h-4 w-4" /> New key</Button></div>
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 text-sm">
          {(keys.data || []).map((k: any) => (
            <li key={k.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span><span className="font-medium text-gray-900">{k.name}</span> <code className="text-xs text-gray-500">{k.prefix}…</code><span className="block text-xs text-gray-500">{k.revokedAt ? `Revoked ${formatDateTime(k.revokedAt)}` : k.lastUsedAt ? `Last used ${formatDateTime(k.lastUsedAt)}` : 'Never used'}</span></span>
              {!k.revokedAt && <button onClick={() => revoke(k.id)} className="action-btn action-btn-delete" title="Revoke"><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
          {!keys.data?.length && <li className="px-3 py-3 text-gray-500">No keys yet.</li>}
        </ul>
        <details className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
          <summary className="cursor-pointer font-semibold">How to send an order</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">{`POST ${API_BASE}/intake/orders
X-API-Key: <your key>
Content-Type: application/json

{
  "customerName": "Ineza Clinic",
  "contactNumber": "+250788000000",
  "deliveryAddress": "KG 493 St, Kigali",
  "reference": "WEB-1001",
  "paymentMethod": "CASH",
  "items": [{ "code": "FB-WATER24", "quantity": 2 }]
}

GET ${API_BASE}/intake/catalog  → products, prices and pack sizes`}</pre>
          <a href={`${API_BASE.replace(/\/api$/, '')}/api-docs`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-primary-700">Full API docs <ExternalLink className="h-3 w-3" /></a>
        </details>
      </section>
    </div>
  );
}
