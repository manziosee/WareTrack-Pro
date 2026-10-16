import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Clock, UserCheck, Package, Truck, CheckCircle2, AlertTriangle, MapPin, Phone, Edit, Zap, Search, RefreshCw, Navigation, ExternalLink, Radar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonStatCards } from '@/components/ui/Skeleton';
import UpdateOrderStatusForm from '@/components/forms/UpdateOrderStatusForm';
import DispatchForm from '@/components/forms/DispatchForm';
import api from '@/services/api';
import { useList } from '@/hooks/useList';
import { refreshOperations, stageOf, isToday, type DeliveryStage } from '@/utils/operations';
import { formatDateTime } from '@/utils/formatters';

const STEPS: { stage: DeliveryStage; label: string; icon: typeof Clock }[] = [
  { stage: 'WAITING', label: 'Placed', icon: Clock },
  { stage: 'ASSIGNED', label: 'Driver assigned', icon: UserCheck },
  { stage: 'DISPATCHED', label: 'Dispatched', icon: Package },
  { stage: 'IN_TRANSIT', label: 'On the way', icon: Truck },
  { stage: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

type Filter = 'active' | 'WAITING' | 'ASSIGNED' | 'ROAD' | 'DELIVERED' | 'PROBLEM';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'All active' },
  { key: 'WAITING', label: 'Waiting for driver' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'ROAD', label: 'On the road' },
  { key: 'DELIVERED', label: 'Delivered today' },
  { key: 'PROBLEM', label: 'Problems' },
];

