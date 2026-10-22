import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Percent, Trash2, Search, Save, Users, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/formatters';

const rwf = (v: number) => `RWF ${(Math.round(Number(v) * 100) / 100).toLocaleString()}`;
const field = 'h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100';
const STATE_STYLE: Record<string, string> = { RUNNING: 'bg-success-50 text-success-700', UPCOMING: 'bg-primary-50 text-primary-700', ENDED: 'bg-gray-100 text-gray-500', OFF: 'bg-gray-100 text-gray-500' };

async function call(method: 'get' | 'post' | 'put' | 'delete', url: string, body?: unknown) {
  const res = method === 'get' || method === 'delete' ? await api[method](url) : await api[method](url, body);
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Something went wrong');
  return res.data;
}
const fail = (e: any) => toast.error(e?.response?.data?.error?.message || e?.message || 'Something went wrong', { duration: 6000 });

interface Item { id: number; name: string; code: string; unit: string; unitPrice: string | number; category: string }

function useItems() {
  return useQuery({ queryKey: ['pricing-items'], queryFn: async () => (await call('get', '/inventory?limit=500&status=ACTIVE')).data as Item[], staleTime: 60_000 });
}

/** Prices for every item on one list; blank means the normal price is used. */
function PriceListEditor({ listId, isAdmin, onChanged }: { listId: number; isAdmin: boolean; onChanged: () => void }) {
  const { data: list, refetch } = useQuery({ queryKey: ['price-list', listId], queryFn: async () => (await call('get', `/price-lists/${listId}`)).data });
  const { data: items = [] } = useItems();
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (list) setPrices(Object.fromEntries(list.items.map((i: any) => [i.itemId, String(Number(i.price))])));
  }, [list]);
  if (!list) return <p className="text-sm text-gray-500">Loading…</p>;

  const original: Record<number, string> = Object.fromEntries(list.items.map((i: any) => [i.itemId, String(Number(i.price))]));
  const changed = items.filter((i) => (prices[i.id] || '') !== (original[i.id] || ''));
  const shown = items.filter((i) => `${i.name} ${i.code} ${i.category}`.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    setBusy(true);
    try {
      const res = await call('put', `/price-lists/${listId}/items`, { items: changed.map((i) => ({ itemId: i.id, price: prices[i.id] ? Number(prices[i.id]) : null })) });
      toast.success(`Saved ${res.data.saved} price${res.data.saved === 1 ? '' : 's'}${res.data.removed ? `, removed ${res.data.removed}` : ''}`);
      await refetch();
      onChanged();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {list.accounts.length ? <>Used by <span className="font-medium">{list.accounts.map((a: any) => a.name).join(', ')}</span>.</> : 'No customer uses this list yet. Choose it on a customer account.'}
        {' '}Leave a price empty to charge the normal price.
      </p>
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items" className={`${field} pl-9`} />
      </label>
      <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
            <tr><th className="px-3 py-2 text-left font-medium">Item</th><th className="px-3 py-2 text-right font-medium">Normal</th><th className="w-40 px-3 py-2 text-right font-medium">This list</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shown.map((i) => {
              const price = prices[i.id] || '';
              const off = price ? Math.round((1 - Number(price) / Number(i.unitPrice)) * 100) : 0;
              return (
                <tr key={i.id}>
                  <td className="px-3 py-1.5"><span className="font-medium text-gray-900">{i.name}</span><span className="block text-xs text-gray-500">{i.code} · per {i.unit}</span></td>
                  <td className="px-3 py-1.5 text-right text-gray-500">{rwf(Number(i.unitPrice))}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input type="number" min={0} step="any" disabled={!isAdmin} value={price} onChange={(e) => setPrices((p) => ({ ...p, [i.id]: e.target.value }))} className="h-9 w-28 rounded-lg border border-gray-200 px-2 text-right text-sm" placeholder="—" />
                    {price && off !== 0 && <span className={`block text-[11px] ${off > 0 ? 'text-success-700' : 'text-warning-700'}`}>{off > 0 ? `${off}% off` : `${-off}% more`}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isAdmin && (
        <div className="flex items-center justify-end gap-3">
          {changed.length > 0 && <span className="text-xs text-gray-500">{changed.length} change{changed.length === 1 ? '' : 's'}</span>}
          <Button onClick={save} disabled={busy || !changed.length}><Save className="mr-1.5 h-4 w-4" /> {busy ? 'Saving…' : 'Save prices'}</Button>
        </div>
      )}
    </div>
  );
}

function PromotionForm({ promotion, onSaved }: { promotion?: any; onSaved: () => void }) {
  const { data: items = [] } = useItems();
  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: promotion?.name || '', type: promotion?.type || 'PERCENT', value: promotion ? String(Number(promotion.value)) : '',
    target: promotion?.itemId ? `item:${promotion.itemId}` : promotion?.category ? `category:${promotion.category}` : '',
    minQuantity: String(promotion?.minQuantity ?? 1),
    startsAt: day(promotion ? new Date(promotion.startsAt) : new Date()), endsAt: day(promotion ? new Date(promotion.endsAt) : new Date(Date.now() + 7 * 86400000)),
    active: promotion?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [kind, value] = form.target.split(/:(.*)/);
    setBusy(true);
    try {
      const body = {
        name: form.name, type: form.type, value: Number(form.value), minQuantity: Number(form.minQuantity) || 1, active: form.active,
        itemId: kind === 'item' ? Number(value) : null, category: kind === 'category' ? value : null,
        // The whole of the last day counts (Kigali time)
        startsAt: new Date(`${form.startsAt}T00:00:00+02:00`), endsAt: new Date(`${form.endsAt}T23:59:59+02:00`),
      };
      await call(promotion ? 'put' : 'post', promotion ? `/promotions/${promotion.id}` : '/promotions', body);
      toast.success(promotion ? 'Promotion updated' : 'Promotion created');
      onSaved();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Name *</span><input required value={form.name} onChange={(e) => set('name', e.target.value)} className={field} placeholder="e.g. Water week" /></label>
      <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Applies to *</span>
        <select required value={form.target} onChange={(e) => set('target', e.target.value)} className={field}>
          <option value="">Choose an item or a category…</option>
          <optgroup label="Whole category">{categories.map((c) => <option key={c} value={`category:${c}`}>{c}</option>)}</optgroup>
          <optgroup label="One item">{items.map((i) => <option key={i.id} value={`item:${i.id}`}>{i.name} ({i.code})</option>)}</optgroup>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Discount type</span>
          <select value={form.type} onChange={(e) => set('type', e.target.value)} className={field}><option value="PERCENT">Percent off</option><option value="AMOUNT">RWF off each unit</option></select>
        </label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">{form.type === 'PERCENT' ? 'Percent *' : 'RWF per unit *'}</span><input required type="number" min={0.01} max={form.type === 'PERCENT' ? 100 : undefined} step="any" value={form.value} onChange={(e) => set('value', e.target.value)} className={field} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Starts</span><input type="date" required value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={field} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Ends</span><input type="date" required min={form.startsAt} value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={field} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Minimum units</span><input type="number" min={1} value={form.minQuantity} onChange={(e) => set('minQuantity', e.target.value)} className={field} /></label>
        <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Switched on</label>
      </div>
      <p className="text-xs text-gray-500">When several promotions match an order line, the biggest discount wins. Customer discounts are applied after it.</p>
      <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : promotion ? 'Save changes' : 'Create promotion'}</Button></div>
    </form>
  );
}

/** Try prices for a customer before taking the order. */
function QuoteTool() {
  const { data: items = [] } = useItems();
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts-lite'], queryFn: async () => (await call('get', '/accounts')).data as any[] });
  const [accountId, setAccountId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [result, setResult] = useState<any>(null);
  const quote = async () => {
    try {
      setResult((await call('post', '/pricing/quote', { accountId: accountId ? Number(accountId) : undefined, items: [{ itemId: Number(itemId), quantity: Number(quantity) || 1 }] })).data.lines[0] || null);
    } catch (e) {
      fail(e);
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px_auto]">
        <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setResult(null); }} className={field}>
          <option value="">Walk-in customer</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={itemId} onChange={(e) => { setItemId(e.target.value); setResult(null); }} className={field}>
          <option value="">Choose an item…</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <input type="number" min={1} value={quantity} onChange={(e) => { setQuantity(e.target.value); setResult(null); }} className={field} />
        <Button onClick={quote} disabled={!itemId}>Price it</Button>
      </div>
      {result && (
        <div className="rounded-xl bg-gray-50 p-3 text-sm">
          <p className="text-lg font-bold text-gray-900">{rwf(result.unitPrice)} <span className="text-sm font-normal text-gray-500">each · {rwf(result.total)} total</span></p>
          <p className="text-gray-600">
            Normal price {rwf(result.listPrice)}
            {result.appliedPriceList && ' · price list applied'}
            {result.promotion && ` · promotion “${result.promotion}”`}
            {result.customerDiscountPercent > 0 && ` · ${result.customerDiscountPercent}% customer discount`}
            {` · VAT ${Math.round(result.vatRate * 100)}%`}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Pricing() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState<'lists' | 'promotions' | 'quote'>('lists');
  const [selected, setSelected] = useState<number | null>(null);
  const [creatingList, setCreatingList] = useState(false);
  const [newList, setNewList] = useState({ name: '', description: '' });
  const [promotion, setPromotion] = useState<any | 'new' | null>(null);

  const { data: lists = [], refetch: refetchLists } = useQuery({ queryKey: ['price-lists'], queryFn: async () => (await call('get', '/price-lists')).data as any[] });
  const { data: promotions = [], refetch: refetchPromotions } = useQuery({ queryKey: ['promotions'], queryFn: async () => (await call('get', '/promotions')).data as any[] });
  const current = lists.find((l) => l.id === selected);

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await call('post', '/price-lists', newList);
      toast.success('Price list created');
      setCreatingList(false);
      setNewList({ name: '', description: '' });
      await refetchLists();
      setSelected(res.data.id);
    } catch (err) {
      fail(err);
    }
  };
  const toggleList = async (l: any) => {
    try {
      await call('put', `/price-lists/${l.id}`, { active: !l.active });
      await refetchLists();
    } catch (err) {
      fail(err);
    }
  };
  const deleteList = async (l: any) => {
    if (!window.confirm(`Delete “${l.name}”? Customers on it go back to normal prices.`)) return;
    try {
      await call('delete', `/price-lists/${l.id}`);
      setSelected(null);
      await refetchLists();
      qc.invalidateQueries({ queryKey: ['accounts'] });
    } catch (err) {
      fail(err);
    }
  };
  const deletePromotion = async (p: any) => {
    if (!window.confirm(`Delete “${p.name}”?`)) return;
    try {
      await call('delete', `/promotions/${p.id}`);
      await refetchPromotions();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div>
      <PageHeader
        title="Pricing"
        subtitle="Customer price lists, promotions and discounts"
        breadcrumbs={[{ label: 'Money' }]}
        icon={<Tag className="h-5 w-5" />}
        actions={isAdmin && tab !== 'quote' ? (
          tab === 'lists'
            ? <Button size="sm" onClick={() => setCreatingList(true)}><Plus className="mr-1.5 h-4 w-4" /> New price list</Button>
            : <Button size="sm" onClick={() => setPromotion('new')}><Plus className="mr-1.5 h-4 w-4" /> New promotion</Button>
        ) : undefined}
      />

      <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1 text-sm font-medium">
        {([['lists', 'Price lists'], ['promotions', 'Promotions'], ['quote', 'Check a price']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-3.5 py-1.5 transition ${tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{label}</button>
        ))}
      </div>

      {tab === 'lists' && (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2">
            {lists.length ? lists.map((l) => (
              <button key={l.id} onClick={() => setSelected(l.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected === l.id ? 'border-primary-300 bg-primary-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">{l.name}</span>
                  {!l.active && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">OFF</span>}
                </div>
                <p className="text-xs text-gray-500">{l._count.items} price{l._count.items === 1 ? '' : 's'} · <Users className="inline h-3 w-3" /> {l._count.accounts} customer{l._count.accounts === 1 ? '' : 's'}</p>
                {l.description && <p className="mt-1 text-xs text-gray-500">{l.description}</p>}
              </button>
            )) : <EmptyState title="No price lists" description="Make one for each customer group, such as supermarkets or hotels." compact />}
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
            {current ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">{current.name}</h2>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleList(current)}>{current.active ? 'Switch off' : 'Switch on'}</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteList(current)}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
                    </div>
                  )}
                </div>
                <PriceListEditor key={current.id} listId={current.id} isAdmin={isAdmin} onChanged={refetchLists} />
              </>
            ) : <EmptyState title="Choose a price list" description="Pick a list on the left to see and set its prices." compact />}
          </div>
        </div>
      )}

      {tab === 'promotions' && (
        promotions.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {promotions.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.item ? p.item.name : `All ${p.category}`}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATE_STYLE[p.state]}`}>{p.state}</span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xl font-bold text-primary-700"><Percent className="h-4 w-4" />{p.type === 'PERCENT' ? `${Number(p.value)}% off` : `${rwf(p.value)} off each`}</p>
                <p className="text-xs text-gray-500">{formatDate(p.startsAt)} – {formatDate(p.endsAt)}{p.minQuantity > 1 ? ` · from ${p.minQuantity} units` : ''}</p>
                {isAdmin && (
                  <div className="mt-3 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => deletePromotion(p)}><Trash2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="secondary" onClick={() => setPromotion(p)}>Edit</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <EmptyState title="No promotions" description="Run a discount on an item or a whole category for a set time." />
      )}

      {tab === 'quote' && (
        <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><Calculator className="h-4 w-4 text-primary-600" /> What would this customer pay?</h2>
          <QuoteTool />
        </div>
      )}

      <Modal isOpen={creatingList} onClose={() => setCreatingList(false)} title="New price list" icon={<Tag className="h-5 w-5" />}>
        <form onSubmit={createList} className="space-y-3">
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Name *</span><input required value={newList.name} onChange={(e) => setNewList((l) => ({ ...l, name: e.target.value }))} className={field} placeholder="e.g. Supermarkets" /></label>
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Description</span><input value={newList.description} onChange={(e) => setNewList((l) => ({ ...l, description: e.target.value }))} className={field} /></label>
          <div className="flex justify-end"><Button type="submit">Create</Button></div>
        </form>
      </Modal>
      <Modal isOpen={promotion !== null} onClose={() => setPromotion(null)} title={promotion === 'new' ? 'New promotion' : 'Edit promotion'} icon={<Percent className="h-5 w-5" />}>
        {promotion !== null && <PromotionForm promotion={promotion === 'new' ? undefined : promotion} onSaved={() => { setPromotion(null); refetchPromotions(); }} />}
      </Modal>
    </div>
  );
}
