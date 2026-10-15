import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Webhook, Plus, Trash2, Send, Copy, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import api from '@/services/api';

/** Admin: send business events (order created, delivered, paid…) to other systems. */
export default function WebhookSettings() {
  const queryClient = useQueryClient();
  const { data: hooks = [] } = useQuery({ queryKey: ['webhooks'], queryFn: async () => (await api.get('/webhooks', { params: { t: Date.now() } })).data?.data || [] });
  const { data: events = [] } = useQuery({ queryKey: ['webhook-events'], queryFn: async () => (await api.get('/webhooks/events')).data?.data || [] });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ url: string; description: string; events: string[] }>({ url: '', description: '', events: ['order.created', 'delivery.completed'] });
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['webhooks'] });

  const create = async () => {
    const res = await api.post('/webhooks', form);
    if (res.data?.success) {
      setNewSecret(res.data.data.secret);
      setAdding(false);
      setForm({ url: '', description: '', events: ['order.created', 'delivery.completed'] });
      refresh();
    } else toast.error(res.data?.error?.message || 'Could not add the webhook');
  };

  const test = async (id: number) => {
    const res = await api.post(`/webhooks/${id}/test`, {});
    if (res.data?.data?.ok) toast.success(`Test delivered (HTTP ${res.data.data.status})`);
    else toast.error(`Test failed${res.data?.data?.status ? ` (HTTP ${res.data.data.status})` : ': no response'}`);
    refresh();
  };

  const remove = async (id: number) => {
    await api.delete(`/webhooks/${id}`);
    refresh();
  };

  const toggle = async (h: any) => {
    await api.put(`/webhooks/${h.id}`, { active: !h.active });
    refresh();
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        WareTrack sends a signed <code className="rounded bg-gray-100 px-1">POST</code> request to your URL when these events happen.
        Check the <code className="rounded bg-gray-100 px-1">X-WareTrack-Signature</code> header (HMAC-SHA256 of the body with your secret).
      </p>

      {newSecret && (
        <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm">
          <p className="font-semibold text-warning-800">Copy your signing secret now. It won't be shown again.</p>
          <button onClick={() => { navigator.clipboard?.writeText(newSecret); toast.success('Secret copied'); }} className="mt-2 inline-flex max-w-full items-center gap-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs">{newSecret} <Copy className="h-3.5 w-3.5 shrink-0" /></button>
          <button onClick={() => setNewSecret(null)} className="ml-3 text-xs font-semibold text-warning-800 hover:underline">Done</button>
        </div>
      )}

      <ul className="space-y-2">
        {hooks.map((h: any) => (
          <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 p-4">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${h.active ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'}`}><Webhook className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm text-gray-900">{h.url}</p>
              <p className="text-xs text-gray-500">{h.events.join(', ')}</p>
              {h.lastDeliveredAt && (
                <p className={`mt-0.5 flex items-center gap-1 text-xs ${h.lastStatus >= 200 && h.lastStatus < 300 ? 'text-success-600' : 'text-error-600'}`}>
                  {h.lastStatus >= 200 && h.lastStatus < 300 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  Last delivery {new Date(h.lastDeliveredAt).toLocaleString('en-GB')} · HTTP {h.lastStatus || 'no response'}
                </p>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-600"><input type="checkbox" checked={h.active} onChange={() => toggle(h)} className="rounded text-primary-500" /> Active</label>
            <button onClick={() => test(h.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><Send className="h-3.5 w-3.5" /> Test</button>
            <button onClick={() => remove(h.id)} className="action-btn action-btn-delete"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {!hooks.length && !adding && <li className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">No webhooks yet.</li>}
      </ul>

      {adding ? (
        <div className="space-y-3 rounded-2xl border border-gray-100 p-4">
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/webhooks/waretrack" className="h-10 w-full rounded-xl border border-gray-200 px-3 font-mono text-sm" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" />
          <div className="flex flex-wrap gap-2">
            {events.map((e: string) => (
              <label key={e} className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs ${form.events.includes(e) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>
                <input type="checkbox" className="hidden" checked={form.events.includes(e)} onChange={() => setForm({ ...form, events: form.events.includes(e) ? form.events.filter((x) => x !== e) : [...form.events, e] })} />
                {e}
              </label>
            ))}
          </div>
          <div className="flex gap-2"><Button size="sm" onClick={create}>Add webhook</Button><Button size="sm" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button></div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Add webhook</Button>
      )}
    </div>
  );
}
