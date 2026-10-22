/** Weight, volume, VAT and serial-number settings shared by the add and edit item forms. */
export interface ItemExtras {
  weightKg: string;
  volumeL: string;
  vatExempt: boolean;
  trackSerials: boolean;
}

export const emptyExtras: ItemExtras = { weightKg: '', volumeL: '', vatExempt: false, trackSerials: false };

export const extrasFromItem = (item: any): ItemExtras => ({
  weightKg: item?.weightKg != null ? String(Number(item.weightKg)) : '',
  volumeL: item?.volumeL != null ? String(Number(item.volumeL)) : '',
  vatExempt: Boolean(item?.vatExempt),
  trackSerials: Boolean(item?.trackSerials),
});

/** What the API expects: empty sizes are sent as null. */
export const extrasPayload = (e: ItemExtras) => ({
  weightKg: e.weightKg === '' ? null : Number(e.weightKg),
  volumeL: e.volumeL === '' ? null : Number(e.volumeL),
  vatExempt: e.vatExempt,
  trackSerials: e.trackSerials,
});

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function ItemExtrasFields({ value, onChange, unit }: { value: ItemExtras; onChange: (v: ItemExtras) => void; unit?: string }) {
  const set = (patch: Partial<ItemExtras>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-700">Delivery and tax</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Weight per {unit || 'unit'} (kg)</span>
          <input type="number" min={0} step="any" value={value.weightKg} onChange={(e) => set({ weightKg: e.target.value })} className={input} placeholder="e.g. 0.55" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Volume per {unit || 'unit'} (litres)</span>
          <input type="number" min={0} step="any" value={value.volumeL} onChange={(e) => set({ volumeL: e.target.value })} className={input} placeholder="Optional" />
        </label>
      </div>
      <p className="text-xs text-gray-500">The trip planner uses these to check a vehicle is not overloaded.</p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={value.vatExempt} onChange={(e) => set({ vatExempt: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
        <span><span className="font-medium text-gray-800">VAT exempt</span><span className="block text-xs text-gray-500">Invoices show 0% VAT for this item.</span></span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={value.trackSerials} onChange={(e) => set({ trackSerials: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
        <span><span className="font-medium text-gray-800">Track serial numbers</span><span className="block text-xs text-gray-500">Each unit has its own serial. Packers scan the serial, so you know which unit went to which customer.</span></span>
      </label>
    </fieldset>
  );
}
