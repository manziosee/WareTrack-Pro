import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Hash, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { DetailSection } from '@/components/ui/Detail';
import api from '@/services/api';

const STATUS_STYLE: Record<string, string> = {
  IN_STOCK: 'bg-success-50 text-success-700', RESERVED: 'bg-primary-50 text-primary-700', SOLD: 'bg-gray-100 text-gray-600',
  RETURNED: 'bg-warning-50 text-warning-700', DAMAGED: 'bg-error-50 text-error-700',
};

/** Serial numbers of one item: register new ones and see where each unit went. */
export default function SerialsPanel({ itemId, canEdit }: { itemId: number; canEdit: boolean }) {
  const { data, refetch } = useQuery({ queryKey: ['serials', itemId], queryFn: async () => (await api.get(`/inventory/${itemId}/serials`)).data as { data: any[]; counts: Record<string, number> } });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  const add = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/inventory/${itemId}/serials`, { serialNumbers: text });
      if (res.data?.success === false) throw new Error(res.data?.error?.message);
      const { added, duplicates } = res.data.data;
      toast.success(`${added} serial${added === 1 ? '' : 's'} added${duplicates?.length ? ` · ${duplicates.length} already known` : ''}`);
      setText('');
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e?.message || 'Could not add serials');
    } finally {
      setBusy(false);
    }
  };

  const serials = (data?.data || []).filter((s) => s.serialNumber.toLowerCase().includes(filter.toLowerCase()));
  return (
    <DetailSection title="Serial numbers" icon={<Hash className="h-4 w-4" />}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {Object.entries(data?.counts || {}).map(([status, n]) => <span key={status} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] || 'bg-gray-100'}`}>{n} {status.replace('_', ' ').toLowerCase()}</span>)}
        {!data?.data.length && <span className="text-sm text-gray-500">No serials registered yet.</span>}
      </div>
      {canEdit && (
        <div className="mb-3 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Scan or type serials, one per line" className="w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-sm" />
          <div className="flex justify-end"><Button size="sm" onClick={add} disabled={busy || !text.trim()}><Plus className="mr-1.5 h-4 w-4" /> Add serials</Button></div>
        </div>
      )}
      {(data?.data.length || 0) > 8 && <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a serial" className="mb-2 h-9 w-full rounded-xl border border-gray-200 px-3 text-sm" />}
      <ul className="max-h-60 divide-y divide-gray-50 overflow-y-auto text-sm">
        {serials.slice(0, 200).map((s) => (
          <li key={s.id} className="flex items-center justify-between py-1.5">
            <span className="font-mono">{s.serialNumber}</span>
            <span className="flex items-center gap-2">
              {s.orderId && <Link to={`/orders/${s.orderId}`} className="text-xs text-primary-700 hover:underline">order</Link>}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[s.status] || 'bg-gray-100'}`}>{s.status.replace('_', ' ')}</span>
            </span>
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}
