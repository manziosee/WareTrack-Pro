import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileCheck2, Fuel, Plus, Trash2, AlertTriangle, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { DetailSection } from '@/components/ui/Detail';
import api from '@/services/api';
import { formatDate } from '@/utils/formatters';

const DOC_TYPES: [string, string][] = [['INSURANCE', 'Insurance'], ['INSPECTION', 'Technical inspection'], ['REGISTRATION', 'Registration'], ['PERMIT', 'Permit'], ['OTHER', 'Other']];
const docName = (type: string) => DOC_TYPES.find(([t]) => t === type)?.[1] || type;
const field = 'h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-primary-300';

const dueText = (days: number) => (days < 0 ? `expired ${-days} day${days === -1 ? '' : 's'} ago` : days === 0 ? 'expires today' : `${days} day${days === 1 ? '' : 's'} left`);
const dueStyle = (days: number) => (days < 0 ? 'bg-error-50 text-error-700' : days <= 7 ? 'bg-warning-50 text-warning-700' : days <= 30 ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-600');
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const readFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

async function openStoredFile(ref: string) {
  const res = await api.get(`/files/${ref.slice(5)}`, { responseType: 'blob' });
  window.open(URL.createObjectURL(res.data), '_blank', 'noopener');
}

/** Insurance, inspection and other papers of one vehicle, with their expiry dates. */
export function VehicleDocuments({ vehicleId, canEdit }: { vehicleId: number; canEdit: boolean }) {
  const { data: docs = [], refetch } = useQuery({ queryKey: ['vehicle-docs', vehicleId], queryFn: async () => (await api.get(`/vehicles/${vehicleId}/documents`)).data.data as any[] });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: 'INSURANCE', number: '', provider: '', expiresAt: '', file: null as File | null });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.file && form.file.size > 3_000_000) return toast.error('The file must be under 3 MB');
    setBusy(true);
    try {
      const res = await api.post(`/vehicles/${vehicleId}/documents`, {
        type: form.type, number: form.number || undefined, provider: form.provider || undefined,
        expiresAt: new Date(`${form.expiresAt}T23:59:59+02:00`), file: form.file ? await readFile(form.file) : undefined,
      });
      if (res.data?.success === false) throw new Error(res.data?.error?.message);
      toast.success(`${docName(form.type)} saved`);
      setAdding(false);
      setForm({ type: 'INSURANCE', number: '', provider: '', expiresAt: '', file: null });
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (doc: any) => {
    if (!window.confirm(`Delete this ${docName(doc.type).toLowerCase()} record?`)) return;
    await api.delete(`/vehicles/${vehicleId}/documents/${doc.id}`);
    refetch();
  };

  return (
    <DetailSection title="Documents" icon={<FileCheck2 className="h-4 w-4" />}>
      {docs.length ? (
        <ul className="divide-y divide-gray-50 text-sm">
          {docs.map((d) => {
            const days = daysUntil(d.expiresAt);
            return (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium text-gray-900">{docName(d.type)}</span>
                  <span className="block text-xs text-gray-500">{[d.provider, d.number].filter(Boolean).join(' · ') || '—'} · until {formatDate(d.expiresAt)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueStyle(days)}`}>{dueText(days)}</span>
                  {d.fileRef && <button onClick={() => openStoredFile(d.fileRef)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-700" title="Open the scan"><Paperclip className="h-3.5 w-3.5" /></button>}
                  {canEdit && <button onClick={() => remove(d)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-error-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}
                </span>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-gray-500">No documents yet. Add insurance and inspection dates to get reminders before they expire.</p>}
      {canEdit && <div className="mt-2 flex justify-end"><Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Add document</Button></div>}
      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Add vehicle document" icon={<FileCheck2 className="h-5 w-5" />} size="sm">
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Type</span>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={field}>{DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Expires on *</span><input required type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className={field} /></label>
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Provider</span><input value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} className={field} placeholder="e.g. SORAS, Radiant" /></label>
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Number</span><input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} className={field} placeholder="Policy or certificate number" /></label>
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Scan (photo or PDF)</span><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} className="block w-full text-sm" /></label>
          <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></div>
        </form>
      </Modal>
    </DetailSection>
  );
}

/** Expiring papers and fuel use across the fleet, shown above the vehicle list. */
export function FleetCareOverview({ onOpenVehicle }: { onOpenVehicle: (id: number) => void }) {
  const { data: expiring = [] } = useQuery({ queryKey: ['expiring-documents'], queryFn: async () => (await api.get('/fleet/expiring-documents')).data.data as any[] });
  const { data: fuel = [] } = useQuery({ queryKey: ['fuel-efficiency'], queryFn: async () => (await api.get('/fleet/fuel-efficiency')).data.data as any[] });
  const measured = fuel.filter((f) => f.kmPerLiter !== null);
  if (!expiring.length && !measured.length) return null;

  return (
    <div className="mb-5 grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><AlertTriangle className="h-4 w-4 text-warning-600" /> Papers expiring in 30 days</h2>
        {expiring.length ? (
          <ul className="divide-y divide-gray-50 text-sm">
            {expiring.slice(0, 8).map((d) => (
              <li key={`${d.kind}-${d.id}`} className="flex items-center justify-between gap-2 py-1.5">
                {d.kind === 'vehicle'
                  ? <button onClick={() => onOpenVehicle(d.vehicleId)} className="text-left font-medium text-primary-700 hover:underline">{d.name}</button>
                  : <Link to="/drivers" className="font-medium text-primary-700 hover:underline">{d.name}</Link>}
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueStyle(d.daysLeft)}`}>{dueText(d.daysLeft)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500">Nothing expires in the next 30 days.</p>}
      </section>
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Fuel className="h-4 w-4 text-primary-600" /> Fuel use</h2>
        {measured.length ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500"><tr><th className="pb-1 text-left font-medium">Vehicle</th><th className="pb-1 text-right font-medium">km</th><th className="pb-1 text-right font-medium">km / L</th><th className="pb-1 text-right font-medium">RWF / km</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {measured.slice(0, 8).map((f) => (
                <tr key={f.vehicleId}>
                  <td className="py-1.5"><button onClick={() => onOpenVehicle(f.vehicleId)} className="font-medium text-primary-700 hover:underline">{f.plateNumber}</button></td>
                  <td className="py-1.5 text-right text-gray-600">{f.km.toLocaleString()}</td>
                  <td className="py-1.5 text-right font-semibold">{f.kmPerLiter}</td>
                  <td className="py-1.5 text-right text-gray-600">{f.costPerKm?.toLocaleString() ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-gray-500">Record fuel with odometer readings on the Expenses page to see km per litre.</p>}
        <p className="mt-2 text-xs text-gray-500">Lowest km per litre first: those vehicles may need a check.</p>
      </section>
    </div>
  );
}