function matches(order: any, filter: Filter) {
  const stage = stageOf(order);
  switch (filter) {
    case 'active': return ['WAITING', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT'].includes(stage);
    case 'ROAD': return stage === 'DISPATCHED' || stage === 'IN_TRANSIT';
    case 'DELIVERED': return stage === 'DELIVERED' && isToday(order.deliveredAt || order.updatedAt);
    case 'PROBLEM': return stage === 'PROBLEM' && Date.now() - new Date(order.updatedAt).getTime() < 7 * 86400000;
    default: return stage === filter;
  }
}

function Stepper({ stage }: { stage: DeliveryStage }) {
  const index = STEPS.findIndex((s) => s.stage === stage);
  return (
    <ol className="grid grid-cols-5 gap-1">
      {STEPS.map((step, i) => {
        const done = index >= 0 && i <= index;
        const current = i === index;
        return (
          <li key={step.stage} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${i <= index ? 'bg-primary-400' : 'bg-gray-200'}`} />}
            <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition ${done ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'} ${current ? 'ring-4 ring-primary-100' : ''}`}>
              <step.icon className="h-4 w-4" />
            </span>
            <span className={`mt-1.5 text-[11px] font-medium leading-tight ${done ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Tracking() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { rows, loading, refresh } = useList<any>('orders', '/orders');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<any>(null);
  const [assigning, setAssigning] = useState<any>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // /tracking?order=123 (from Dispatch, Orders or a notification): show and highlight that order
  useEffect(() => {
    const id = Number(params.get('order'));
    if (!id) return;
    setFocusId(id);
    setParams({}, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (!focusId || !rows.length) return;
    const order = rows.find((o) => o.id === focusId);
    if (order && !matches(order, filter)) {
      const stage = stageOf(order);
      setFilter(stage === 'PROBLEM' ? 'PROBLEM' : stage === 'DELIVERED' ? 'DELIVERED' : 'active');
    }
    const t = setTimeout(() => cardRefs.current[focusId]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    const clear = setTimeout(() => setFocusId(null), 4000);
    return () => { clearTimeout(t); clearTimeout(clear); };
  }, [focusId, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter((o) => matches(o, f.key)).length])), [rows]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((o) => matches(o, filter))
      .filter((o) => !q || [o.orderNumber, o.customerName, o.deliveryAddress, o.driver?.name, o.vehicle?.plateNumber].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => {
        const rank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1) || new Date(a.timeSlotStart || a.scheduledDate || a.createdAt).getTime() - new Date(b.timeSlotStart || b.scheduledDate || b.createdAt).getTime();
      });
  }, [rows, filter, search]);

  const autoDispatch = async (order: any) => {
    setBusyId(order.id);
    try {
      const res = await api.post(`/auto-dispatch/${order.id}`, {});
      if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Could not auto-dispatch');
      const d = res.data?.data;
      toast.success(`${order.orderNumber} dispatched to ${d?.driver?.name || 'a driver'}${d?.vehicle?.plateNumber ? ` (${d.vehicle.plateNumber})` : ''}`);
      refreshOperations(queryClient);
    } catch (error: any) {
      toast.error(error.message, { duration: 6000 });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tracking"
        subtitle="Follow every order from placement to delivery"
        breadcrumbs={[{ label: 'Operations' }]}
        icon={<Radar className="h-5 w-5" />}
        actions={
          <>
            <Link to="/dispatch" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"><Truck className="h-4 w-4" /> Dispatch</Link>
            <Link to="/map" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"><Navigation className="h-4 w-4" /> Live map</Link>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
          </>
        }
      />

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <button className="text-left" onClick={() => setFilter('WAITING')}><StatCard label="Waiting for a driver" value={counts.WAITING || 0} icon={<Clock className="h-5 w-5" />} tone="warning" /></button>
          <button className="text-left" onClick={() => setFilter('ASSIGNED')}><StatCard label="Assigned, not left" value={counts.ASSIGNED || 0} icon={<UserCheck className="h-5 w-5" />} tone="accent" /></button>
          <button className="text-left" onClick={() => setFilter('ROAD')}><StatCard label="On the road" value={counts.ROAD || 0} icon={<Truck className="h-5 w-5" />} tone="info" /></button>
          <button className="text-left" onClick={() => setFilter('DELIVERED')}><StatCard label="Delivered today" value={counts.DELIVERED || 0} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" /></button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 text-xs font-medium">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 transition ${filter === f.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {f.label} <span className="ml-0.5 text-gray-400">{counts[f.key] || 0}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer, driver…" className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100" />
        </div>
      </div>

      {!loading && !shown.length ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-soft">
          <EmptyState variant="delivery" title={search ? 'No matching orders' : 'Nothing here right now'} description={filter === 'active' ? 'Every order is delivered or closed.' : undefined} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {shown.map((order) => {
            const stage = stageOf(order);
            const dispatch = order.dispatches?.[0];
            const open = ['WAITING', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT'].includes(stage);
            return (
              <div
                key={order.id}
                ref={(el) => { cardRefs.current[order.id] = el; }}
                className={`rounded-2xl border bg-white p-4 shadow-soft transition ${focusId === order.id ? 'border-primary-300 ring-4 ring-primary-100' : 'border-gray-100'}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/orders/${order.id}`} className="font-mono text-sm font-bold text-primary-700 hover:underline">{order.orderNumber}</Link>
                      <StatusBadge status={order.priority} />
                      {stage === 'PROBLEM' && <StatusBadge status={order.status} />}
                      {stage === 'CANCELLED' && <StatusBadge status="CANCELLED" />}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-900">{order.customerName}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-gray-500"><MapPin className="h-3 w-3 shrink-0" />{order.deliveryAddress}</p>
                    {order.contactNumber && <a href={`tel:${order.contactNumber}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600"><Phone className="h-3 w-3" />{order.contactNumber}</a>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-gray-500">
                    <p>{order.timeSlotStart ? 'Delivery window' : 'Created'}</p>
                    <p className="font-medium text-gray-800">{formatDateTime(order.timeSlotStart || order.createdAt)}</p>
                  </div>
                </div>

                {stage === 'PROBLEM' ? (
                  <div className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{order.status === 'FAILED' ? `Delivery failed${order.failureReason ? `: ${order.failureReason}` : ''}. See Returns to reschedule.` : 'Order returned.'}</span>
                  </div>
                ) : stage !== 'CANCELLED' ? <Stepper stage={stage} /> : null}

                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 pt-3 text-xs sm:grid-cols-4">
                  <div><p className="text-gray-500">Items</p><p className="font-medium text-gray-900">{order.items?.length || 0}</p></div>
                  <div><p className="text-gray-500">Amount</p><p className="font-medium text-gray-900">RWF {Number(order.totalAmount || 0).toLocaleString()}</p></div>
                  <div className="min-w-0"><p className="text-gray-500">Driver</p>{order.driver ? <Link to={`/drivers?view=${order.driver.id}`} className="block truncate font-medium text-gray-900 hover:underline">{order.driver.name}</Link> : <p className="font-medium text-warning-600">Not assigned</p>}</div>
                  <div><p className="text-gray-500">Vehicle</p>{order.vehicle ? <Link to={`/vehicles?view=${order.vehicle.id}`} className="font-medium text-gray-900 hover:underline">{order.vehicle.plateNumber}</Link> : <p className="text-gray-400">—</p>}</div>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {stage === 'WAITING' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setAssigning(order)}><UserCheck className="mr-1.5 h-4 w-4" /> Assign driver</Button>
                      <Button size="sm" onClick={() => autoDispatch(order)} disabled={busyId === order.id}><Zap className="mr-1.5 h-4 w-4" /> {busyId === order.id ? 'Dispatching…' : 'Auto-dispatch'}</Button>
                    </>
                  )}
                  {dispatch && (
                    <Link to={`/dispatch?view=${dispatch.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"><ExternalLink className="h-3.5 w-3.5" /> View dispatch</Link>
                  )}
                  {open && stage !== 'WAITING' && (
                    <Button size="sm" variant="secondary" onClick={() => setUpdating(order)}><Edit className="mr-1.5 h-4 w-4" /> Update status</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={Boolean(updating)} onClose={() => setUpdating(null)} title="Update order status" subtitle={updating?.orderNumber} icon={<Edit className="h-5 w-5" />}>
        {updating && <UpdateOrderStatusForm orderId={String(updating.id)} currentStatus={updating.status} onClose={() => setUpdating(null)} />}
      </Modal>
      <Modal isOpen={Boolean(assigning)} onClose={() => setAssigning(null)} title="Assign driver" subtitle={assigning?.orderNumber} icon={<UserCheck className="h-5 w-5" />} size="lg">
        {assigning && <DispatchForm initialOrderId={assigning.id} onClose={() => setAssigning(null)} />}
      </Modal>
    </div>
  );
}
