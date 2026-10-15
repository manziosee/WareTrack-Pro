import { useMemo, useState } from 'react';
import { RotateCcw, Plus, CalendarClock, PackageCheck, Banknote, XCircle, CheckCircle2, AlertTriangle, Undo2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import { DetailHero, DetailSection, DetailField, DetailGrid } from '@/components/ui/Detail';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import ExportMenu from '@/components/table/ExportMenu';
import api from '@/services/api';
import { useList } from '@/hooks/useList';
import { formatDate } from '@/utils/formatters';
import { statusLabel } from '@/utils/status';

const STATUSES = ['REQUESTED', 'APPROVED', 'RESCHEDULED', 'RECEIVED', 'REFUNDED', 'REJECTED'];
const rwf = (v: unknown) => `RWF ${Number(v || 0).toLocaleString()}`;

/** Next steps offered for each return state. */
function actionsFor(r: any): { status: string; label: string; icon: typeof CheckCircle2; tone: 'success' | 'primary' | 'error' | 'secondary' }[] {
  if (r.type === 'FAILED_DELIVERY') {
    if (['REQUESTED', 'APPROVED'].includes(r.status)) return [
      { status: 'RESCHEDULED', label: 'Reschedule delivery', icon: CalendarClock, tone: 'primary' },
      { status: 'REJECTED', label: 'Close', icon: XCircle, tone: 'secondary' },
    ];
    return [];
  }
  switch (r.status) {
    case 'REQUESTED': return [
      { status: 'APPROVED', label: 'Approve', icon: CheckCircle2, tone: 'success' },
      { status: 'REJECTED', label: 'Reject', icon: XCircle, tone: 'error' },
    ];
    case 'APPROVED': return [{ status: 'RECEIVED', label: 'Mark items received', icon: PackageCheck, tone: 'primary' }];
    case 'RECEIVED': return [{ status: 'REFUNDED', label: 'Refund customer', icon: Banknote, tone: 'success' }];
    default: return [];
  }
}

export default function Returns() {
  const { rows, loading, refresh } = useList<any>('returns', '/returns');
  const { rows: orders } = useList<any>('orders', '/orders');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const [reschedule, setReschedule] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ orderId: '', reason: '', notes: '' });

  const filtered = useMemo(() => rows.filter((r) => (!status || r.status === status) && (!type || r.type === type)), [rows, status, type]);
  const viewing = rows.find((r) => r.id === viewId) || null;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const update = async (r: any, next: string, extra: Record<string, unknown> = {}) => {
    const res = await api.post(`/returns/${r.id}/status`, { status: next, ...extra });
    if (res.data?.success) {
      toast.success(`${r.returnNumber}: ${statusLabel(next).toLowerCase()}`);
      refresh();
      return true;
    }
    toast.error(res.data?.error?.message || 'Could not update the return');
    return false;
  };

  const runAction = (r: any, next: string) => {
    if (next === 'RESCHEDULED') {
      setReschedule(r);
      const tomorrow = new Date(Date.now() + 86400000);
      tomorrow.setHours(10, 0, 0, 0);
      setNewDate(tomorrow.toISOString().slice(0, 16));
      return;
    }
    update(r, next);
  };

  const create = async () => {
    if (!form.orderId || !form.reason.trim()) return toast.error('Choose an order and give a reason');
    const res = await api.post('/returns', { orderId: Number(form.orderId), reason: form.reason.trim(), notes: form.notes || undefined });
    if (res.data?.success) {
      toast.success(`Return ${res.data.data.returnNumber} opened`);
      setShowCreate(false);
      setForm({ orderId: '', reason: '', notes: '' });
      refresh();
    } else toast.error(res.data?.error?.message || 'Could not open the return');
  };

  const columns: Column<any>[] = [
    {
      id: 'number', header: 'Return', required: true, accessor: (r) => r.returnNumber,
      cell: (r) => (
        <div>
          <p className="font-semibold text-gray-900">{r.returnNumber}</p>
          <p className="text-xs text-gray-500">{formatDate(r.createdAt)}</p>
        </div>
      ),
    },
    { id: 'type', header: 'Type', accessor: (r) => r.type, cell: (r) => <StatusBadge status={r.type} /> },
    { id: 'order', header: 'Order', accessor: (r) => r.order?.orderNumber, cell: (r) => <div><p className="font-medium text-gray-800">{r.order?.orderNumber}</p><p className="text-xs text-gray-500">{r.order?.customerName}</p></div> },
    { id: 'reason', header: 'Reason', accessor: (r) => r.reason, cell: (r) => <span className="block max-w-[14rem] truncate text-gray-700">{r.reason}</span> },
    { id: 'status', header: 'Status', accessor: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    { id: 'refund', header: 'Refund', align: 'right', accessor: (r) => Number(r.refundAmount || 0), cell: (r) => (r.type === 'RETURN' ? rwf(r.refundAmount) : '—') },
    { id: 'rescheduled', header: 'New date', defaultHidden: true, accessor: (r) => (r.rescheduledDate ? new Date(r.rescheduledDate) : null), cell: (r) => (r.rescheduledDate ? formatDate(r.rescheduledDate) : '—') },
  ];

  const open = rows.filter((r) => ['REQUESTED', 'APPROVED'].includes(r.status));
  const refunded = rows.filter((r) => r.status === 'REFUNDED').reduce((s, r) => s + Number(r.refundAmount || 0), 0);

  return (
    <div>
      <PageHeader
        title="Returns"
        subtitle="Failed deliveries to reschedule and customer returns to process"
        breadcrumbs={[{ label: 'Operations' }]}
        icon={<RotateCcw className="h-5 w-5" />}
        actions={
          <>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-4 w-4" /> New return</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Need action" value={open.length} icon={<AlertTriangle className="h-5 w-5" />} tone={open.length ? 'accent' : 'success'} />
        <StatCard label="Failed deliveries" value={rows.filter((r) => r.type === 'FAILED_DELIVERY').length} icon={<XCircle className="h-5 w-5" />} tone="error" />
        <StatCard label="Customer returns" value={rows.filter((r) => r.type === 'RETURN').length} icon={<Undo2 className="h-5 w-5" />} />
        <StatCard label="Refunded" value={refunded} prefix="RWF " compact icon={<Banknote className="h-5 w-5" />} tone="success" />
      </div>

      <DataTable
        storageKey="returns"
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search return, order, customer, reason…"
        initialSort={{ id: 'number', dir: 'desc' }}
        activeKey={viewId}
        onRowClick={(r) => setViewId(r.id)}
        filters={
          <>
            <FilterChip label="Status" value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
            <FilterChip label="Type" value={type} onChange={setType} options={[{ value: 'FAILED_DELIVERY', label: 'Failed delivery' }, { value: 'RETURN', label: 'Customer return' }]} />
          </>
        }
        toolbarRight={<ExportMenu getRows={() => filtered.map((r) => ({ Return: r.returnNumber, Type: r.type, Order: r.order?.orderNumber, Customer: r.order?.customerName, Reason: r.reason, Status: r.status, 'Refund Amount': Number(r.refundAmount || 0) }))} filename="returns" title="Returns" />}
        rowActions={(r) => (
          <>
            {actionsFor(r).slice(0, 1).map((a) => (
              <button key={a.status} onClick={() => runAction(r, a.status)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary-500 px-2.5 text-xs font-semibold text-white hover:bg-primary-600"><a.icon className="h-3.5 w-3.5" /> {a.label}</button>
            ))}
          </>
        )}
        empty={!rows.length ? <EmptyState title="No returns" description="Failed deliveries and customer returns will show up here." /> : undefined}
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewId(null)}
        title={viewing?.returnNumber || ''}
        subtitle={viewing?.order?.orderNumber}
        icon={<RotateCcw className="h-4 w-4" />}
        footer={viewing ? actionsFor(viewing).map((a) => (
          <Button key={a.status} size="sm" variant={a.tone === 'secondary' ? 'secondary' : a.tone === 'error' ? 'error' : a.tone === 'success' ? 'success' : 'primary'} onClick={() => runAction(viewing, a.status)}>
            <a.icon className="mr-1.5 h-4 w-4" /> {a.label}
          </Button>
        )) : undefined}
      >
        {viewing && (
          <div className="space-y-5">
            <DetailHero avatar={<RotateCcw className="h-6 w-6" />} title={viewing.returnNumber} subtitle={`${statusLabel(viewing.type)} · ${viewing.order?.customerName}`} badges={<StatusBadge status={viewing.status} size="md" />} />
            <DetailSection title="Details" icon={<AlertTriangle className="h-4 w-4" />}>
              <DetailGrid>
                <DetailField label="Order">{viewing.order?.orderNumber}</DetailField>
                <DetailField label="Order value">{rwf(viewing.order?.totalAmount)}</DetailField>
                <DetailField label="Reason" className="sm:col-span-2">{viewing.reason}</DetailField>
                <DetailField label="Customer phone">{viewing.order?.contactNumber ? <a href={`tel:${viewing.order.contactNumber}`} className="text-primary-600 hover:underline">{viewing.order.contactNumber}</a> : '—'}</DetailField>
                <DetailField label="Refund">{viewing.type === 'RETURN' ? rwf(viewing.refundAmount) : '—'}</DetailField>
                {viewing.rescheduledDate && <DetailField label="Rescheduled to">{formatDate(viewing.rescheduledDate)}</DetailField>}
                {viewing.notes && <DetailField label="Notes" className="sm:col-span-2">{viewing.notes}</DetailField>}
              </DetailGrid>
            </DetailSection>
            <ActivityTimeline entityType="ReturnRequest" entityId={viewing.id} />
          </div>
        )}
      </Drawer>

      <Modal isOpen={Boolean(reschedule)} onClose={() => setReschedule(null)} title="Reschedule delivery" subtitle={reschedule?.order?.orderNumber} icon={<CalendarClock className="h-5 w-5" />} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">The order goes back to <b>Pending</b> with the new time slot, ready to be dispatched again.</p>
          <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setReschedule(null)}>Cancel</Button>
            <Button size="sm" onClick={async () => { if (await update(reschedule, 'RESCHEDULED', { rescheduledDate: new Date(newDate).toISOString() })) setReschedule(null); }}>Reschedule</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New customer return" icon={<Plus className="h-5 w-5" />} size="sm">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Delivered order</span>
            <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm">
              <option value="">Choose an order…</option>
              {deliveredOrders.slice(0, 200).map((o) => <option key={o.id} value={o.id}>{o.orderNumber} · {o.customerName}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Reason</span>
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm">
              <option value="">Choose a reason…</option>
              {['Damaged packaging', 'Wrong item delivered', 'Expired product', 'Quantity mismatch', 'Customer changed mind'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Notes (optional)</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={create}>Open return</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
