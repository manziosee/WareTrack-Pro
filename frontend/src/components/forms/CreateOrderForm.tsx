import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Plus, Trash2, Building2, AlertTriangle, ShieldCheck, Search } from 'lucide-react';
import Button from '../ui/Button';
import api from '@/services/api';
import { inventoryService } from '../../services/inventoryService';

interface CreateOrderFormProps {
  onClose: () => void;
  onSave?: (data: any) => void;
}

const PAYMENT_METHODS: [string, string][] = [
  ['CASH', 'Cash on delivery'],
  ['MTN_MOMO', 'MTN MoMo'],
  ['AIRTEL_MONEY', 'Airtel Money'],
  ['BANK_TRANSFER', 'Bank transfer'],
  ['CREDIT', 'On account (credit)'],
];

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const rwf = (v: number) => `RWF ${Math.round(Number(v) || 0).toLocaleString()}`;

/** `manual` lines keep the price typed by staff; others are priced by the server (price list, promotion, discount). */
interface Line { itemId: string; packagingId: string; quantity: number; price: number; manual?: boolean; listPrice?: number; note?: string }
const emptyLine = (): Line => ({ itemId: '', packagingId: '', quantity: 1, price: 0 });

/** New order: pick or type the customer, choose items (by piece or pack) and how they pay. */
const CreateOrderForm = ({ onClose, onSave }: CreateOrderFormProps) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [credit, setCredit] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '', deliveryAddress: '', priority: 'MEDIUM', scheduledDate: '',
    deliveryInstructions: '', orderType: 'Delivery', paymentMethod: 'CASH',
  });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const nameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inventoryService.getInventory().then((r: any) => setInventory(r?.data || [])).catch(() => undefined);
    api.get('/accounts').then((r) => setAccounts(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!nameRef.current?.contains(e.target as Node)) setShowSuggestions(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const itemFor = (line: Line) => inventory.find((i: any) => String(i.id) === line.itemId);
  const packFor = (line: Line) => itemFor(line)?.packagings?.find((p: any) => String(p.id) === line.packagingId);
  const unitsFor = (line: Line) => line.quantity * (packFor(line)?.unitsPerPack || 1);
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  // Stock needed per item across all lines (packs count as their units)
  const shortages = useMemo(() => {
    const need = new Map<string, number>();
    for (const l of lines) if (l.itemId) need.set(l.itemId, (need.get(l.itemId) || 0) + unitsFor(l));
    return [...need.entries()].filter(([id, n]) => n > (inventory.find((i: any) => String(i.id) === id)?.quantity ?? Infinity)).map(([id]) => id);
  }, [lines, inventory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Credit check for orders on account
  useEffect(() => {
    if (form.paymentMethod !== 'CREDIT' || !account?.id || !total) { setCredit(null); return; }
    const t = setTimeout(() => {
      api.get(`/accounts/${account.id}/credit-check`, { params: { amount: total } }).then((r) => setCredit(r.data?.data || null)).catch(() => setCredit(null));
    }, 400);
    return () => clearTimeout(t);
  }, [form.paymentMethod, account, total]);

  // Ask the server what this customer pays (price list, promotions, discount) for lines not priced by hand
  const pricingKey = JSON.stringify([account?.id ?? null, lines.map((l) => [l.itemId, l.packagingId, l.quantity, Boolean(l.manual)])]);
  useEffect(() => {
    const wanted = lines.map((l, index) => ({ l, index })).filter(({ l }) => l.itemId && !l.manual);
    if (!wanted.length) return;
    const t = setTimeout(() => {
      api.post('/pricing/quote', {
        accountId: account?.id,
        items: wanted.map(({ l }) => ({ itemId: Number(l.itemId), quantity: l.quantity, packagingId: l.packagingId ? Number(l.packagingId) : undefined })),
      }).then((r) => {
        const quoted: any[] = r.data?.data?.lines || [];
        setLines((list) => list.map((l, i) => {
          const at = wanted.findIndex((w) => w.index === i);
          const q = quoted[at];
          if (at < 0 || !q || l.manual || String(q.itemId) !== l.itemId) return l;
          const note = [q.appliedPriceList && 'customer price list', q.promotion && `promotion “${q.promotion}”`, q.customerDiscountPercent > 0 && `${q.customerDiscountPercent}% customer discount`].filter(Boolean).join(' · ');
          return { ...l, price: q.unitPrice, listPrice: q.listPrice, note };
        }));
      }).catch(() => undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [pricingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(() => {
    const q = form.customerName.trim().toLowerCase();
    if (!q) return accounts.slice(0, 8);
    return accounts.filter((a) => a.name.toLowerCase().includes(q) || (a.phone || '').includes(q) || a.accountNumber.toLowerCase().includes(q)).slice(0, 8);
  }, [accounts, form.customerName]);

  const pickAccount = (a: any) => {
    setAccount(a);
    setForm((f) => ({
      ...f, customerName: a.name, customerPhone: a.phone || f.customerPhone, customerEmail: a.email || f.customerEmail,
      deliveryAddress: a.address || f.deliveryAddress, paymentMethod: a.paymentTermsDays > 0 ? 'CREDIT' : f.paymentMethod,
    }));
    setShowSuggestions(false);
  };

  const updateLine = (index: number, patch: Partial<Line>) => {
    setLines((list) => list.map((l, i) => {
      if (i !== index) return l;
      const next = { ...l, ...patch };
      if ('itemId' in patch) { next.packagingId = ''; next.manual = false; next.note = undefined; }
      if ('itemId' in patch || 'packagingId' in patch) {
        const item = inventory.find((it: any) => String(it.id) === next.itemId);
        const pack = item?.packagings?.find((p: any) => String(p.id) === next.packagingId);
        next.price = pack ? Number(pack.price) || Number(item.unitPrice) * pack.unitsPerPack : Number(item?.unitPrice || 0);
      }
      return next;
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shortages.length) return;
    setSaving(true);
    await onSave?.({
      accountId: account?.id,
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone,
      contactNumber: form.customerPhone,
      deliveryAddress: form.deliveryAddress,
      priority: form.priority,
      orderType: form.orderType,
      paymentMethod: form.paymentMethod,
      scheduledDate: form.scheduledDate || undefined,
      deliveryInstructions: form.deliveryInstructions,
      items: lines.filter((l) => l.itemId).map((l) => ({ itemId: Number(l.itemId), quantity: l.quantity, unitPrice: l.manual ? l.price : undefined, packagingId: l.packagingId ? Number(l.packagingId) : undefined })),
    });
    setSaving(false);
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto pr-1">
      <form onSubmit={submit} className="space-y-6">
        <section>
          <h3 className="mb-3 text-base font-semibold text-gray-900">Customer</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative md:col-span-2" ref={nameRef}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Customer name</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={form.customerName}
                  onChange={(e) => { setForm({ ...form, customerName: e.target.value }); setAccount(null); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  className={`${input} pl-9`}
                  placeholder="Search an account or type a new customer"
                  required
                  autoComplete="off"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lift">
                  {suggestions.map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => pickAccount(a)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50">
                        <span className="flex min-w-0 items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-primary-500" /><span className="min-w-0"><span className="block truncate font-medium text-gray-900">{a.name}</span><span className="text-xs text-gray-500">{a.accountNumber}{a.phone ? ` · ${a.phone}` : ''}</span></span></span>
                        {a.balance > 0 && <span className={`shrink-0 text-xs font-semibold ${a.overdue ? 'text-error-600' : 'text-gray-500'}`}>owes {rwf(a.balance)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {account ? (
                <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                  <span className="font-medium text-primary-700">{account.accountNumber}</span>
                  <span>Owes {rwf(account.balance)}</span>
                  {account.overdue > 0 && <span className="font-semibold text-error-600">{rwf(account.overdue)} overdue</span>}
                  {account.creditLimit > 0 && <span>Credit left {rwf(account.available)}</span>}
                  {account.status !== 'ACTIVE' && <span className="font-semibold text-warning-700">{account.status === 'ON_HOLD' ? 'On hold' : 'Closed'}</span>}
                </p>
              ) : form.customerName.trim() && <p className="mt-1.5 text-xs text-gray-500">New customer: an account is created with this order.</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
              <input type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className={input} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className={input} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Delivery address</label>
              <textarea value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} rows={2} className={input} required />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-base font-semibold text-gray-900">Order</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Payment</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={input}>
                {PAYMENT_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={input}>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Type</label>
              <select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })} className={input}>
                <option value="Delivery">Delivery</option><option value="Pickup">Pickup</option><option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Delivery date</label>
              <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className={input} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Delivery instructions</label>
              <input value={form.deliveryInstructions} onChange={(e) => setForm({ ...form, deliveryInstructions: e.target.value })} className={input} placeholder="Optional, e.g. call on arrival" />
            </div>
          </div>
          {form.paymentMethod === 'CREDIT' && credit && (
            <p className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm ${credit.allowed ? 'bg-success-50 text-success-800' : 'bg-error-50 text-error-800'}`}>
              {credit.allowed ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              {credit.allowed ? `Within credit${credit.limit ? `: ${rwf(credit.available - total)} left after this order` : ' (no limit set)'}.` : `${credit.reason}. Only an admin can override this.`}
            </p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Items</h3>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLines([...lines, emptyLine()])}><Plus className="mr-1.5 h-4 w-4" /> Add item</Button>
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => {
              const item = itemFor(line);
              const packs = item?.packagings || [];
              const short = shortages.includes(line.itemId);
              return (
                <div key={index} className={`grid grid-cols-2 gap-3 rounded-xl border p-3 md:grid-cols-12 ${short ? 'border-error-200 bg-error-50/40' : 'border-gray-200'}`}>
                  <div className="col-span-2 md:col-span-4">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Item</label>
                    <select value={line.itemId} onChange={(e) => updateLine(index, { itemId: e.target.value })} className={input} required>
                      <option value="">Select item</option>
                      {inventory.filter((inv: any) => inv.status === 'ACTIVE' && inv.quantity > 0).map((inv: any) => (
                        <option key={inv.id} value={String(inv.id)}>{inv.name} · {inv.quantity} {inv.unit} in stock</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Sell by</label>
                    <select value={line.packagingId} onChange={(e) => updateLine(index, { packagingId: e.target.value })} className={input} disabled={!packs.length}>
                      <option value="">{item?.unit || 'Unit'}</option>
                      {packs.map((p: any) => <option key={p.id} value={String(p.id)}>{p.name} ({p.unitsPerPack})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Quantity</label>
                    <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className={input} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Price each</label>
                    <input type="number" min={0} step="any" value={line.price} onChange={(e) => updateLine(index, { price: Number(e.target.value) || 0, manual: true })} className={`${input} ${line.manual ? 'border-warning-300 bg-warning-50/40' : ''}`} />
                  </div>
                  <div className="flex items-end justify-between gap-2 md:col-span-2">
                    <span className="pb-2 text-sm font-semibold text-gray-900">{rwf(line.price * line.quantity)}</span>
                    <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))} className="mb-1 rounded-lg p-1.5 text-error-600 hover:bg-error-50" title="Remove"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {short && <p className="col-span-2 text-xs font-medium text-error-700 md:col-span-12">Not enough stock: {item?.quantity} {item?.unit} available{packFor(line) ? `, this needs ${unitsFor(line)}` : ''}.</p>}
                  {!short && packFor(line) && <p className="col-span-2 text-xs text-gray-500 md:col-span-12">= {unitsFor(line)} {item?.unit} from stock</p>}
                  {line.itemId && line.manual && <p className="col-span-2 text-xs text-warning-700 md:col-span-12">Price typed by hand. <button type="button" onClick={() => updateLine(index, { manual: false })} className="font-medium underline">Use the customer's price</button></p>}
                  {line.itemId && !line.manual && line.note && <p className="col-span-2 text-xs text-success-700 md:col-span-12">Normal price {rwf(line.listPrice || 0)} · {line.note}</p>}
                </div>
              );
            })}
            {!lines.length && <p className="py-4 text-center text-sm text-gray-500">No items yet. Add one to start.</p>}
          </div>
        </section>

        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
          <span className="text-base font-semibold text-gray-900">Total (tax included)</span>
          <span className="text-xl font-bold text-primary-600">{rwf(total)}</span>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving || shortages.length > 0 || !lines.some((l) => l.itemId)}><Save className="mr-2 h-4 w-4" /> Create order</Button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrderForm;
