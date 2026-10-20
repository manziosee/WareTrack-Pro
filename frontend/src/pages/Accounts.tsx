import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Edit, Wallet, AlertTriangle, Clock, FileText, Upload, Phone, Mail, MapPin, Banknote, RefreshCw, Printer, Link2, ShieldAlert, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { DetailHero, DetailSection, DetailGrid, DetailField } from '@/components/ui/Detail';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import ExportMenu from '@/components/table/ExportMenu';
import ImportDialog from '@/components/import/ImportDialog';
import { ChartCard } from '@/components/charts/chartTheme';
import { BarsChart, formatRWF } from '@/components/charts/Widgets';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/formatters';
import { printStatement } from '@/utils/statement';

const rwf = (v: number) => `RWF ${Math.round(Number(v) || 0).toLocaleString()}`;
const AGING_LABELS: Record<string, string> = { current: 'Not due', d1_30: '1–30 days', d31_60: '31–60 days', d61_90: '61–90 days', d90_plus: '90+ days' };
const METHODS = [['BANK_TRANSFER', 'Bank transfer'], ['MTN_MOMO', 'MTN MoMo'], ['AIRTEL_MONEY', 'Airtel Money'], ['CASH', 'Cash'], ['CHEQUE', 'Cheque'], ['CARD', 'Card']];
const field = 'h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100';

async function call(method: 'get' | 'post' | 'put' | 'delete', url: string, body?: unknown) {
  const res = method === 'get' || method === 'delete' ? await api[method](url) : await api[method](url, body);
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Something went wrong');
  return res.data;
}

function AccountForm({ account, isAdmin, onSaved }: { account?: any; isAdmin: boolean; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: account?.name || '', contactName: account?.contactName || '', phone: account?.phone || '', email: account?.email || '',
    address: account?.address || '', tin: account?.tin || '', creditLimit: account?.creditLimit ?? 0, paymentTermsDays: account?.paymentTermsDays ?? 0,
    status: account?.status || 'ACTIVE', notes: account?.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body: any = { ...form };
      if (!isAdmin) { delete body.creditLimit; delete body.paymentTermsDays; }
      await call(account ? 'put' : 'post', account ? `/accounts/${account.id}` : '/accounts', body);
      toast.success(account ? 'Account updated' : 'Account created');
      onSaved();
    } catch (error: any) {
      toast.error(error.message, { duration: 6000 });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-gray-700">Business name *</span><input required value={form.name} onChange={(e) => set('name', e.target.value)} className={field} placeholder="e.g. Ineza Clinic" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Contact person</span><input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} className={field} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Phone</span><input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={field} placeholder="+2507…" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Email</span><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={field} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">TIN</span><input value={form.tin} onChange={(e) => set('tin', e.target.value)} className={field} placeholder="RRA tax number" /></label>
        <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-gray-700">Address</span><input value={form.address} onChange={(e) => set('address', e.target.value)} className={field} /></label>
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-3">
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Credit limit (RWF)</span><input type="number" min={0} disabled={!isAdmin} value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} className={field} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Pays within (days)</span><input type="number" min={0} max={365} disabled={!isAdmin} value={form.paymentTermsDays} onChange={(e) => set('paymentTermsDays', e.target.value)} className={field} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Status</span>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={field}>
            <option value="ACTIVE">Active</option><option value="ON_HOLD">On hold (no credit)</option><option value="CLOSED">Closed</option>
          </select>
        </label>
        <p className="text-xs text-gray-500 sm:col-span-3">{isAdmin ? '0 means no credit limit / pay on delivery.' : 'Only an admin can change the credit limit and payment terms.'}</p>
      </div>
      <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Notes</span><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
      <div className="flex justify-end"><Button type="submit" disabled={busy}>{account ? 'Save changes' : 'Create account'}</Button></div>
    </form>
  );
}

