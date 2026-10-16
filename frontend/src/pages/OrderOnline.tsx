import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Search, Plus, Minus, Phone, CheckCircle2, Loader2, Store, X } from 'lucide-react';
import { LogoMark } from '@/components/ui/Logo';
import api from '@/services/api';

const rwf = (v: number) => `RWF ${Math.round(Number(v) || 0).toLocaleString()}`;
const input = 'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100';

type CartLine = { key: string; itemId: number; packagingId?: number; name: string; price: number; quantity: number };

/** Public page where customers order without an account. */
export default function OrderOnline() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-catalog'],
    queryFn: async () => {
      const res = await api.get('/public/catalog');
      if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Ordering is closed');
      return res.data.data;
    },
    retry: false,
  });
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ customerName: '', contactNumber: '', deliveryAddress: '', deliveryInstructions: '', paymentMethod: 'CASH', website: '' });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [placed, setPlaced] = useState<{ orderNumber: string; totalAmount: number } | null>(null);

  const items: any[] = data?.items || [];
  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort(), [items]);
  const shown = items.filter((i) => (!category || i.category === category) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const count = cart.reduce((s, l) => s + l.quantity, 0);

  const add = (item: any, pack?: any) => {
    const key = `${item.id}-${pack?.id || 0}`;
    const price = pack ? pack.price ?? item.unitPrice * pack.unitsPerPack : item.unitPrice;
    setCart((c) => (c.some((l) => l.key === key) ? c.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l)) : [...c, { key, itemId: item.id, packagingId: pack?.id, name: pack ? `${item.name} (${pack.name} of ${pack.unitsPerPack})` : item.name, price, quantity: 1 }]));
  };
  const change = (key: string, delta: number) => setCart((c) => c.map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem('');
    const res = await api.post('/public/orders', { ...form, items: cart.map((l) => ({ itemId: l.itemId, packagingId: l.packagingId, quantity: l.quantity })) }).catch(() => null);
    setBusy(false);
    if (!res?.data?.success) return setProblem(res?.data?.error?.message || 'Could not place the order. Please try again or call us.');
    setPlaced(res.data.data);
    setCart([]);
    setCheckout(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2"><LogoMark className="h-8 w-8" /><span className="font-bold text-gray-900">{data?.businessName || 'Order online'}</span></span>
          {data?.phone && <a href={`tel:${data.phone}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700"><Phone className="h-4 w-4" /> {data.phone}</a>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {placed ? (
          <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success-500" />
            <h1 className="mt-3 text-xl font-bold text-gray-900">Thank you! Order received</h1>
            <p className="mt-1 text-gray-600">Your order number is <b>{placed.orderNumber}</b> ({rwf(placed.totalAmount)}). We'll call you to confirm the delivery time.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Link to={`/track/${placed.orderNumber}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-500 font-semibold text-white">Track my order</Link>
              <button onClick={() => setPlaced(null)} className="h-11 rounded-xl border border-gray-200 font-medium text-gray-700">Order something else</button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : error ? (
          <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-soft">
            <Store className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-semibold text-gray-900">Online ordering isn't open right now</p>
            <p className="text-sm text-gray-500">Please call us to place an order.</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Order for delivery</h1>
            <p className="mt-1 text-sm text-gray-600">{data.message}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className={`${input} pl-9`} /></div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${input} sm:w-56`}><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item) => (
                <div key={item.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.category}</p>
                  <p className="mt-0.5 font-semibold text-gray-900">{item.name}</p>
                  {item.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.description}</p>}
                  <div className="mt-auto space-y-2 pt-3">
                    <button onClick={() => add(item)} className="flex w-full items-center justify-between rounded-xl bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100"><span>{rwf(item.unitPrice)} / {item.unit}</span><Plus className="h-4 w-4" /></button>
                    {item.packagings.map((p: any) => (
                      <button key={p.id} onClick={() => add(item, p)} className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><span>{p.name} of {p.unitsPerPack} · {rwf(p.price ?? item.unitPrice * p.unitsPerPack)}</span><Plus className="h-4 w-4" /></button>
                    ))}
                  </div>
                </div>
              ))}
              {!shown.length && <p className="col-span-full py-8 text-center text-sm text-gray-500">No products match.</p>}
            </div>
          </>
        )}
      </main>

      {count > 0 && !placed && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lift">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm"><ShoppingCart className="h-5 w-5 text-primary-600" /><b>{count}</b> item{count === 1 ? '' : 's'} · <b>{rwf(total)}</b></span>
            <button onClick={() => setCheckout(true)} className="h-11 rounded-xl bg-accent-500 px-5 font-semibold text-white hover:bg-accent-600">Checkout</button>
          </div>
        </div>
      )}

      {checkout && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setCheckout(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Your order</h2><button type="button" onClick={() => setCheckout(false)} className="rounded-lg p-1 text-gray-500"><X className="h-5 w-5" /></button></div>
            <ul className="mb-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
              {cart.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span className="flex items-center gap-1"><button type="button" onClick={() => change(l.key, -1)} className="rounded-md border border-gray-200 p-1"><Minus className="h-3 w-3" /></button><span className="w-6 text-center font-semibold">{l.quantity}</span><button type="button" onClick={() => change(l.key, 1)} className="rounded-md border border-gray-200 p-1"><Plus className="h-3 w-3" /></button></span>
                  <span className="w-28 text-right font-medium">{rwf(l.price * l.quantity)}</span>
                </li>
              ))}
              <li className="flex justify-between px-3 py-2 text-sm font-bold"><span>Total</span><span>{rwf(total)}</span></li>
            </ul>
            {data?.minimumOrder > 0 && total < data.minimumOrder && <p className="mb-3 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">Minimum order is {rwf(data.minimumOrder)}.</p>}
            <div className="space-y-3">
              <input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Your name or business" className={input} />
              <input required type="tel" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="Phone, e.g. 0788 000 000" className={input} />
              <input required value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Delivery address (street, area)" className={input} />
              <input value={form.deliveryInstructions} onChange={(e) => setForm({ ...form, deliveryInstructions: e.target.value })} placeholder="Notes for the driver (optional)" className={input} />
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={input}>
                <option value="CASH">Pay cash on delivery</option><option value="MTN_MOMO">MTN MoMo</option><option value="AIRTEL_MONEY">Airtel Money</option>
              </select>
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="hidden" aria-hidden="true" />
            </div>
            {problem && <p className="mt-3 rounded-xl bg-error-50 p-3 text-sm text-error-700">{problem}</p>}
            <button type="submit" disabled={busy || (data?.minimumOrder > 0 && total < data.minimumOrder)} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 text-base font-semibold text-white disabled:opacity-60">
              {busy && <Loader2 className="h-5 w-5 animate-spin" />} Place order · {rwf(total)}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
