import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Plus, Fuel, Clock, Truck, CheckCircle2, XCircle, RefreshCw, Image as ImageIcon, Trash2, PieChart as PieIcon } from 'lucide-react';
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
import ExpenseForm, { EXPENSE_TYPES } from '@/components/finance/ExpenseForm';
import { ChartCard } from '@/components/charts/chartTheme';
import { DonutChart, BarList, formatRWF } from '@/components/charts/Widgets';
import api from '@/services/api';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/formatters';
import StoredImage from '@/components/ui/StoredImage';

const rwf = (v: number) => `RWF ${Math.round(Number(v) || 0).toLocaleString()}`;
const typeLabel = (t: string) => EXPENSE_TYPES.find(([v]) => v === t)?.[1] || t;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function ExpenseDetail({ id, canReview, canDelete, onChanged }: { id: number; canReview: boolean; canDelete: boolean; onChanged: () => void }) {
  const [note, setNote] = useState('');
  const { data: e, refetch } = useQuery({ queryKey: ['expense', id], queryFn: async () => (await api.get(`/expenses/${id}`)).data?.data });
  if (!e) return <p className="text-sm text-gray-500">Loading…</p>;
  const review = async (status: string) => {
    const res = await api.post(`/expenses/${id}/review`, { status, note });
    if (res.data?.success === false) return toast.error(res.data?.error?.message || 'Could not update');
    toast.success(status === 'APPROVED' ? 'Expense approved' : 'Expense rejected');
    refetch();
    onChanged();
  };
  const remove = async () => {
    const res = await api.delete(`/expenses/${id}`);
    if (res.data?.success === false) return toast.error(res.data?.error?.message || 'Could not delete');
    toast.success('Expense deleted');
    onChanged();
  };
  return (
    <div className="space-y-5">
      <DetailHero avatar={e.type === 'FUEL' ? <Fuel className="h-6 w-6" /> : <Receipt className="h-6 w-6" />} title={rwf(e.amount)} subtitle={`${typeLabel(e.type)} · ${e.expenseNumber}`} badges={<StatusBadge status={e.status} size="md" />} />
      <DetailSection title="Details" icon={<Receipt className="h-4 w-4" />}>
        <DetailGrid>
          <DetailField label="Date">{formatDate(e.spentAt)}</DetailField>
          <DetailField label="Vehicle">{e.vehicle?.plateNumber || '—'}</DetailField>
          <DetailField label="Driver">{e.driver?.name || '—'}</DetailField>
          {e.type === 'FUEL' && <DetailField label="Fuel">{e.liters ? `${Number(e.liters)} L · ${rwf(Number(e.amount) / Number(e.liters))}/L` : '—'}</DetailField>}
          {e.odometer && <DetailField label="Odometer">{Number(e.odometer).toLocaleString()} km</DetailField>}
          <DetailField label="Description" className="sm:col-span-2">{e.description || '—'}</DetailField>
          {e.reviewNote && <DetailField label="Review note" className="sm:col-span-2">{e.reviewNote}</DetailField>}
        </DetailGrid>
      </DetailSection>
      <DetailSection title="Receipt" icon={<ImageIcon className="h-4 w-4" />}>
        {e.receiptPhoto ? <StoredImage value={e.receiptPhoto} alt="Receipt" className="max-h-80 w-full rounded-xl object-contain" link /> : <p className="text-sm text-gray-500">No receipt photo.</p>}
      </DetailSection>
      {canReview && e.status === 'PENDING' && (
        <div className="space-y-2 rounded-xl bg-gray-50 p-3">
          <input value={note} onChange={(ev) => setNote(ev.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" placeholder="Note (optional)" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="error" onClick={() => review('REJECTED')}><XCircle className="mr-1.5 h-4 w-4" /> Reject</Button>
            <Button size="sm" variant="success" onClick={() => review('APPROVED')}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve</Button>
          </div>
        </div>
      )}
      {canDelete && <div className="flex justify-end"><Button size="sm" variant="secondary" onClick={remove}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button></div>}
    </div>
  );
}

export default function Expenses() {
  const { user } = useAuth();
  const isDriver = user?.role === 'DRIVER';
  const canReview = ['ADMIN', 'DISPATCH_OFFICER'].includes(user?.role || '');
  const [range, setRange] = useState({ from: iso(new Date(Date.now() - 30 * 86400000)), to: iso(new Date()) });
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const { rows: vehicles } = useList<any>('vehicles', '/vehicles', {}, { enabled: !isDriver });
  const { rows: drivers } = useList<any>('drivers', '/drivers', {}, { enabled: !isDriver });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['list', 'expenses', range],
    queryFn: async () => {
      const res = await api.get('/expenses', { params: { ...range, t: Date.now() } });
      if (res.data?.success === false) throw new Error(res.data?.error?.message);
      return res.data;
    },
    keepPreviousData: true,
  });
  const rows: any[] = data?.data || [];
  const summary = data?.summary || {};
  const filtered = useMemo(() => rows.filter((r) => (!type || r.type === type) && (!status || r.status === status)), [rows, type, status]);
  const viewing = rows.find((r) => r.id === viewId);

  const columns: Column<any>[] = [
    { id: 'date', header: 'Date', accessor: (e) => new Date(e.spentAt), cell: (e) => formatDate(e.spentAt) },
    { id: 'type', header: 'Type', required: true, accessor: (e) => e.type, cell: (e) => <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">{e.type === 'FUEL' ? <Fuel className="h-3.5 w-3.5 text-accent-500" /> : <Receipt className="h-3.5 w-3.5 text-gray-400" />}{typeLabel(e.type)}</span> },
    { id: 'amount', header: 'Amount', align: 'right', accessor: (e) => e.amount, cell: (e) => <span className="font-semibold">{rwf(e.amount)}</span> },
    { id: 'vehicle', header: 'Vehicle', accessor: (e) => e.vehicle?.plateNumber || '' },
    { id: 'driver', header: 'Driver', accessor: (e) => e.driver?.name || '' },
    { id: 'liters', header: 'Liters', align: 'right', defaultHidden: true, accessor: (e) => e.liters || 0, cell: (e) => (e.liters ? `${e.liters} L` : '—') },
    { id: 'description', header: 'What for', accessor: (e) => e.description || '', cell: (e) => <span className="block max-w-[16rem] truncate text-gray-600">{e.description || '—'}</span> },
    { id: 'receipt', header: 'Receipt', accessor: (e) => (e.hasReceipt ? 1 : 0), cell: (e) => (e.hasReceipt ? <ImageIcon className="h-4 w-4 text-success-600" /> : <span className="text-xs text-gray-400">None</span>) },
    { id: 'status', header: 'Status', accessor: (e) => e.status, cell: (e) => <StatusBadge status={e.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={isDriver ? 'Fuel, tolls and repairs you paid for' : 'Fuel, tolls, repairs and other running costs'}
        breadcrumbs={[{ label: isDriver ? 'My work' : 'Fleet' }]}
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <>
            <button onClick={() => refetch()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Add expense</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5" />
        <span className="text-gray-400">to</span>
        <input type="date" value={range.to} min={range.from} max={iso(new Date())} onChange={(e) => setRange({ ...range, to: e.target.value })} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Spent" value={summary.total || 0} prefix="RWF " compact icon={<Receipt className="h-5 w-5" />} tone="accent" />
        <StatCard label="Waiting for approval" value={summary.pendingCount || 0} icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Fuel bought" value={summary.fuelLiters || 0} suffix=" L" icon={<Fuel className="h-5 w-5" />} tone="info" />
        {!isDriver && <StatCard label="Cost per delivery" value={summary.costPerDelivery || 0} prefix="RWF " compact icon={<Truck className="h-5 w-5" />} tone="primary" />}
      </div>

      {!isDriver && summary.total > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="By type" subtitle="Approved and pending" icon={<PieIcon className="h-4 w-4" />}>
            <DonutChart data={Object.entries(summary.byType || {}).map(([k, v]) => ({ name: typeLabel(k), value: Number(v) }))} centerLabel="spent" format={formatRWF} />
          </ChartCard>
          <ChartCard title="By vehicle" subtitle="Running cost per vehicle" icon={<Truck className="h-4 w-4" />}>
            <BarList data={summary.byVehicle || []} format={formatRWF} color="#FF8C42" />
          </ChartCard>
        </div>
      )}

      <DataTable
        storageKey="expenses"
        rows={filtered}
        columns={columns}
        rowKey={(e) => e.id}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vehicle, driver, description…"
        initialSort={{ id: 'date', dir: 'desc' }}
        activeKey={viewId}
        onRowClick={(e) => setViewId(e.id)}
        filters={
          <>
            <FilterChip label="Type" value={type} onChange={setType} options={EXPENSE_TYPES.map(([v, l]) => ({ value: v, label: l }))} />
            <FilterChip label="Status" value={status} onChange={setStatus} options={['PENDING', 'APPROVED', 'REJECTED'].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
          </>
        }
        toolbarRight={<ExportMenu getRows={() => filtered.map((e) => ({ Number: e.expenseNumber, Date: formatDate(e.spentAt), Type: typeLabel(e.type), 'Amount (RWF)': e.amount, Liters: e.liters || '', Vehicle: e.vehicle?.plateNumber || '', Driver: e.driver?.name || '', Description: e.description || '', Status: e.status }))} filename="expenses" title="Expenses" />}
        empty={<EmptyState title="No expenses in this period" description="Add fuel, tolls or repairs with a receipt photo." action={<Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Add expense</Button>} />}
      />

      <Drawer open={Boolean(viewId)} onClose={() => setViewId(null)} title={viewing ? `${typeLabel(viewing.type)} · ${rwf(viewing.amount)}` : 'Expense'} subtitle={viewing?.expenseNumber} icon={<Receipt className="h-4 w-4" />}>
        {viewId && (
          <ExpenseDetail
            id={viewId}
            canReview={canReview}
            canDelete={user?.role === 'ADMIN' || (viewing?.status === 'PENDING' && viewing?.createdById === Number(user?.id))}
            onChanged={() => { refetch(); if (viewing?.status !== 'PENDING') setViewId(null); }}
          />
        )}
      </Drawer>

      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Add expense" icon={<Plus className="h-5 w-5" />} size="lg">
        {adding && <ExpenseForm vehicles={isDriver ? undefined : vehicles} drivers={isDriver ? undefined : drivers} onSaved={() => { setAdding(false); refetch(); }} />}
      </Modal>
    </div>
  );
}