function ReceivePayment({ account, owed, onSaved }: { account: any; owed: number; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(Math.round(owed)));
  const [provider, setProvider] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await call('post', `/accounts/${account.id}/payments`, { amount: Number(amount), provider, reference });
      toast.success(`${rwf(res.data.allocated)} applied to ${res.data.payments.length} order${res.data.payments.length === 1 ? '' : 's'}`);
      onSaved();
    } catch (error: any) {
      toast.error(error.message, { duration: 6000 });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{account.name} owes <b className="text-gray-900">{rwf(owed)}</b> on delivered orders. The payment settles the oldest orders first.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Amount (RWF)</span><input type="number" min={1} max={Math.ceil(owed)} required value={amount} onChange={(e) => setAmount(e.target.value)} className={field} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Method</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={field}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-gray-700">Reference</span><input value={reference} onChange={(e) => setReference(e.target.value)} className={field} placeholder="Bank slip, MoMo transaction ID…" /></label>
      </div>
      <div className="flex justify-end"><Button type="submit" variant="success" disabled={busy || !(Number(amount) > 0)}><Banknote className="mr-1.5 h-4 w-4" /> Record payment</Button></div>
    </form>
  );
}

function AccountDetail({ id, onEdit, onChanged }: { id: number; onEdit: (a: any) => void; onChanged: () => void }) {
  const [paying, setPaying] = useState(false);
  const { data, refetch } = useQuery({ queryKey: ['account', id], queryFn: async () => (await call('get', `/accounts/${id}`)).data });
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;
  const { account, position, payments, orders, profitability } = data;
  const used = position.limit > 0 ? Math.min(100, (position.exposure / position.limit) * 100) : 0;

  const statement = () => printStatement(id);

  return (
    <div className="space-y-5">
      <DetailHero avatar={<Building2 className="h-6 w-6" />} title={account.name} subtitle={`${account.accountNumber}${account.tin ? ` · TIN ${account.tin}` : ''}`} badges={<StatusBadge status={account.status} size="md" />} />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-3"><p className="text-xs text-gray-500">Owes</p><p className="text-lg font-bold text-gray-900">{rwf(position.balance)}</p></div>
        <div className={`rounded-xl border p-3 ${position.overdue ? 'border-error-100 bg-error-50' : 'border-gray-100 bg-white'}`}><p className="text-xs text-gray-500">Overdue</p><p className={`text-lg font-bold ${position.overdue ? 'text-error-700' : 'text-gray-900'}`}>{rwf(position.overdue)}</p></div>
      </div>
      <DetailSection title="Credit" icon={<ShieldAlert className="h-4 w-4" />}>
        {position.limit > 0 ? (
          <>
            <div className="mb-1 flex justify-between text-xs"><span className="text-gray-600">Used {rwf(position.exposure)} of {rwf(position.limit)}</span><span className={position.available < 0 ? 'font-semibold text-error-600' : 'font-semibold text-gray-900'}>{position.available < 0 ? `Over by ${rwf(-position.available)}` : `${rwf(position.available)} left`}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${used >= 100 ? 'bg-error-500' : used >= 80 ? 'bg-warning-500' : 'bg-success-500'}`} style={{ width: `${Math.max(3, used)}%` }} /></div>
          </>
        ) : <p className="text-sm text-gray-500">No credit limit set.</p>}
        <p className="mt-2 text-xs text-gray-500">{account.paymentTermsDays ? `Pays within ${account.paymentTermsDays} days of delivery` : 'Pays on delivery'}{position.openOrders ? ` · ${rwf(position.openOrders)} on orders not yet delivered` : ''}</p>
      </DetailSection>
      <DetailSection title="Aging" icon={<Clock className="h-4 w-4" />}>
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {Object.entries(AGING_LABELS).map(([k, label]) => (
            <div key={k} className={`rounded-lg p-2 ${position.aging[k] > 0 && k !== 'current' ? 'bg-error-50' : 'bg-gray-50'}`}>
              <p className="text-[10px] text-gray-500">{label}</p>
              <p className={`text-xs font-bold ${position.aging[k] > 0 && k !== 'current' ? 'text-error-700' : 'text-gray-800'}`}>{Math.round(position.aging[k]).toLocaleString()}</p>
            </div>
          ))}
        </div>
        {position.items.length > 0 && (
          <ul className="mt-3 max-h-56 divide-y divide-gray-100 overflow-y-auto">
            {position.items.map((i: any) => (
              <li key={i.orderId} className="flex items-center justify-between py-2 text-sm">
                <span><Link to={`/orders/${i.orderId}`} className="font-medium text-primary-700 hover:underline">{i.orderNumber}</Link><span className="block text-xs text-gray-500">Due {formatDate(i.dueDate)}{i.daysOverdue > 0 ? ` · ${i.daysOverdue} days late` : ''}</span></span>
                <span className={`font-semibold ${i.daysOverdue > 0 ? 'text-error-600' : 'text-gray-900'}`}>{rwf(i.outstanding)}</span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>
      <DetailSection title="Contact" icon={<Phone className="h-4 w-4" />}>
        <DetailGrid>
          <DetailField label="Contact person">{account.contactName || '—'}</DetailField>
          <DetailField label="Phone">{account.phone ? <a href={`tel:${account.phone}`} className="text-primary-700 hover:underline">{account.phone}</a> : '—'}</DetailField>
          <DetailField label="Email">{account.email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{account.email}</span> : '—'}</DetailField>
          <DetailField label="Address">{account.address ? <span className="inline-flex items-start gap-1"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{account.address}</span> : '—'}</DetailField>
        </DetailGrid>
      </DetailSection>
      <DetailSection title="Recent payments" icon={<Wallet className="h-4 w-4" />}>
        {payments.length ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {payments.slice(0, 8).map((p: any) => (
              <li key={p.id} className="flex justify-between py-2"><span>{formatDate(p.completedAt || p.createdAt)} · {p.provider.replace(/_/g, ' ').toLowerCase()}<span className="block text-xs text-gray-500">{p.order.orderNumber}{p.externalRef ? ` · ${p.externalRef}` : ''}</span></span><span className="font-semibold text-success-700">{rwf(p.amount)}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500">No payments yet.</p>}
      </DetailSection>
      <DetailSection title="Recent orders" icon={<FileText className="h-4 w-4" />}>
        {orders.length ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {orders.slice(0, 8).map((o: any) => (
              <li key={o.id} className="flex items-center justify-between py-2"><Link to={`/orders/${o.id}`} className="font-medium text-primary-700 hover:underline">{o.orderNumber}</Link><span className="flex items-center gap-2"><StatusBadge status={o.paymentStatus} /><span className="w-28 text-right font-semibold">{rwf(o.totalAmount)}</span></span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500">No orders yet.</p>}
      </DetailSection>
      <DetailSection title="Customer profitability" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[['Delivered sales', profitability?.revenue], ['Estimated product cost', profitability?.estimatedProductCost], ['Delivery costs', profitability?.deliveryCosts], ['Estimated margin', profitability?.estimatedMargin]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-gray-50 p-3"><p className="text-[11px] text-gray-500">{label}</p><p className="mt-1 text-sm font-bold text-gray-900">{rwf(Number(value || 0))}</p></div>)}
        </div>
        <p className="mt-2 text-xs text-gray-500">Estimated from delivered order prices, recorded delivery expenses, and average purchase costs. Missing purchase costs may understate margin.</p>
      </DetailSection>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={statement}><Printer className="mr-1.5 h-4 w-4" /> Statement</Button>
        <Button variant="secondary" size="sm" onClick={() => onEdit(account)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
        {position.balance > 0 && <Button size="sm" variant="success" onClick={() => setPaying(true)}><Banknote className="mr-1.5 h-4 w-4" /> Receive payment</Button>}
      </div>
      <Modal isOpen={paying} onClose={() => setPaying(false)} title="Receive payment" subtitle={account.name} icon={<Banknote className="h-5 w-5" />}>
        {paying && <ReceivePayment account={account} owed={position.balance} onSaved={() => { setPaying(false); refetch(); onChanged(); }} />}
      </Modal>
    </div>
  );
}

export default function Accounts() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['list', 'accounts'],
    queryFn: async () => {
      const res = await call('get', '/accounts');
      return { rows: res.data as any[], totals: res.totals };
    },
    refetchInterval: 60_000,
  });
  const rows = data?.rows || [];
  const totals = data?.totals;

  useEffect(() => {
    const view = Number(params.get('view'));
    if (view) { setViewId(view); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const refresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['account'] });
  };

  const filtered = useMemo(() => rows.filter((a) => {
    if (filter === 'OWING') return a.balance > 0;
    if (filter === 'OVERDUE') return a.overdue > 0;
    if (filter === 'OVER_LIMIT') return a.available !== null && a.available < 0;
    if (filter === 'ON_HOLD') return a.status === 'ON_HOLD';
    return true;
  }), [rows, filter]);

  const linkOrders = async () => {
    try {
      const res = await call('post', '/accounts/link-orders');
      toast.success(`${res.data.created} accounts created, ${res.data.linked} orders linked`);
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const columns: Column<any>[] = [
    {
      id: 'name', header: 'Customer', required: true, accessor: (a) => a.name,
      cell: (a) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Building2 className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="truncate font-semibold text-gray-900">{a.name}</p><p className="text-xs text-gray-500">{a.accountNumber}{a.phone ? ` · ${a.phone}` : ''}</p></div>
        </div>
      ),
    },
    { id: 'balance', header: 'Owes', align: 'right', accessor: (a) => a.balance, cell: (a) => <span className="font-semibold text-gray-900">{a.balance ? rwf(a.balance) : '—'}</span> },
    { id: 'overdue', header: 'Overdue', align: 'right', accessor: (a) => a.overdue, cell: (a) => a.overdue ? <span className="font-semibold text-error-600">{rwf(a.overdue)}</span> : <span className="text-gray-400">—</span> },
    {
      id: 'credit', header: 'Credit used', accessor: (a) => (a.creditLimit ? a.exposure / a.creditLimit : -1),
      cell: (a) => a.creditLimit ? (
        <div className="w-36">
          <div className="mb-0.5 flex justify-between text-[11px]"><span className="text-gray-500">{Math.round((a.exposure / a.creditLimit) * 100)}%</span><span className="text-gray-500">{formatRWF(a.creditLimit)}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${a.available < 0 ? 'bg-error-500' : a.exposure / a.creditLimit > 0.8 ? 'bg-warning-500' : 'bg-success-500'}`} style={{ width: `${Math.min(100, Math.max(3, (a.exposure / a.creditLimit) * 100))}%` }} /></div>
        </div>
      ) : <span className="text-xs text-gray-400">No limit</span>,
    },
    { id: 'terms', header: 'Terms', accessor: (a) => a.paymentTermsDays, cell: (a) => <span className="text-gray-600">{a.paymentTermsDays ? `${a.paymentTermsDays} days` : 'On delivery'}</span> },
    { id: 'status', header: 'Status', accessor: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
    { id: 'orders', header: 'Orders', align: 'right', defaultHidden: true, accessor: (a) => a.orders },
    { id: 'last', header: 'Last order', defaultHidden: true, accessor: (a) => (a.lastOrderAt ? new Date(a.lastOrderAt) : null), cell: (a) => (a.lastOrderAt ? formatDate(a.lastOrderAt) : '—') },
  ];

  const agingChart = totals ? Object.entries(AGING_LABELS).map(([k, label]) => ({ label, amount: totals.aging[k] || 0 })) : [];

  return (
    <div>
      <PageHeader
        title="Customer accounts"
        subtitle="Who owes what, credit limits and payments"
        breadcrumbs={[{ label: 'Money' }]}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <Button size="sm" variant="secondary" onClick={() => setImporting(true)}><Upload className="mr-1.5 h-4 w-4" /> Import</Button>
            <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New account</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Customers owe" value={totals?.receivable || 0} prefix="RWF " compact icon={<Wallet className="h-5 w-5" />} tone="primary" />
        <StatCard label="Overdue" value={totals?.overdue || 0} prefix="RWF " compact icon={<AlertTriangle className="h-5 w-5" />} tone="error" />
        <StatCard label="Over credit limit" value={totals?.overLimit || 0} icon={<ShieldAlert className="h-5 w-5" />} tone="warning" />
        <StatCard label="Accounts" value={totals?.accounts || 0} icon={<Building2 className="h-5 w-5" />} tone="info" />
      </div>

      {totals?.receivable > 0 && (
        <ChartCard className="mb-5" title="Money owed by age" subtitle="How late the unpaid delivered orders are" icon={<Clock className="h-4 w-4" />}>
          <BarsChart data={agingChart} series={[{ key: 'amount', name: 'Owed', color: '#4682B4' }]} valueFormatter={(v) => formatRWF(Number(v))} height={200} />
        </ChartCard>
      )}

      <DataTable
        storageKey="accounts"
        rows={filtered}
        columns={columns}
        rowKey={(a) => a.id}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, phone, account number…"
        initialSort={{ id: 'balance', dir: 'desc' }}
        activeKey={viewId}
        onRowClick={(a) => setViewId(a.id)}
        filters={<FilterChip label="Show" value={filter} onChange={setFilter} options={[{ value: 'OWING', label: 'Owing money' }, { value: 'OVERDUE', label: 'Overdue' }, { value: 'OVER_LIMIT', label: 'Over limit' }, { value: 'ON_HOLD', label: 'On hold' }]} />}
        toolbarRight={<ExportMenu getRows={() => filtered.map((a) => ({ Account: a.accountNumber, Customer: a.name, Phone: a.phone || '', TIN: a.tin || '', 'Owes (RWF)': a.balance, 'Overdue (RWF)': a.overdue, 'Credit limit (RWF)': a.creditLimit, 'Terms (days)': a.paymentTermsDays, Status: a.status }))} filename="customer-accounts" title="Customer Accounts" />}
        rowActions={(a) => <button onClick={() => setEditing(a)} className="action-btn action-btn-edit" title="Edit"><Edit className="h-4 w-4" /></button>}
        empty={!rows.length ? (
          <EmptyState
            title="No customer accounts yet"
            description="Create accounts for the businesses you deliver to, or build them from your existing orders."
            action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={linkOrders}><Link2 className="mr-1.5 h-4 w-4" /> From existing orders</Button><Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New account</Button></div>}
          />
        ) : undefined}
      />

      <Drawer open={Boolean(viewId)} onClose={() => setViewId(null)} title={rows.find((a) => a.id === viewId)?.name || 'Account'} subtitle={rows.find((a) => a.id === viewId)?.accountNumber} icon={<Building2 className="h-4 w-4" />} width="lg">
        {viewId && <AccountDetail id={viewId} onEdit={setEditing} onChanged={refresh} />}
      </Drawer>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New customer account" icon={<Plus className="h-5 w-5" />} size="lg">
        {creating && <AccountForm isAdmin={isAdmin} onSaved={() => { setCreating(false); refresh(); }} />}
      </Modal>
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit account" subtitle={editing?.name} icon={<Edit className="h-5 w-5" />} size="lg">
        {editing && <AccountForm account={editing} isAdmin={isAdmin} onSaved={() => { setEditing(null); refresh(); }} />}
      </Modal>
      <Modal isOpen={importing} onClose={() => setImporting(false)} title="Import customer accounts" icon={<Upload className="h-5 w-5" />} size="lg">
        {importing && (
          <ImportDialog
            templateName="customer-accounts-template.csv"
            hint="One row per customer. Existing names are updated."
            fields={[
              { key: 'name', label: 'Name', required: true, aliases: ['customer', 'business', 'customer name'], example: 'Ineza Clinic' },
              { key: 'phone', label: 'Phone', aliases: ['telephone', 'mobile'], example: '+250788000000' },
              { key: 'email', label: 'Email', example: 'orders@inezaclinic.rw' },
              { key: 'address', label: 'Address', aliases: ['location'], example: 'KG 493 St, Nyamirambo, Kigali' },
              { key: 'contactName', label: 'Contact person', aliases: ['contact'], example: 'Aline' },
              { key: 'tin', label: 'TIN', example: '101234567' },
              { key: 'creditLimit', label: 'Credit limit', aliases: ['limit'], example: 2000000 },
              { key: 'paymentTermsDays', label: 'Payment terms (days)', aliases: ['terms', 'days'], example: 30 },
            ]}
            onImport={async (importRows) => {
              const res = await call('post', '/accounts/import', { rows: importRows });
              return { message: `${res.data.created} created, ${res.data.updated} updated, ${res.data.ordersLinked} orders linked`, errors: res.data.errors };
            }}
            onDone={refresh}
          />
        )}
      </Modal>
    </div>
  );
}
