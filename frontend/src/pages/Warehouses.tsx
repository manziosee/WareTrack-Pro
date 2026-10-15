import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Warehouse as WarehouseIcon, ArrowLeftRight, Plus, MapPin, Check, X, RefreshCw, Boxes } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import DataTable, { type Column } from '@/components/table/DataTable';
import api from '@/services/api';
import { useList } from '@/hooks/useList';
import { formatDate } from '@/utils/formatters';
import { useAuth } from '@/context/AuthContext';

const rwf = (v: number) => `RWF ${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v || 0)}`;

export default function Warehouses() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'WAREHOUSE_STAFF'].includes(user?.role || '');
  const queryClient = useQueryClient();
  const { rows: warehouses, loading, refresh: refreshWarehouses } = useList<any>('warehouses', '/warehouses');
  const { rows: transfers, loading: loadingTransfers, refresh: refreshTransfers } = useList<any>('transfers', '/transfers');
  const { rows: items } = useList<any>('inventory', '/inventory');
  const [selected, setSelected] = useState<number | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [transfer, setTransfer] = useState({ fromWarehouseId: '', toWarehouseId: '', itemId: '', quantity: 1, notes: '' });
  const [newWarehouse, setNewWarehouse] = useState({ name: '', code: '', city: '', address: '', capacity: '' });

  const current = warehouses.find((w) => w.id === selected) || warehouses[0];
  const { data: stock = [], isLoading: loadingStock } = useQuery({
    queryKey: ['warehouse-stock', current?.id],
    queryFn: async () => (await api.get(`/warehouses/${current.id}/stock`, { params: { t: Date.now() } })).data?.data || [],
    enabled: Boolean(current?.id),
  });

  const refreshAll = () => {
    refreshWarehouses();
    refreshTransfers();
    queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
  };

  const act = async (t: any, action: 'complete' | 'cancel') => {
    const res = await api.post(`/transfers/${t.id}/${action}`, {});
    if (res.data?.success) {
      toast.success(`${t.transferNumber} ${action === 'complete' ? 'received' : 'cancelled'}`);
      refreshAll();
    } else toast.error(res.data?.error?.message || 'Could not update the transfer');
  };

  const createTransfer = async () => {
    const res = await api.post('/transfers', { ...transfer, fromWarehouseId: Number(transfer.fromWarehouseId), toWarehouseId: Number(transfer.toWarehouseId), itemId: Number(transfer.itemId), quantity: Number(transfer.quantity) });
    if (res.data?.success) {
      toast.success(`Transfer ${res.data.data.transferNumber} is on its way`);
      setShowTransfer(false);
      setTransfer({ fromWarehouseId: '', toWarehouseId: '', itemId: '', quantity: 1, notes: '' });
      refreshAll();
    } else toast.error(res.data?.error?.message || 'Could not create the transfer');
  };

  const createWarehouse = async () => {
    const res = await api.post('/warehouses', { ...newWarehouse, capacity: newWarehouse.capacity ? Number(newWarehouse.capacity) : undefined });
    if (res.data?.success) {
      toast.success(`${res.data.data.name} added`);
      setShowAdd(false);
      setNewWarehouse({ name: '', code: '', city: '', address: '', capacity: '' });
      refreshWarehouses();
    } else toast.error(res.data?.error?.message || 'Could not add the warehouse');
  };

  const stockColumns: Column<any>[] = [
    { id: 'item', header: 'Item', required: true, accessor: (s) => s.item.name, cell: (s) => <div><p className="font-medium text-gray-900">{s.item.name}</p><p className="font-mono text-xs text-gray-500">{s.item.code}</p></div> },
    { id: 'category', header: 'Category', accessor: (s) => s.item.category },
    { id: 'qty', header: 'Units here', align: 'right', accessor: (s) => s.quantity, cell: (s) => <span className="font-semibold">{s.quantity.toLocaleString()} <span className="text-xs font-normal text-gray-500">{s.item.unit}</span></span> },
    { id: 'value', header: 'Value', align: 'right', accessor: (s) => s.quantity * Number(s.item.unitPrice), cell: (s) => rwf(s.quantity * Number(s.item.unitPrice)) },
  ];

  const transferColumns: Column<any>[] = [
    { id: 'number', header: 'Transfer', required: true, accessor: (t) => t.transferNumber, cell: (t) => <div><p className="font-semibold text-gray-900">{t.transferNumber}</p><p className="text-xs text-gray-500">{formatDate(t.createdAt)}</p></div> },
    { id: 'route', header: 'Route', accessor: (t) => `${t.fromWarehouse.name} → ${t.toWarehouse.name}`, cell: (t) => <span className="text-gray-700">{t.fromWarehouse.code} → {t.toWarehouse.code}</span> },
    { id: 'item', header: 'Item', accessor: (t) => t.item.name },
    { id: 'qty', header: 'Qty', align: 'right', accessor: (t) => t.quantity, cell: (t) => `${t.quantity} ${t.item.unit}` },
    { id: 'status', header: 'Status', accessor: (t) => t.status, cell: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="Stock held at each location and transfers between them"
        breadcrumbs={[{ label: 'Warehouse' }]}
        icon={<WarehouseIcon className="h-5 w-5" />}
        actions={
          <>
            <button onClick={refreshAll} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            {canEdit && <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add warehouse</Button>}
            {canEdit && <Button size="sm" onClick={() => setShowTransfer(true)}><ArrowLeftRight className="mr-1.5 h-4 w-4" /> New transfer</Button>}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
          : warehouses.map((w) => {
              const active = current?.id === w.id;
              const util = w.utilization ?? 0;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelected(w.id)}
                  className={`rounded-2xl border p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift ${active ? 'border-primary-300 bg-primary-50/60 ring-2 ring-primary-200' : 'border-gray-100 bg-white'}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow"><WarehouseIcon className="h-5 w-5" /></span>
                    <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-500 ring-1 ring-gray-100">{w.code}</span>
                  </div>
                  <p className="mt-3 font-semibold text-gray-900">{w.name}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="h-3 w-3" /> {w.city || '—'}</p>
                  <div className="mt-3 flex items-end justify-between text-xs">
                    <span><b className="text-lg text-gray-900">{w.units.toLocaleString()}</b> units · {w.skus} SKUs</span>
                    <span className="font-semibold text-gray-700">{rwf(w.value)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${util > 85 ? 'bg-error-500' : util > 65 ? 'bg-warning-500' : 'bg-primary-500'}`} style={{ width: `${Math.max(3, util)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">{w.capacity ? `${util}% of ${w.capacity.toLocaleString()} capacity` : 'No capacity set'}</p>
                </button>
              );
            })}
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Boxes className="h-4 w-4 text-primary-500" /> Stock at {current?.name || '…'}</h2>
          <DataTable storageKey="warehouse-stock" rows={stock} columns={stockColumns} rowKey={(s) => s.id} loading={loadingStock} initialSort={{ id: 'qty', dir: 'desc' }} searchPlaceholder="Search items…" />
        </div>
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><ArrowLeftRight className="h-4 w-4 text-primary-500" /> Transfers</h2>
          <DataTable
            storageKey="transfers"
            rows={transfers}
            columns={transferColumns}
            rowKey={(t) => t.id}
            loading={loadingTransfers}
            initialSort={{ id: 'number', dir: 'desc' }}
            searchPlaceholder="Search transfers…"
            rowActions={canEdit ? (t) => ['PENDING', 'IN_TRANSIT'].includes(t.status) ? (
              <>
                <button onClick={() => act(t, 'complete')} className="inline-flex h-8 items-center gap-1 rounded-lg bg-success-500 px-2.5 text-xs font-semibold text-white hover:bg-success-600"><Check className="h-3.5 w-3.5" /> Received</button>
                <button onClick={() => act(t, 'cancel')} className="action-btn action-btn-delete" title="Cancel"><X className="h-4 w-4" /></button>
              </>
            ) : null : undefined}
          />
        </div>
      </div>

      <Modal isOpen={showTransfer} onClose={() => setShowTransfer(false)} title="New stock transfer" subtitle="Stock leaves now and arrives when marked received" icon={<ArrowLeftRight className="h-5 w-5" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(['fromWarehouseId', 'toWarehouseId'] as const).map((key) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">{key === 'fromWarehouseId' ? 'From' : 'To'}</span>
              <select value={transfer[key]} onChange={(e) => setTransfer({ ...transfer, [key]: e.target.value })} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm">
                <option value="">Choose…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
          ))}
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">Item</span>
            <select value={transfer.itemId} onChange={(e) => setTransfer({ ...transfer, itemId: e.target.value })} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm">
              <option value="">Choose…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Quantity</span>
            <input type="number" min={1} value={transfer.quantity} onChange={(e) => setTransfer({ ...transfer, quantity: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Notes</span>
            <input value={transfer.notes} onChange={(e) => setTransfer({ ...transfer, notes: e.target.value })} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowTransfer(false)}>Cancel</Button>
          <Button size="sm" onClick={createTransfer}>Send transfer</Button>
        </div>
      </Modal>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add warehouse" icon={<Plus className="h-5 w-5" />} size="sm">
        <div className="space-y-3">
          {([['name', 'Name'], ['code', 'Code (e.g. RBV-01)'], ['city', 'City'], ['address', 'Address'], ['capacity', 'Capacity (units)']] as const).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">{label}</span>
              <input value={newWarehouse[key]} onChange={(e) => setNewWarehouse({ ...newWarehouse, [key]: e.target.value })} type={key === 'capacity' ? 'number' : 'text'} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button size="sm" onClick={createWarehouse}>Add warehouse</Button>
        </div>
      </Modal>
    </div>
  );
}
