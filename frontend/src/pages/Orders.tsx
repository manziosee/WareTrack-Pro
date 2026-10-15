import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Receipt, ShoppingCart, Clock, CheckCircle2, Wallet, KanbanSquare as Board, RefreshCw, Zap, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import SavedFilters from '@/components/table/SavedFilters';
import ExportMenu from '@/components/table/ExportMenu';
import CreateOrderForm from '@/components/forms/CreateOrderForm';
import EditOrderForm from '@/components/forms/EditOrderForm';
import ViewOrderModal from '@/components/forms/ViewOrderModal';
import { ordersService } from '@/services/ordersService';
import { useList } from '@/hooks/useList';
import { undoableAction } from '@/utils/undoableAction';
import { formatDate } from '@/utils/formatters';
import { statusLabel } from '@/utils/status';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { printInvoice } from '@/utils/invoice';

const STATUSES = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'];
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
const PAYMENT = ['PAID', 'UNPAID', 'REFUNDED'];
const opts = (values: string[]) => values.map((v) => ({ value: v, label: statusLabel(v) }));
const rwf = (v: unknown) => `RWF ${Number(v || 0).toLocaleString()}`;

export default function Orders() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'].includes(user?.role || '');
  const [params, setParams] = useSearchParams();
  const { rows, loading, setRows, refresh } = useList<any>('orders', '/orders');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [payment, setPayment] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  // Deep links from the command palette: ?new=1 and ?view=<id>
  useEffect(() => {
    if (params.get('new') === '1') setShowCreate(true);
    const view = Number(params.get('view'));
    if (view) setViewId(view);
    if (params.get('new') || params.get('view')) setParams({}, { replace: true });
  }, [params, setParams]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (o) =>
          (!status || o.status === status) &&
          (!priority || o.priority === priority) &&
          (!payment || (o.paymentStatus || 'UNPAID') === payment)
      ),
    [rows, status, priority, payment]
  );

  const viewing = rows.find((o) => o.id === viewId) || null;

  const stats = useMemo(() => {
    const open = rows.filter((o) => ['PENDING', 'DISPATCHED', 'IN_TRANSIT'].includes(o.status)).length;
    const delivered = rows.filter((o) => o.status === 'DELIVERED');
    const unpaid = rows.filter((o) => (o.paymentStatus || 'UNPAID') === 'UNPAID' && o.status !== 'CANCELLED');
    return {
      total: rows.length,
      open,
      delivered: delivered.length,
      unpaidValue: unpaid.reduce((s, o) => s + Number(o.totalAmount || 0), 0),
    };
  }, [rows]);

  const removeOrders = (targets: any[]) => {
    const ids = new Set(targets.map((o) => o.id));
    const snapshot = rows;
    undoableAction({
      message: targets.length === 1 ? `Order ${targets[0].orderNumber} deleted` : `${targets.length} orders deleted`,
      apply: () => {
        setRows((list) => list.filter((o) => !ids.has(o.id)));
        if (viewId && ids.has(viewId)) setViewId(null);
      },
      revert: () => setRows(() => snapshot),
      commit: async () => {
        for (const o of targets) {
          const res = await ordersService.deleteOrder(o.id);
          if (res?.success === false) throw new Error(res?.error?.message || `Could not delete ${o.orderNumber}`);
        }
        refresh();
      },
    });
  };

  const changeStatus = async (targets: any[], next: string) => {
    const ids = new Set(targets.map((o) => o.id));
    setRows((list) => list.map((o) => (ids.has(o.id) ? { ...o, status: next } : o)));
    const results = await Promise.all(targets.map((o) => ordersService.updateOrderStatus(o.id, { status: next }).catch(() => ({ success: false }))));
    const failed = results.filter((r: any) => r?.success === false).length;
    if (failed) toast.error(`${failed} order${failed === 1 ? '' : 's'} could not be updated`);
    else toast.success(`${targets.length} order${targets.length === 1 ? '' : 's'} marked ${statusLabel(next).toLowerCase()}`);
    refresh();
  };

  const autoDispatch = async (o: any) => {
    const res = await api.post(`/auto-dispatch/${o.id}`, {});
    if (res.data?.success) {
      toast.success(`${o.orderNumber} assigned to ${res.data.data.driver?.name} (${res.data.data.vehicle?.plateNumber})`);
      refresh();
    } else {
      toast.error(res.data?.error?.message || 'Could not auto-dispatch this order');
    }
  };

  const saveOrder = async (data: any) => {
    const res = editing ? await ordersService.updateOrder(editing.id, data) : await ordersService.createOrder(data);
    if (res?.success === false) {
      toast.error(res?.error?.message || 'Could not save the order');
      return;
    }
    toast.success(editing ? 'Order updated' : 'Order created');
    setEditing(null);
    setShowCreate(false);
    refresh();
  };

  const columns: Column<any>[] = [
    {
      id: 'orderNumber', header: 'Order', required: true, accessor: (o) => o.orderNumber,
      cell: (o) => (
        <div>
          <p className="font-semibold text-gray-900">{o.orderNumber}</p>
          <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
        </div>
      ),
    },
    {
      id: 'customer', header: 'Customer', accessor: (o) => o.customerName,
      cell: (o) => (
        <div className="max-w-[16rem]">
          <p className="truncate font-medium text-gray-800">{o.customerName}</p>
          <p className="truncate text-xs text-gray-500">{o.deliveryAddress}</p>
        </div>
      ),
    },
    { id: 'status', header: 'Status', accessor: (o) => o.status, cell: (o) => <StatusBadge status={o.status} /> },
    { id: 'priority', header: 'Priority', accessor: (o) => PRIORITIES.indexOf(o.priority), cell: (o) => <StatusBadge status={o.priority} /> },
    { id: 'total', header: 'Total', align: 'right', accessor: (o) => Number(o.totalAmount || 0), cell: (o) => <span className="font-semibold text-gray-900">{rwf(o.totalAmount)}</span> },
    { id: 'payment', header: 'Payment', accessor: (o) => o.paymentStatus || 'UNPAID', cell: (o) => <StatusBadge status={o.paymentStatus || 'UNPAID'} /> },
    { id: 'driver', header: 'Driver', accessor: (o) => o.driver?.name || '', cell: (o) => <span className="text-gray-600">{o.driver?.name || '—'}</span> },
    {
      id: 'scheduled', header: 'Scheduled', accessor: (o) => (o.timeSlotStart || o.scheduledDate ? new Date(o.timeSlotStart || o.scheduledDate) : null),
      cell: (o) => <span className="text-gray-600">{o.timeSlotStart || o.scheduledDate ? formatDate(o.timeSlotStart || o.scheduledDate) : '—'}</span>,
    },
    { id: 'items', header: 'Items', align: 'right', defaultHidden: true, accessor: (o) => o.items?.length || 0 },
    { id: 'method', header: 'Pay method', defaultHidden: true, accessor: (o) => statusLabel(o.paymentMethod) },
  ];

  const exportRows = (list: any[]) =>
    list.map((o) => ({
      'Order Number': o.orderNumber,
      Customer: o.customerName,
      Status: o.status,
      Priority: o.priority,
      'Total Amount': Number(o.totalAmount || 0),
      Payment: o.paymentStatus || 'UNPAID',
      Created: formatDate(o.createdAt),
      'Delivery Address': o.deliveryAddress,
    }));

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Every customer order, from creation to delivery"
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          <>
            <Link to="/orders/board" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              <Board className="h-4 w-4" /> Board view
            </Link>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            {canEdit && (
              <Button onClick={() => setShowCreate(true)} size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> New order
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="All orders" value={stats.total} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Open" value={stats.open} icon={<Clock className="h-5 w-5" />} tone="accent" />
        <StatCard label="Delivered" value={stats.delivered} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Unpaid value" value={stats.unpaidValue} prefix="RWF " compact icon={<Wallet className="h-5 w-5" />} tone="warning" />
      </div>

      <DataTable
        storageKey="orders"
        rows={filtered}
        columns={columns}
        rowKey={(o) => o.id}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search order number, customer, address…"
        initialSort={{ id: 'orderNumber', dir: 'desc' }}
        activeKey={viewId}
        onRowClick={(o) => setViewId(o.id)}
        filters={
          <>
            <FilterChip label="Status" value={status} onChange={setStatus} options={opts(STATUSES)} />
            <FilterChip label="Priority" value={priority} onChange={setPriority} options={opts(PRIORITIES)} />
            <FilterChip label="Payment" value={payment} onChange={setPayment} options={opts(PAYMENT)} />
          </>
        }
        toolbarRight={
          <>
            <SavedFilters
              page="orders"
              current={{ search, status, priority, payment }}
              onApply={(f) => {
                setSearch(f.search || '');
                setStatus(f.status || '');
                setPriority(f.priority || '');
                setPayment(f.payment || '');
              }}
            />
            <ExportMenu getRows={() => exportRows(filtered)} filename="orders" title="Orders Report" />
          </>
        }
        rowActions={(o) => (
          <>
            <button onClick={() => setViewId(o.id)} className="action-btn action-btn-view" title="View"><Eye className="h-4 w-4" /></button>
            {canEdit && <button onClick={() => setEditing(o)} className="action-btn action-btn-edit" title="Edit"><Edit className="h-4 w-4" /></button>}
            {canEdit && <button onClick={() => removeOrders([o])} className="action-btn action-btn-delete" title="Delete"><Trash2 className="h-4 w-4" /></button>}
          </>
        )}
        bulkActions={
          canEdit
            ? (selected, clear) => (
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
                    {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                  <ExportMenu getRows={() => exportRows(selected)} filename="orders-selected" title="Selected Orders" label="Export selected" />
                  <button onClick={() => { removeOrders(selected); clear(); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-error-500 px-2.5 text-xs font-semibold text-white hover:bg-error-600">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </>
              )
            : undefined
        }
        empty={
          <EmptyState
            title={rows.length ? 'No orders match these filters' : 'No orders yet'}
            description={rows.length ? 'Try clearing a filter.' : 'Create your first order to start tracking deliveries.'}
            variant={rows.length ? 'search' : 'empty'}
            action={!rows.length && canEdit ? <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-4 w-4" /> Create your first order</Button> : undefined}
          />
        }
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewId(null)}
        title={viewing ? viewing.orderNumber : ''}
        subtitle={viewing?.customerName}
        icon={<Receipt className="h-4 w-4" />}
        width="xl"
        footer={
          viewing && canEdit ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => printInvoice(viewing.id)}><Printer className="mr-1.5 h-4 w-4" /> Invoice</Button>
              {viewing.status === 'PENDING' && user?.role !== 'WAREHOUSE_STAFF' && (
                <Button size="sm" onClick={() => autoDispatch(viewing)}><Zap className="mr-1.5 h-4 w-4" /> Auto-dispatch</Button>
              )}
              <select
                value=""
                onChange={(e) => e.target.value && changeStatus([viewing], e.target.value)}
                className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700"
              >
                <option value="">Change status…</option>
                {STATUSES.filter((s) => s !== viewing.status).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
              <Button variant="secondary" size="sm" onClick={() => setEditing(viewing)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
              <Button variant="error" size="sm" onClick={() => removeOrders([viewing])}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
            </>
          ) : undefined
        }
      >
        {viewing && (
          <div className="space-y-5">
            <ViewOrderModal order={viewing} />
            <ActivityTimeline entityType="Order" entityId={viewing.id} />
          </div>
        )}
      </Drawer>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New order" subtitle="Add the customer, items and delivery details" icon={<Plus className="h-5 w-5" />} size="xl">
        <CreateOrderForm onClose={() => setShowCreate(false)} onSave={saveOrder} />
      </Modal>
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit order" subtitle={editing?.orderNumber} icon={<Edit className="h-5 w-5" />} size="xl">
        {editing && <EditOrderForm order={editing} onClose={() => setEditing(null)} onSave={saveOrder} />}
      </Modal>
    </div>
  );
}
