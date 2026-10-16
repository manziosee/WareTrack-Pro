import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DetailSection } from '@/components/ui/Detail';
import api from '@/services/api';

const rwf = (v: number) => `RWF ${Math.round(Number(v) || 0).toLocaleString()}`;
const field = 'h-9 w-full rounded-lg border border-gray-200 px-2.5 text-sm';

/** Pack sizes for an item (crate of 24, carton of 12…), shown in the item panel. */
export default function PackSizes({ item, canEdit, onChanged }: { item: any; canEdit: boolean; onChanged?: () => void }) {
  const { data: packs = [], refetch } = useQuery({
    queryKey: ['packagings', item.id],
    queryFn: async () => (await api.get(`/inventory/${item.id}/packagings`, { params: { t: Date.now() } })).data?.data || [],
  });
  const [form, setForm] = useState({ name: '', unitsPerPack: '', price: '', barcode: '' });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    const res = await api.post(`/inventory/${item.id}/packagings`, { ...form, unitsPerPack: Number(form.unitsPerPack), price: form.price === '' ? null : Number(form.price) });
    if (res.data?.success === false) return toast.error(res.data?.error?.message || 'Could not add');
    toast.success(`${form.name} added`);
    setForm({ name: '', unitsPerPack: '', price: '', barcode: '' });
    setAdding(false);
    refetch();
    onChanged?.();
  };
  const remove = async (id: number) => {
    const res = await api.delete(`/packagings/${id}`);
    if (res.data?.success === false) return toast.error(res.data?.error?.message || 'Could not delete');
    refetch();
    onChanged?.();
  };

  return (
    <DetailSection title="Pack sizes" icon={<Boxes className="h-4 w-4" />}>
      {packs.length ? (
        <ul className="divide-y divide-gray-100 text-sm">
          {packs.map((p: any) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="font-medium text-gray-900">{p.name}</span> <span className="text-gray-500">= {p.unitsPerPack} {item.unit}</span>
                <span className="block text-xs text-gray-500">{p.price ? rwf(p.price) : `${rwf(Number(item.unitPrice) * p.unitsPerPack)} (unit price × ${p.unitsPerPack})`}{p.barcode ? ` · ${p.barcode}` : ''}</span>
              </span>
              {canEdit && <button onClick={() => remove(p.id)} className="action-btn action-btn-delete" title="Remove"><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-gray-500">Sold by the {item.unit} only.</p>}
      {canEdit && (adding ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name, e.g. Crate" className={field} />
          <input type="number" min={2} value={form.unitsPerPack} onChange={(e) => setForm({ ...form, unitsPerPack: e.target.value })} placeholder={`${item.unit} per pack`} className={field} />
          <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Pack price (optional)" className={field} />
          <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Pack barcode (optional)" className={field} />
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600">Cancel</button>
            <button onClick={add} disabled={!form.name || !(Number(form.unitsPerPack) >= 2)} className="h-8 rounded-lg bg-primary-500 px-3 text-xs font-semibold text-white disabled:opacity-50">Add pack</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"><Plus className="h-3.5 w-3.5" /> Add pack size</button>
      ))}
    </DetailSection>
  );
}
