import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Banknote, Coins, AlertTriangle, CheckCircle2, Users, RefreshCw, History, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import DataTable, { type Column } from '@/components/table/DataTable';
import ExportMenu from '@/components/table/ExportMenu';
import api from '@/services/api';
import { formatDate, formatDateTime, initials } from '@/utils/formatters';

const rwf = (v: number) => `RWF ${Math.round(Number(v) || 0).toLocaleString()}`;

async function get(url: string) {
  const res = await api.get(url, { params: { t: Date.now() } });
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Could not load');
  return res.data;
}

/** Count the cash a driver hands in against what they collected. */
function Handover({ driverId, onDone }: { driverId: number; onDone: () => void }) {
  const { data } = useQuery({ queryKey: ['cash-driver', driverId], queryFn: async () => (await get(`/cash/drivers/${driverId}`)).data });
  const [received, setReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;
  const expected = data.expected;
  const amount = received === '' ? NaN : Number(received);
  const diff = Number.isFinite(amount) ? Math.round(amount - expected) : 0;

  const submit = async () => {
    setBusy(true);
    const res = await api.post('/cash/handovers', { driverId, received: amount, notes });
    setBusy(false);
    if (res.data?.success === false) return toast.error(res.data?.error?.message || 'Could not save');
    const h = res.data.data;
    if (h.status === 'BALANCED') toast.success(`${h.handoverNumber}: cash matches 👍`);
    else toast(`${h.handoverNumber}: ${h.status === 'SHORT' ? 'short' : 'over'} by ${rwf(Math.abs(Number(h.difference)))}. Admins were told.`, { icon: '⚠️', duration: 6000 });
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-xs text-gray-500">{data.driver.name} should hand in</p>
        <p className="text-2xl font-bold text-gray-900">{rwf(expected)}</p>
        <p className="text-xs text-gray-500">from {data.payments.length} cash deliver{data.payments.length === 1 ? 'y' : 'ies'}</p>
      </div>
      {data.payments.length > 0 && (
        <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100 text-sm">
          {data.payments.map((p: any) => (
            <li key={p.id} className="flex justify-between px-3 py-2">
              <span><Link to={`/orders/${p.order.id}`} className="font-medium text-primary-700 hover:underline">{p.order.orderNumber}</Link><span className="block text-xs text-gray-500">{p.order.customerName} · {formatDateTime(p.completedAt)}</span></span>
              <span className="font-semibold">{rwf(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Cash counted (RWF)</span>
        <input type="number" min={0} autoFocus value={received} onChange={(e) => setReceived(e.target.value)} className="h-12 w-full rounded-xl border border-gray-200 px-3 text-lg font-semibold outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100" placeholder={String(Math.round(expected))} />
      </label>
      {Number.isFinite(amount) && (
        <p className={`flex items-center gap-2 rounded-xl p-3 text-sm font-medium ${Math.abs(diff) < 1 ? 'bg-success-50 text-success-800' : diff < 0 ? 'bg-error-50 text-error-800' : 'bg-warning-50 text-warning-800'}`}>
          {Math.abs(diff) < 1 ? <><CheckCircle2 className="h-4 w-4" /> Matches exactly</> : <><AlertTriangle className="h-4 w-4" /> {diff < 0 ? 'Short' : 'Over'} by {rwf(Math.abs(diff))}</>}
        </p>
      )}
      <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" placeholder={diff < 0 ? 'Why is cash missing?' : 'Optional'} />
      </label>
      <div className="flex justify-end"><Button variant="success" onClick={submit} disabled={busy || !Number.isFinite(amount) || amount < 0}><Coins className="mr-1.5 h-4 w-4" /> Confirm handover</Button></div>
    </div>
  );
}

export default function Cash() {
  const [tab, setTab] = useState<'drivers' | 'history'>('drivers');
  const [search, setSearch] = useState('');
  const [receiving, setReceiving] = useState<number | null>(null);

  const drivers = useQuery({ queryKey: ['list', 'cash-drivers'], queryFn: () => get('/cash/drivers'), refetchInterval: 60_000 });
  const history = useQuery({ queryKey: ['list', 'cash-handovers'], queryFn: async () => (await get('/cash/handovers')).data as any[], enabled: tab === 'history' });
  const rows: any[] = drivers.data?.data || [];
  const totals = drivers.data?.totals || {};
  const holding = useMemo(() => rows.filter((r) => r.cashInHand > 0), [rows]);

  const refresh = () => { drivers.refetch(); history.refetch(); };

  const driverColumns: Column<any>[] = [
    {
      id: 'name', header: 'Driver', required: true, accessor: (d) => d.name,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-bold text-white">{initials(d.name)}</span>
          <div><p className="font-semibold text-gray-900">{d.name}</p><p className="text-xs text-gray-500">{d.phone}</p></div>
        </div>
      ),
    },
    { id: 'cash', header: 'Cash in hand', align: 'right', accessor: (d) => d.cashInHand, cell: (d) => d.cashInHand ? <span className="font-bold text-gray-900">{rwf(d.cashInHand)}</span> : <span className="text-gray-400">—</span> },
    { id: 'deliveries', header: 'Deliveries', align: 'right', accessor: (d) => d.deliveries },
    {
      id: 'since', header: 'Holding since', accessor: (d) => (d.holdingSince ? new Date(d.holdingSince) : null),
      cell: (d) => {
        if (!d.holdingSince) return <span className="text-gray-400">—</span>;
        const hours = (Date.now() - new Date(d.holdingSince).getTime()) / 3600000;
        return <span className={hours > 24 ? 'font-semibold text-error-600' : 'text-gray-600'}>{formatDateTime(d.holdingSince)}{hours > 24 ? ' · over a day' : ''}</span>;
      },
    },
    {
      id: 'last', header: 'Last handover', accessor: (d) => (d.lastHandover ? new Date(d.lastHandover.createdAt) : null),
      cell: (d) => d.lastHandover ? <span className="flex items-center gap-2 text-gray-600">{formatDate(d.lastHandover.createdAt)} <StatusBadge status={d.lastHandover.status} /></span> : <span className="text-gray-400">Never</span>,
    },
  ];

  const historyColumns: Column<any>[] = [
    { id: 'number', header: 'Handover', required: true, accessor: (h) => h.handoverNumber, cell: (h) => <span className="font-mono text-xs font-semibold">{h.handoverNumber}</span> },
    { id: 'date', header: 'Date', accessor: (h) => new Date(h.createdAt), cell: (h) => formatDateTime(h.createdAt) },
    { id: 'driver', header: 'Driver', accessor: (h) => h.driver?.name || '' },
    { id: 'expected', header: 'Expected', align: 'right', accessor: (h) => Number(h.expected), cell: (h) => rwf(h.expected) },
    { id: 'received', header: 'Received', align: 'right', accessor: (h) => Number(h.received), cell: (h) => <span className="font-semibold">{rwf(h.received)}</span> },
    { id: 'difference', header: 'Difference', align: 'right', accessor: (h) => Number(h.difference), cell: (h) => <span className={Number(h.difference) < 0 ? 'font-semibold text-error-600' : Number(h.difference) > 0 ? 'text-warning-600' : 'text-gray-400'}>{Number(h.difference) ? rwf(h.difference) : '—'}</span> },
    { id: 'status', header: 'Status', accessor: (h) => h.status, cell: (h) => <StatusBadge status={h.status} /> },
    { id: 'by', header: 'Received by', accessor: (h) => h.receivedBy || '' },
    { id: 'notes', header: 'Notes', defaultHidden: true, accessor: (h) => h.notes || '' },
  ];

  return (
    <div>
      <PageHeader
        title="Driver cash"
        subtitle="Cash collected on delivery, and what each driver has handed in"
        breadcrumbs={[{ label: 'Money' }]}
        icon={<Banknote className="h-5 w-5" />}
        actions={<button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Cash with drivers" value={totals.cashInHand || 0} prefix="RWF " compact icon={<Banknote className="h-5 w-5" />} tone="warning" />
        <StatCard label="Drivers holding cash" value={totals.driversHolding || 0} icon={<Users className="h-5 w-5" />} tone="info" />
        <StatCard label="Handed in (30 days)" value={totals.handedIn30d || 0} prefix="RWF " compact icon={<Coins className="h-5 w-5" />} tone="success" />
        <StatCard label="Difference (30 days)" value={totals.difference30d || 0} prefix="RWF " compact icon={<Scale className="h-5 w-5" />} tone={(totals.difference30d || 0) < 0 ? 'error' : 'primary'} />
      </div>

      <div className="mb-4 flex w-fit rounded-xl bg-gray-100 p-1 text-sm font-medium">
        <button onClick={() => setTab('drivers')} className={`rounded-lg px-3.5 py-1.5 ${tab === 'drivers' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}>Drivers {holding.length ? <span className="ml-1 text-warning-600">{holding.length}</span> : null}</button>
        <button onClick={() => setTab('history')} className={`rounded-lg px-3.5 py-1.5 ${tab === 'history' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}><History className="mr-1 inline h-3.5 w-3.5" />Handovers</button>
      </div>

      {tab === 'drivers' ? (
        <DataTable
          storageKey="cash-drivers"
          rows={rows}
          columns={driverColumns}
          rowKey={(d) => d.id}
          loading={drivers.isLoading}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search driver…"
          initialSort={{ id: 'cash', dir: 'desc' }}
          onRowClick={(d) => d.cashInHand > 0 && setReceiving(d.id)}
          rowActions={(d) => d.cashInHand > 0 ? <Button size="sm" variant="success" onClick={() => setReceiving(d.id)}><Coins className="mr-1 h-4 w-4" /> Receive</Button> : null}
          empty={<EmptyState title="No drivers yet" />}
        />
      ) : (
        <DataTable
          storageKey="cash-handovers"
          rows={history.data || []}
          columns={historyColumns}
          rowKey={(h) => h.id}
          loading={history.isLoading}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search handover or driver…"
          initialSort={{ id: 'date', dir: 'desc' }}
          toolbarRight={<ExportMenu getRows={() => (history.data || []).map((h: any) => ({ Handover: h.handoverNumber, Date: formatDateTime(h.createdAt), Driver: h.driver?.name, Expected: Number(h.expected), Received: Number(h.received), Difference: Number(h.difference), Status: h.status, 'Received by': h.receivedBy || '', Notes: h.notes || '' }))} filename="cash-handovers" title="Cash Handovers" />}
          empty={<EmptyState title="No handovers yet" description="When a driver hands in cash, record it from the Drivers tab." />}
        />
      )}

      <Modal isOpen={Boolean(receiving)} onClose={() => setReceiving(null)} title="Receive cash" icon={<Coins className="h-5 w-5" />}>
        {receiving && <Handover driverId={receiving} onDone={() => { setReceiving(null); refresh(); }} />}
      </Modal>
    </div>
  );
}
