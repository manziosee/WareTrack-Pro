import { useState } from 'react';
import { Camera, Fuel, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import api from '@/services/api';
import { compressImage } from '@/utils/image';

export const EXPENSE_TYPES: [string, string][] = [
  ['FUEL', 'Fuel'], ['TOLL', 'Toll'], ['PARKING', 'Parking'], ['REPAIR', 'Repair'], ['MAINTENANCE', 'Maintenance'], ['OTHER', 'Other'],
];

const field = 'h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100';

interface ExpenseFormProps {
  /** Staff pick the vehicle and driver; drivers' own vehicle is used. */
  vehicles?: { id: number; plateNumber: string }[];
  drivers?: { id: number; name: string }[];
  onSaved: () => void;
}

/** Add a fuel, toll, repair… expense with a receipt photo. */
export default function ExpenseForm({ vehicles, drivers, onSaved }: ExpenseFormProps) {
  const [form, setForm] = useState({ type: 'FUEL', amount: '', liters: '', odometer: '', vehicleId: '', driverId: '', description: '', spentAt: new Date().toISOString().slice(0, 10) });
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await api.post('/expenses', {
      ...form,
      amount: Number(form.amount),
      liters: form.liters ? Number(form.liters) : undefined,
      odometer: form.odometer ? Number(form.odometer) : undefined,
      vehicleId: form.vehicleId ? Number(form.vehicleId) : undefined,
      driverId: form.driverId ? Number(form.driverId) : undefined,
      receiptPhoto: receipt || undefined,
      spentAt: form.spentAt ? new Date(`${form.spentAt}T12:00:00`).toISOString() : undefined,
    }).catch(() => null);
    setBusy(false);
    if (!res?.data?.success) return toast.error(res?.data?.error?.message || 'Could not save the expense');
    toast.success(res.data.data.status === 'PENDING' ? 'Expense sent for approval' : 'Expense saved');
    onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {EXPENSE_TYPES.map(([v, l]) => (
          <button key={v} type="button" onClick={() => set('type', v)} className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${form.type === v ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Amount (RWF) *</span><input type="number" min={1} required value={form.amount} onChange={(e) => set('amount', e.target.value)} className={`${field} text-base font-semibold`} inputMode="numeric" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Date</span><input type="date" value={form.spentAt} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('spentAt', e.target.value)} className={field} /></label>
        {form.type === 'FUEL' && (
          <>
            <label className="text-sm"><span className="mb-1 flex items-center gap-1 font-medium text-gray-700"><Fuel className="h-3.5 w-3.5" /> Liters</span><input type="number" min={0} step="0.1" value={form.liters} onChange={(e) => set('liters', e.target.value)} className={field} inputMode="decimal" /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Odometer (km)</span><input type="number" min={0} value={form.odometer} onChange={(e) => set('odometer', e.target.value)} className={field} inputMode="numeric" /></label>
          </>
        )}
        {vehicles && (
          <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Vehicle</span>
            <select value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)} className={field}><option value="">None</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}</select>
          </label>
        )}
        {drivers && (
          <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Driver</span>
            <select value={form.driverId} onChange={(e) => set('driverId', e.target.value)} className={field}><option value="">None</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          </label>
        )}
        <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-gray-700">What for</span><input value={form.description} onChange={(e) => set('description', e.target.value)} className={field} placeholder="e.g. Full tank at SP Remera" /></label>
      </div>
      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">Receipt photo</span>
        {receipt ? (
          <div className="relative"><img src={receipt} alt="Receipt" className="h-40 w-full rounded-xl object-cover" /><button type="button" onClick={() => setReceipt(null)} className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-gray-700">Remove</button></div>
        ) : (
          <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600">
            <Camera className="h-5 w-5" /> Take or choose a photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setReceipt(await compressImage(f)); }} />
          </label>
        )}
      </div>
      <div className="flex justify-end"><Button type="submit" disabled={busy || !(Number(form.amount) > 0)}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save expense</Button></div>
    </form>
  );
}
