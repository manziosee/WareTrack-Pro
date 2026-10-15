import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Smartphone, Banknote, Printer, RefreshCw, CheckCircle2, Clock, Receipt, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { DonutChart } from '@/components/charts/Widgets';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import ExportMenu from '@/components/table/ExportMenu';
import api from '@/services/api';
import { useList } from '@/hooks/useList';
import { formatDate } from '@/utils/formatters';
import { printInvoice } from '@/utils/invoice';

const rwf = (v: unknown) => `RWF ${Math.round(Number(v || 0)).toLocaleString()}`;
const PROVIDER: Record<string, { label: string; color: string }> = {
  MTN_MOMO: { label: 'MTN MoMo', color: '#FFC533' },
  AIRTEL_MONEY: { label: 'Airtel Money', color: '#E0578A' },
  CASH: { label: 'Cash', color: '#2A9D8F' },
  BANK_TRANSFER: { label: 'Bank transfer', color: '#3B7DC4' },
  CARD: { label: 'Card', color: '#8B5CF6' },
};

export default function Payments() {
  const [tab, setTab] = useState<'payments' | 'invoices'>('payments');
  const { rows: payments, loading, refresh } = useList<any>('payments', '/payments');
  const { rows: invoices, loading: loadingInvoices, refresh: refreshInvoices } = useList<any>('invoices', '/invoices');
  const { rows: orders, refresh: refreshOrders } = useList<any>('orders', '/orders');
  const { data: providers = [] } = useQuery({ queryKey: ['payment-providers'], queryFn: async () => (await api.get('/payments/providers')).data?.data || [] });
  const [provider, setProvider] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({ orderId: '', method: 'MTN_MOMO', phoneNumber: '', reference: '' });
  const [busy, setBusy] = useState(false);

  const unpaid = useMemo(() => orders.filter((o) => (o.paymentStatus || 'UNPAID') === 'UNPAID' && !['CANCELLED', 'RETURNED'].includes(o.status)), [orders]);
  const filtered = payments.filter((p) => !provider || p.provider === provider);
  const successful = payments.filter((p) => p.status === 'SUCCESSFUL');
  const configured = (id: string) => providers.find((p: any) => p.id === id)?.configured;
  const selectedOrder = unpaid.find((o) => String(o.id) === form.orderId);

  const submit = async () => {
    if (!form.orderId) return toast.error('Choose an order');
    setBusy(true);
    const mobile = ['MTN_MOMO', 'AIRTEL_MONEY'].includes(form.method);
    const res = mobile
      ? await api.post('/payments/request', { orderId: Number(form.orderId), provider: form.method, phoneNumber: form.phoneNumber || undefined })
      : await api.post('/payments/manual', { orderId: Number(form.orderId), provider: form.method, reference: form.reference || undefined });
    setBusy(false);
    if (res.data?.success) {
      toast.success(mobile ? 'Payment request sent. The customer approves it on their phone.' : 'Payment recorded');
      setShowRequest(false);
      setForm({ orderId: '', method: 'MTN_MOMO', phoneNumber: '', reference: '' });
      refresh();
      refreshOrders();
      refreshInvoices();
    } else toast.error(res.data?.error?.message || 'Payment failed');
  };

  const checkStatus = async (p: any) => {
    const res = await api.get(`/payments/${p.id}/status`, { params: { t: Date.now() } });
    if (res.data?.success) {
      toast(`Payment is ${String(res.data.data.status).toLowerCase()}`);
      refresh();
    } else toast.error(res.data?.error?.message || 'Could not check the payment');
  };

  const paymentColumns: Column<any>[] = [
    { id: 'date', header: 'Date', required: true, accessor: (p) => new Date(p.createdAt), cell: (p) => <span className="text-gray-700">{formatDate(p.createdAt)}</span> },
    { id: 'order', header: 'Order', accessor: (p) => p.order?.orderNumber, cell: (p) => <div><p className="font-semibold text-gray-900">{p.order?.orderNumber}</p><p className="text-xs text-gray-500">{p.order?.customerName}</p></div> },
    { id: 'provider', header: 'Method', accessor: (p) => PROVIDER[p.provider]?.label || p.provider, cell: (p) => <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PROVIDER[p.provider]?.color || '#94A3B8' }} />{PROVIDER[p.provider]?.label || p.provider}</span> },
    { id: 'phone', header: 'Phone', defaultHidden: true, accessor: (p) => p.phoneNumber || '' },
    { id: 'amount', header: 'Amount', align: 'right', accessor: (p) => Number(p.amount), cell: (p) => <span className="font-semibold">{rwf(p.amount)}</span> },
    { id: 'status', header: 'Status', accessor: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
    { id: 'ref', header: 'Reference', accessor: (p) => p.externalRef || '', cell: (p) => <span className="font-mono text-xs text-gray-500">{p.externalRef || '—'}</span> },
  ];

  const invoiceColumns: Column<any>[] = [
    { id: 'number', header: 'Invoice', required: true, accessor: (i) => i.invoiceNumber, cell: (i) => <div><p className="font-semibold text-gray-900">{i.invoiceNumber}</p><p className="text-xs text-gray-500">{formatDate(i.issuedAt)}</p></div> },
    { id: 'order', header: 'Order', accessor: (i) => i.order?.orderNumber, cell: (i) => <div><p className="font-medium text-gray-800">{i.order?.orderNumber}</p><p className="text-xs text-gray-500">{i.order?.customerName}</p></div> },
    { id: 'total', header: 'Total (incl. VAT)', align: 'right', accessor: (i) => Number(i.total), cell: (i) => <span className="font-semibold">{rwf(i.total)}</span> },
    { id: 'status', header: 'Status', accessor: (i) => i.status, cell: (i) => <StatusBadge status={i.status} /> },
    { id: 'due', header: 'Due', accessor: (i) => (i.dueDate ? new Date(i.dueDate) : null), cell: (i) => <span className={i.status !== 'PAID' && i.dueDate && new Date(i.dueDate) < new Date() ? 'font-semibold text-error-600' : 'text-gray-600'}>{i.dueDate ? formatDate(i.dueDate) : '—'}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Mobile Money, cash and bank payments, and invoices"
        breadcrumbs={[{ label: 'Insights' }]}
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <>
            <button onClick={() => { refresh(); refreshInvoices(); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <Button size="sm" onClick={() => setShowRequest(true)}><Smartphone className="mr-1.5 h-4 w-4" /> Take a payment</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Collected" value={successful.reduce((s, p) => s + Number(p.amount), 0)} prefix="RWF " compact icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          <StatCard label="Awaiting payment" value={unpaid.reduce((s, o) => s + Number(o.totalAmount || 0), 0)} prefix="RWF " compact icon={<Clock className="h-5 w-5" />} tone="warning" />
          <StatCard label="Unpaid orders" value={unpaid.length} icon={<Receipt className="h-5 w-5" />} tone="accent" />
          <StatCard label="Pending Mobile Money" value={payments.filter((p) => p.status === 'PENDING').length} icon={<Smartphone className="h-5 w-5" />} tone="info" />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <p className="mb-2 text-sm font-semibold text-gray-900">How customers pay</p>
          <DonutChart
            data={Object.keys(PROVIDER).map((k) => ({ name: PROVIDER[k].label, value: successful.filter((p) => p.provider === k).reduce((s, p) => s + Number(p.amount), 0), color: PROVIDER[k].color }))}
            centerLabel="Collected"
            format={(v) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)}
            height={160}
          />
        </div>
      </div>

      <div className="mb-3 flex w-fit rounded-xl bg-gray-100 p-1 text-xs font-medium">
        {([['payments', 'Payments'], ['invoices', 'Invoices']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-3 py-1.5 transition ${tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{label}</button>
        ))}
      </div>

      {tab === 'payments' ? (
        <DataTable
          storageKey="payments"
          rows={filtered}
          columns={paymentColumns}
          rowKey={(p) => p.id}
          loading={loading}
          initialSort={{ id: 'date', dir: 'desc' }}
          searchPlaceholder="Search order, customer, reference…"
          filters={<FilterChip label="Method" value={provider} onChange={setProvider} options={Object.entries(PROVIDER).map(([k, v]) => ({ value: k, label: v.label }))} />}
          toolbarRight={<ExportMenu getRows={() => filtered.map((p) => ({ Date: formatDate(p.createdAt), Order: p.order?.orderNumber, Customer: p.order?.customerName, Method: PROVIDER[p.provider]?.label || p.provider, Amount: Number(p.amount), Status: p.status, Reference: p.externalRef || '' }))} filename="payments" title="Payments" />}
          rowActions={(p) => (
            <>
              {p.status === 'PENDING' && <button onClick={() => checkStatus(p)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary-500 px-2.5 text-xs font-semibold text-white"><RefreshCw className="h-3.5 w-3.5" /> Check</button>}
              <button onClick={() => printInvoice(p.orderId)} className="action-btn action-btn-view" title="Print receipt"><Printer className="h-4 w-4" /></button>
            </>
          )}
        />
      ) : (
        <DataTable
          storageKey="invoices"
          rows={invoices}
          columns={invoiceColumns}
          rowKey={(i) => i.id}
          loading={loadingInvoices}
          initialSort={{ id: 'number', dir: 'desc' }}
          searchPlaceholder="Search invoice, order, customer…"
          toolbarRight={<ExportMenu getRows={() => invoices.map((i) => ({ Invoice: i.invoiceNumber, Order: i.order?.orderNumber, Customer: i.order?.customerName, 'Total Amount': Number(i.total), Status: i.status, Issued: formatDate(i.issuedAt) }))} filename="invoices" title="Invoices" />}
          rowActions={(i) => <button onClick={() => printInvoice(i.orderId)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"><Printer className="h-3.5 w-3.5" /> Print</button>}
        />
      )}

      <Modal isOpen={showRequest} onClose={() => setShowRequest(false)} title="Take a payment" subtitle="Mobile Money request, or record cash / bank" icon={<Wallet className="h-5 w-5" />}>
        <div className="space-y-4">
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Unpaid order</span>
            <select value={form.orderId} onChange={(e) => { const o = unpaid.find((x) => String(x.id) === e.target.value); setForm({ ...form, orderId: e.target.value, phoneNumber: o?.contactNumber || '' }); }} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm">
              <option value="">Choose an order…</option>
              {unpaid.slice(0, 300).map((o) => <option key={o.id} value={o.id}>{o.orderNumber} · {o.customerName} · {rwf(o.totalAmount)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(PROVIDER).filter(([k]) => k !== 'CARD').map(([k, v]) => {
              const disabled = ['MTN_MOMO', 'AIRTEL_MONEY'].includes(k) && !configured(k);
              return (
                <button key={k} disabled={disabled} onClick={() => setForm({ ...form, method: k })} className={`rounded-xl border p-3 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${form.method === k ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-100' : 'border-gray-200 hover:border-primary-200'}`}>
                  <span className="mb-1.5 block h-2.5 w-2.5 rounded-full" style={{ background: v.color }} />
                  {v.label}
                  {disabled && <span className="mt-0.5 block font-normal text-gray-500">Not set up</span>}
                </button>
              );
            })}
          </div>
          {['MTN_MOMO', 'AIRTEL_MONEY'].includes(form.method) ? (
            <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Customer phone</span>
              <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="078…" className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" />
            </label>
          ) : (
            <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Reference (optional)</span>
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Receipt or transfer number" className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" />
            </label>
          )}
          {!configured('MTN_MOMO') && !configured('AIRTEL_MONEY') && (
            <p className="flex items-start gap-2 rounded-xl bg-info-50 p-3 text-xs text-info-700"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Mobile Money switches on once the MTN MoMo or Airtel Money API keys are added to the server. Cash and bank payments work now.</p>
          )}
          {selectedOrder && <p className="text-sm text-gray-600">Amount: <b className="text-gray-900">{rwf(selectedOrder.totalAmount)}</b></p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button size="sm" disabled={busy} onClick={submit}>{['MTN_MOMO', 'AIRTEL_MONEY'].includes(form.method) ? <><Smartphone className="mr-1.5 h-4 w-4" /> Send request</> : <><Banknote className="mr-1.5 h-4 w-4" /> Record payment</>}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
