import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import api from '@/services/api';

/** Suggested minimum stock per item from 60 days of demand and the supplier's lead time. */
export default function ReorderPoints() {
  const { data, refetch } = useQuery({ queryKey: ['reorder-points'], queryFn: async () => (await api.get('/reorder-points')).data as { data: any[]; safetyDays: number } });
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const rows = (data?.data || []).filter((r) => r.change !== 0 && r.dailyDemand > 0);
  if (!data) return null;

  const apply = async (ids: number[]) => {
    setBusy(true);
    try {
      const res = await api.post('/reorder-points', { itemIds: ids });
      if (res.data?.success === false) throw new Error(res.data?.error?.message);
      toast.success(`Minimum stock updated for ${res.data.data.updated} item${res.data.data.updated === 1 ? '' : 's'}`);
      setPicked([]);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e?.message || 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900"><SlidersHorizontal className="h-4 w-4 text-primary-600" /> Minimum stock levels</h2>
          <p className="mt-1 text-xs text-gray-600">Suggested minimum = daily demand × (supplier lead time + {data.safetyDays} safety days). Set lead times on each supplier under Purchasing.</p>
        </div>
        {rows.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={busy || !picked.length} onClick={() => apply(picked)}>Update selected ({picked.length})</Button>
            <Button size="sm" disabled={busy} onClick={() => apply(rows.map((r) => r.id))}><Check className="mr-1.5 h-4 w-4" /> Update all {rows.length}</Button>
          </div>
        )}
      </div>
      {rows.length ? (
        <div className="max-h-80 overflow-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Per day</th>
                <th className="px-3 py-2 text-right font-medium">Lead time</th>
                <th className="px-3 py-2 text-right font-medium">Now</th>
                <th className="px-3 py-2 text-right font-medium">Suggested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className={r.atRisk ? 'bg-error-50/40' : ''}>
                  <td className="px-3 py-1.5"><input type="checkbox" checked={picked.includes(r.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, r.id] : p.filter((x) => x !== r.id)))} className="h-4 w-4 rounded border-gray-300" /></td>
                  <td className="px-3 py-1.5"><span className="font-medium text-gray-900">{r.name}</span>{r.atRisk && <span className="ml-2 text-xs font-semibold text-error-700">runs out before a delivery could arrive</span>}</td>
                  <td className="px-3 py-1.5 text-right">{r.dailyDemand}</td>
                  <td className="px-3 py-1.5 text-right">{r.leadTimeDays} d</td>
                  <td className="px-3 py-1.5 text-right text-gray-500">{r.minQuantity}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${r.change > 0 ? 'text-warning-700' : 'text-success-700'}`}>{r.suggestedMinimum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm text-gray-500">Every minimum already matches demand.</p>}
    </section>
  );
}
