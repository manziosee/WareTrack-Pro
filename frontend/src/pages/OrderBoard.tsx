import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KanbanSquare, List, Clock, User, GripVertical, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import FilterChip from '@/components/table/FilterChip';
import { Skeleton } from '@/components/ui/Skeleton';
import { useList } from '@/hooks/useList';
import { ordersService } from '@/services/ordersService';
import { statusLabel, statusHex } from '@/utils/status';

const COLUMNS = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'] as const;
const DAY = 86400000;

const slot = (o: any) => {
  const start = o.timeSlotStart || o.scheduledDate;
  if (!start) return null;
  const d = new Date(start);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

/** Kanban view of orders: drag a card to move it to the next stage. */
export default function OrderBoard() {
  const { rows, loading, setRows, refresh } = useList<any>('orders', '/orders');
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');

  const columns = useMemo(() => {
    const recent = Date.now() - 7 * DAY;
    const q = search.trim().toLowerCase();
    return COLUMNS.map((status) => ({
      status,
      orders: rows
        .filter((o) => o.status === status)
        // Finished columns only show the last week
        .filter((o) => !['DELIVERED', 'FAILED'].includes(status) || new Date(o.updatedAt || o.createdAt).getTime() >= recent)
        .filter((o) => !priority || o.priority === priority)
        .filter((o) => !q || `${o.orderNumber} ${o.customerName} ${o.driver?.name || ''}`.toLowerCase().includes(q))
        .sort((a, b) => ['HIGH', 'MEDIUM', 'LOW'].indexOf(a.priority) - ['HIGH', 'MEDIUM', 'LOW'].indexOf(b.priority) || new Date(a.timeSlotStart || a.createdAt).getTime() - new Date(b.timeSlotStart || b.createdAt).getTime()),
    }));
  }, [rows, priority, search]);

  const move = async (orderId: number, status: string) => {
    const order = rows.find((o) => o.id === orderId);
    if (!order || order.status === status) return;
    if (['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(status) && !order.driverId && !order.driver) {
      toast.error('Assign a driver first: use Dispatch or Auto-dispatch for this order.');
      return;
    }
    const previous = order.status;
    setRows((list) => list.map((o) => (o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o)));
    const res = await ordersService.updateOrderStatus(orderId, { status }).catch(() => ({ success: false }));
    if (res?.success === false) {
      setRows((list) => list.map((o) => (o.id === orderId ? { ...o, status: previous } : o)));
      toast.error(`Couldn't move ${order.orderNumber}`);
    } else {
      toast.success(`${order.orderNumber} → ${statusLabel(status)}`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Order Board"
        subtitle="Drag orders between stages. Finished columns show the last 7 days."
        breadcrumbs={[{ label: 'Orders', to: '/orders' }]}
        icon={<KanbanSquare className="h-5 w-5" />}
        actions={
          <>
            <Link to="/orders" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"><List className="h-4 w-4" /> List view</Link>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order, customer, driver…"
          className="h-9 w-64 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
        />
        <FilterChip label="Priority" value={priority} onChange={setPriority} options={['HIGH', 'MEDIUM', 'LOW'].map((p) => ({ value: p, label: statusLabel(p) }))} />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <section
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col.status);
            }}
            onDragLeave={() => setOver((s) => (s === col.status ? null : s))}
            onDrop={() => {
              if (dragId) move(dragId, col.status);
              setDragId(null);
              setOver(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-gray-100/70 transition ${over === col.status ? 'border-accent-300 bg-accent-50/60 ring-2 ring-accent-200' : 'border-transparent'}`}
          >
            <header className="flex items-center justify-between px-3 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusHex(col.status) }} />
                {statusLabel(col.status)}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 shadow-sm">{col.orders.length}</span>
            </header>
            <div className="flex max-h-[70vh] min-h-[8rem] flex-col gap-2.5 overflow-y-auto px-2.5 pb-3">
              {loading &&
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              {!loading && col.orders.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 py-6 text-center text-xs text-gray-400">Drop orders here</p>
              )}
              {col.orders.slice(0, 60).map((o) => (
                <article
                  key={o.id}
                  draggable
                  onDragStart={() => setDragId(o.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`group cursor-grab rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft active:cursor-grabbing ${dragId === o.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/orders?view=${o.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600">{o.orderNumber}</Link>
                    <GripVertical className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-400" />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{o.customerName}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={o.priority} />
                    <span className="text-xs font-semibold text-gray-700">RWF {Number(o.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-50 pt-2 text-[11px] text-gray-500">
                    <span className="flex min-w-0 items-center gap-1"><User className="h-3 w-3 shrink-0" /><span className="truncate">{o.driver?.name || 'Unassigned'}</span></span>
                    {slot(o) && <span className="flex shrink-0 items-center gap-1"><Clock className="h-3 w-3" />{slot(o)}</span>}
                  </div>
                </article>
              ))}
              {col.orders.length > 60 && <p className="text-center text-xs text-gray-400">+{col.orders.length - 60} more in the list view</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
