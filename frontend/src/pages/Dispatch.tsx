import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Edit, Trash2, Truck, Package, MapPin, User, Clock, CalendarClock, StickyNote, Navigation, CheckCircle2, CalendarDays, RefreshCw, Radar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import { DetailHero, DetailSection, DetailField, DetailGrid, DetailStat } from '@/components/ui/Detail';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import SavedFilters from '@/components/table/SavedFilters';
import ExportMenu from '@/components/table/ExportMenu';
import DispatchForm from '@/components/forms/DispatchForm';
import { dispatchService } from '@/services/dispatchService';
import { useList } from '@/hooks/useList';
import { undoableAction } from '@/utils/undoableAction';
import { formatDate } from '@/utils/formatters';
import { statusLabel } from '@/utils/status';
import { refreshOperations, stageOf, isToday } from '@/utils/operations';

const STATUSES = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

const timeRange = (start?: string, end?: string) => {
  if (!start) return '—';
  const f = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${formatDate(start)} · ${f(start)}${end ? `–${f(end)}` : ''}`;
};

function DispatchContent() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { rows, loading, setRows } = useList<any>('dispatches', '/dispatch');
  const { rows: orders } = useList<any>('orders', '/orders');
  const refresh = () => refreshOperations(queryClient);
  const [newForOrder, setNewForOrder] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [driver, setDriver] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  // /dispatch?view=ID (from Tracking) opens that dispatch; /dispatch?order=ID starts one for that order
  useEffect(() => {
    const view = Number(params.get('view'));
    const order = Number(params.get('order'));
    if (view) setViewId(view);
    if (order) { setNewForOrder(order); setShowCreate(true); }
    if (view || order) setParams({}, { replace: true });
  }, [params, setParams]);

  const waiting = useMemo(() => orders.filter((o) => stageOf(o) === 'WAITING'), [orders]);

  const drivers = useMemo(() => Array.from(new Set(rows.map((d) => d.driver?.name).filter(Boolean))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((d) => (!status || d.status === status) && (!driver || d.driver?.name === driver)), [rows, status, driver]);
  const viewing = rows.find((d) => d.id === viewId) || null;

  const today = new Date().toDateString();
  const stats = {
    today: rows.filter((d) => new Date(d.scheduledDate).toDateString() === today).length,
    active: rows.filter((d) => ['DISPATCHED', 'IN_TRANSIT'].includes(d.status)).length,
    delivered: rows.filter((d) => d.status === 'DELIVERED' && isToday(d.actualDelivery || d.updatedAt)).length,
    pending: rows.filter((d) => d.status === 'PENDING').length,
  };

  const onSaved = () => {
    setShowCreate(false);
    setNewForOrder(null);
    setEditing(null);
    refresh();
  };

  const changeStatus = async (targets: any[], next: string) => {
    const ids = new Set(targets.map((d) => d.id));
    setRows((list) => list.map((d) => (ids.has(d.id) ? { ...d, status: next } : d)));
    const results = await Promise.all(targets.map((d) => dispatchService.updateDispatchStatus(d.id, next).catch(() => ({ success: false }))));
    const failed = results.filter((r: any) => r?.success === false).length;
    if (failed) toast.error(`${failed} dispatch${failed === 1 ? '' : 'es'} could not be updated`);
    else toast.success(next === 'CANCELLED' ? 'Assignment cancelled: the order is back to waiting for a driver' : `Marked ${statusLabel(next).toLowerCase()}. The order, driver and vehicle are updated too.`);
    refresh();
  };

  const removeDispatches = (targets: any[]) => {
    const ids = new Set(targets.map((d) => d.id));
    const snapshot = rows;
    undoableAction({
      message: targets.length === 1 ? `Dispatch for ${targets[0].order?.orderNumber || `#${targets[0].id}`} deleted` : `${targets.length} dispatches deleted`,
      apply: () => {
        setRows((list) => list.filter((d) => !ids.has(d.id)));
        if (viewId && ids.has(viewId)) setViewId(null);
      },
      revert: () => setRows(() => snapshot),
      commit: async () => {
        for (const d of targets) {
          const res = await dispatchService.deleteDispatch(d.id);
          if (res?.success === false) throw new Error(res?.error?.message || 'Could not delete the dispatch');
        }
        refresh();
      },
    });
  };

  const columns: Column<any>[] = [
    {
      id: 'order', header: 'Order', required: true, accessor: (d) => d.order?.orderNumber || '',
      cell: (d) => (
        <div>
          <p className="font-semibold text-gray-900">{d.order?.orderNumber || `#${d.id}`}</p>
          <p className="max-w-[14rem] truncate text-xs text-gray-500">{d.order?.customerName}</p>
        </div>
      ),
    },
    { id: 'status', header: 'Status', accessor: (d) => d.status, cell: (d) => <StatusBadge status={d.status} /> },
    { id: 'driver', header: 'Driver', accessor: (d) => d.driver?.name || '', cell: (d) => <span className="text-gray-700">{d.driver?.name || '—'}</span> },
    { id: 'vehicle', header: 'Vehicle', accessor: (d) => d.vehicle?.plateNumber || '', cell: (d) => <span className="text-gray-700">{d.vehicle?.plateNumber || '—'}</span> },
    { id: 'scheduled', header: 'Scheduled', accessor: (d) => new Date(d.scheduledDate), cell: (d) => <span className="text-gray-600">{timeRange(d.scheduledDate, d.estimatedDelivery)}</span> },
    { id: 'area', header: 'Destination', accessor: (d) => d.order?.deliveryAddress || '', cell: (d) => <span className="block max-w-[14rem] truncate text-gray-600">{d.order?.deliveryAddress || '—'}</span> },
    { id: 'fuel', header: 'Fuel allowance', align: 'right', defaultHidden: true, accessor: (d) => Number(d.fuelAllowance || 0), cell: (d) => `RWF ${Number(d.fuelAllowance || 0).toLocaleString()}` },
  ];

  return (
    <div>
      <PageHeader
        title="Dispatch"
        subtitle="Assign drivers and vehicles, and follow each delivery"
        breadcrumbs={[{ label: 'Operations' }]}
        icon={<Truck className="h-5 w-5" />}
        actions={
          <>
            <Link to="/calendar" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"><CalendarDays className="h-4 w-4" /> Calendar</Link>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-4 w-4" /> New dispatch</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Scheduled today" value={stats.today} icon={<CalendarClock className="h-5 w-5" />} tone="accent" />
        <StatCard label="On the road" value={stats.active} icon={<Navigation className="h-5 w-5" />} tone="info" />
        <StatCard label="Delivered today" value={stats.delivered} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Assigned, not left" value={stats.pending} icon={<Clock className="h-5 w-5" />} />
      </div>

      {waiting.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <b>{waiting.length}</b> {waiting.length === 1 ? 'order is' : 'orders are'} waiting for a driver
            <span className="hidden text-warning-700 sm:inline">({waiting.slice(0, 3).map((o) => o.orderNumber).join(', ')}{waiting.length > 3 ? '…' : ''})</span>
          </span>
          <span className="flex gap-2">
            <Link to="/tracking" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-warning-300 bg-white px-3 text-xs font-semibold text-warning-800 hover:bg-warning-100"><Radar className="h-3.5 w-3.5" /> See in Tracking</Link>
            <Button size="sm" onClick={() => { setNewForOrder(waiting[0].id); setShowCreate(true); }}><Plus className="mr-1 h-4 w-4" /> Assign {waiting[0].orderNumber}</Button>
          </span>
        </div>
      )}

      <DataTable
        storageKey="dispatch"
        rows={filtered}
        columns={columns}
        rowKey={(d) => d.id}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search order, driver, plate, address…"
        initialSort={{ id: 'scheduled', dir: 'desc' }}
        activeKey={viewId}
        onRowClick={(d) => setViewId(d.id)}
        filters={
          <>
            <FilterChip label="Status" value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
            <FilterChip label="Driver" value={driver} onChange={setDriver} options={drivers.map((n) => ({ value: n as string, label: n as string }))} />
          </>
        }
        toolbarRight={
          <>
            <SavedFilters page="dispatch" current={{ search, status, driver }} onApply={(f) => { setSearch(f.search || ''); setStatus(f.status || ''); setDriver(f.driver || ''); }} />
            <ExportMenu
              getRows={() => filtered.map((d) => ({ Order: d.order?.orderNumber || d.id, Customer: d.order?.customerName || '', Status: d.status, Driver: d.driver?.name || '', Vehicle: d.vehicle?.plateNumber || '', Scheduled: formatDate(d.scheduledDate) }))}
              filename="dispatches"
              title="Dispatch Report"
            />
          </>
        }
        rowActions={(d) => (
          <>
            <button onClick={() => setViewId(d.id)} className="action-btn action-btn-view" title="View"><Eye className="h-4 w-4" /></button>
            <Link to={`/tracking?order=${d.orderId}`} onClick={(e) => e.stopPropagation()} className="action-btn action-btn-view" title="Track order"><Radar className="h-4 w-4" /></Link>
            <button onClick={() => setEditing(d)} className="action-btn action-btn-edit" title="Edit"><Edit className="h-4 w-4" /></button>
            <button onClick={() => removeDispatches([d])} className="action-btn action-btn-delete" title="Delete"><Trash2 className="h-4 w-4" /></button>
          </>
        )}
        bulkActions={(selected, clear) => (
          <>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) changeStatus(selected, e.target.value).then(clear);
                e.target.value = '';
              }}
              className="h-8 rounded-lg border border-accent-200 bg-white px-2 text-xs font-medium text-gray-700"
            >
              <option value="" disabled>Change status…</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s === 'CANCELLED' ? 'Cancel assignment' : statusLabel(s)}</option>)}
            </select>
            <button onClick={() => { removeDispatches(selected); clear(); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-error-500 px-2.5 text-xs font-semibold text-white hover:bg-error-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </>
        )}
        empty={!rows.length ? <EmptyState variant="delivery" title="Nothing dispatched yet" description="Assign a driver and vehicle to a pending order to get it moving." action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-4 w-4" /> New dispatch</Button>} /> : undefined}
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewId(null)}
        title={viewing?.order?.orderNumber || 'Dispatch'}
        subtitle={viewing?.order?.customerName}
        icon={<Truck className="h-4 w-4" />}
        width="xl"
        footer={viewing ? (
          <>
            <select value="" onChange={(e) => e.target.value && changeStatus([viewing], e.target.value)} className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700">
              <option value="">Change status…</option>
              {STATUSES.filter((s) => s !== viewing.status).map((s) => <option key={s} value={s}>{s === 'CANCELLED' ? 'Cancel assignment' : statusLabel(s)}</option>)}
            </select>
            <Link to={`/tracking?order=${viewing.orderId}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"><Radar className="h-4 w-4" /> Track</Link>
            <Button variant="secondary" size="sm" onClick={() => setEditing(viewing)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
          </>
        ) : undefined}
      >
        {viewing && (
          <div className="space-y-5">
            <DetailHero avatar={<Package className="h-6 w-6" />} title={viewing.order?.orderNumber || 'Dispatch'} subtitle={viewing.order?.customerName} badges={<StatusBadge status={viewing.status} size="md" />} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailStat label="Scheduled" value={<span className="text-base">{timeRange(viewing.scheduledDate)}</span>} icon={<CalendarClock className="h-4 w-4" />} />
              <DetailStat label="Expected delivery" value={<span className="text-base">{viewing.estimatedDelivery ? timeRange(viewing.estimatedDelivery) : '—'}</span>} icon={<Clock className="h-4 w-4" />} tone="accent" />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <DetailSection title="Order" icon={<Package className="h-4 w-4" />}>
                <DetailGrid>
                  <DetailField label="Customer">{viewing.order?.customerName || '—'}</DetailField>
                  <DetailField label="Order">{viewing.order ? <Link to={`/orders/${viewing.orderId}`} className="text-primary-700 hover:underline">{viewing.order.orderNumber}</Link> : '—'}</DetailField>
                  <DetailField label="Address" className="sm:col-span-2">
                    <span className="inline-flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />{viewing.order?.deliveryAddress || '—'}</span>
                  </DetailField>
                </DetailGrid>
              </DetailSection>
              <DetailSection title="Assignment" icon={<User className="h-4 w-4" />}>
                <DetailGrid>
                  <DetailField label="Driver">
                    {viewing.driver ? <Link to={`/drivers?view=${viewing.driverId}`} className="hover:underline">{viewing.driver.name}</Link> : '—'}
                    {viewing.driver?.phone && <a href={`tel:${viewing.driver.phone}`} className="block text-xs font-normal text-primary-600 hover:underline">{viewing.driver.phone}</a>}
                  </DetailField>
                  <DetailField label="Vehicle">
                    {viewing.vehicle ? <Link to={`/vehicles?view=${viewing.vehicleId}`} className="hover:underline">{viewing.vehicle.plateNumber}</Link> : '—'}
                    {viewing.vehicle && <span className="block text-xs font-normal text-gray-500">{viewing.vehicle.type} · {viewing.vehicle.capacity}kg</span>}
                  </DetailField>
                  <DetailField label="Route" className="sm:col-span-2">{viewing.route || '—'}</DetailField>
                </DetailGrid>
              </DetailSection>
            </div>
            {viewing.notes && (
              <DetailSection title="Notes" icon={<StickyNote className="h-4 w-4" />}>
                <p className="rounded-xl border-l-4 border-accent-500 bg-white p-4 text-sm text-gray-700">{viewing.notes}</p>
              </DetailSection>
            )}
            <ActivityTimeline entityType="Dispatch" entityId={viewing.id} />
          </div>
        )}
      </Drawer>

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setNewForOrder(null); }} title="New dispatch" subtitle="Pick an order, a driver and a vehicle" icon={<Plus className="h-5 w-5" />} size="lg">
        {showCreate && <DispatchForm key={newForOrder || 'new'} initialOrderId={newForOrder || undefined} onClose={() => { setShowCreate(false); setNewForOrder(null); }} onSave={onSaved} />}
      </Modal>
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit dispatch" icon={<Edit className="h-5 w-5" />} size="lg">
        {editing && <DispatchForm dispatch={editing} onClose={() => setEditing(null)} onSave={onSaved} />}
      </Modal>
    </div>
  );
}

export default function Dispatch() {
  return (
    <ErrorBoundary>
      <DispatchContent />
    </ErrorBoundary>
  );
}
