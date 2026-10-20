import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PackageCheck, Printer, RefreshCw, CheckCircle2, RotateCcw, Minus, Plus, Box, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ScanInput from '@/components/ui/ScanInput';
import DataTable, { type Column } from '@/components/table/DataTable';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/utils/formatters';

async function call(method: 'get' | 'post' | 'put', url: string, body?: unknown) {
  const res = method === 'get' ? await api.get(url, { params: { t: Date.now() } }) : await api[method](url, body ?? {});
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Something went wrong');
  return res.data?.data;
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Print one pick list for the chosen orders, sorted by shelf. */
async function printPickList(orderIds: number[]) {
  const win = window.open('', '_blank');
  if (!win) return toast.error('Allow pop-ups to print the pick list');
  win.document.write('<p style="font-family:sans-serif;padding:24px">Preparing pick list…</p>');
  try {
    const data = await call('get', `/packing/pick-list?orderIds=${orderIds.join(',')}`);
    win.document.open();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pick list</title>
<style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;font-size:12px;color:#111}h1{font-size:20px;margin:0}p{margin:2px 0;color:#555}
table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #ccc;padding:7px 8px;text-align:left;vertical-align:top}th{background:#eee;font-size:11px;text-transform:uppercase}
.box{width:18px;height:18px;border:2px solid #333;display:inline-block}.r{text-align:right}small{color:#666}</style></head><body>
<h1>Pick list</h1><p>${data.orders.length} orders · ${new Date().toLocaleString('en-GB')}</p><p>${data.orders.map((o: any) => esc(o.orderNumber)).join(', ')}</p>
<table><thead><tr><th>✓</th><th>Shelf</th><th>Item</th><th class="r">Units</th><th>Packs</th><th>For orders</th></tr></thead><tbody>
${data.items.map((i: any) => `<tr><td><span class="box"></span></td><td><b>${esc(i.location || '—')}</b></td><td>${esc(i.name)}<br><small>${esc(i.code)}</small></td><td class="r"><b>${i.units}</b> ${esc(i.unit)}</td><td>${Object.entries(i.packs).map(([k, v]) => `${v} × ${esc(k)}`).join('<br>') || '—'}</td><td><small>${i.orders.map((o: any) => `${esc(o.orderNumber)} (${o.units})`).join(', ')}</small></td></tr>`).join('')}
</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`);
    win.document.close();
  } catch (error: any) {
    win.close();
    toast.error(error.message);
  }
}

function PackOrder({ id, isAdmin, onChanged }: { id: number; isAdmin: boolean; onChanged: () => void }) {
  const { data: order, refetch } = useQuery({ queryKey: ['packing', id], queryFn: () => call('get', `/orders/${id}/packing`) });
  if (!order) return <p className="text-sm text-gray-500">Loading…</p>;
  const units = order.items.reduce((s: number, l: any) => s + l.quantity, 0);
  const packed = order.items.reduce((s: number, l: any) => s + Math.min(l.packedQuantity, l.quantity), 0);
  const done = packed >= units;
  const editable = ['PENDING', 'DISPATCHED'].includes(order.status);

  const after = () => { refetch(); onChanged(); };
  const scan = async (code: string) => {
    try {
      const r = await call('post', `/orders/${id}/packing/scan`, { code });
      toast.success(`+${r.added} ${r.line}`, { duration: 1500 });
      after();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const setLine = async (lineId: number, packedQuantity: number) => {
    try { await call('put', `/orders/${id}/packing/lines/${lineId}`, { packedQuantity }); after(); } catch (error: any) { toast.error(error.message); }
  };
  const complete = async (force = false) => {
    if (!done && isAdmin && !force && !window.confirm('Some items are still missing. Mark this order as packed anyway?')) return;
    try {
      await call('post', `/orders/${id}/packing/complete`, { force });
      toast.success(`${order.orderNumber} packed and ready for dispatch`);
      after();
    } catch (error: any) {
      toast.error(error.message, { duration: 6000 });
    }
  };
  const reset = async () => {
    if (!window.confirm('Start packing this order again?')) return;
    try { await call('post', `/orders/${id}/packing/reset`); after(); } catch (error: any) { toast.error(error.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><Link to={`/orders/${order.id}`} className="font-mono text-sm font-bold text-primary-700 hover:underline">{order.orderNumber}</Link><p className="text-sm text-gray-700">{order.customerName}</p></div>
        <StatusBadge status={order.packingStatus} size="md" />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-600"><span>{packed} of {units} units packed</span><span>{units ? Math.round((packed / units) * 100) : 0}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full transition-all ${done ? 'bg-success-500' : 'bg-primary-500'}`} style={{ width: `${units ? (packed / units) * 100 : 0}%` }} /></div>
      </div>
      {editable && order.packingStatus !== 'PACKED' && <ScanInput onScan={scan} placeholder="Scan each item or pack into the parcel" />}
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
        {order.items.map((l: any) => {
          const full = l.packedQuantity >= l.quantity;
          return (
            <li key={l.id} className={`flex items-center gap-3 px-3 py-2.5 ${full ? 'bg-success-50/50' : ''}`}>
              {full ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success-500" /> : <Box className="h-5 w-5 shrink-0 text-gray-300" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{l.itemName}</span>
                <span className="text-xs text-gray-500">Shelf {l.item.location || '—'} · {l.item.code}{l.packaging ? ` · ${l.packQuantity} × ${l.packaging.name}` : ''}</span>
              </span>
              {editable && order.packingStatus !== 'PACKED' ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button onClick={() => setLine(l.id, Math.max(0, l.packedQuantity - (l.packaging?.unitsPerPack || 1)))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-16 text-center text-sm font-semibold">{l.packedQuantity}/{l.quantity}</span>
                  <button onClick={() => setLine(l.id, Math.min(l.quantity, l.packedQuantity + (l.packaging?.unitsPerPack || 1)))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /></button>
                </span>
              ) : <span className="shrink-0 text-sm font-semibold">{l.packedQuantity}/{l.quantity}</span>}
            </li>
          );
        })}
      </ul>
      {order.packedAt && <p className="text-xs text-gray-500">Packed {formatDateTime(order.packedAt)}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => printPickList([order.id])}><Printer className="mr-1.5 h-4 w-4" /> Pick list</Button>
        {editable && order.packingStatus !== 'NOT_STARTED' && <Button size="sm" variant="secondary" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" /> Start again</Button>}
        {editable && order.packingStatus !== 'PACKED' && <Button size="sm" variant="success" disabled={!done && !isAdmin} onClick={() => complete()}><PackageCheck className="mr-1.5 h-4 w-4" /> Mark packed</Button>}
      </div>
    </div>
  );
}

export default function Packing() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [showPacked, setShowPacked] = useState(false);
  const [search, setSearch] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['list', 'packing', showPacked],
    queryFn: () => call('get', `/packing/orders${showPacked ? '?all=1' : ''}`),
    refetchInterval: 60_000,
  });
  const rows: any[] = data;
  const stats = useMemo(() => ({
    todo: rows.filter((o) => o.packingStatus === 'NOT_STARTED').length,
    picking: rows.filter((o) => o.packingStatus === 'PICKING').length,
    packed: rows.filter((o) => o.packingStatus === 'PACKED').length,
  }), [rows]);

  const columns: Column<any>[] = [
    { id: 'order', header: 'Order', required: true, accessor: (o) => o.orderNumber, cell: (o) => <div><p className="font-semibold text-gray-900">{o.orderNumber}</p><p className="text-xs text-gray-500">{o.customerName}</p></div> },
    { id: 'priority', header: 'Priority', accessor: (o) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 } as any)[o.priority] ?? 1, cell: (o) => <StatusBadge status={o.priority} /> },
    { id: 'packing', header: 'Packing', accessor: (o) => o.packingStatus, cell: (o) => <StatusBadge status={o.packingStatus} /> },
    { id: 'progress', header: 'Packed', accessor: (o) => (o.units ? o.packedUnits / o.units : 0), cell: (o) => (
      <div className="w-32"><p className="mb-0.5 text-xs text-gray-600">{o.packedUnits} of {o.units}</p><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-primary-500" style={{ width: `${o.units ? (o.packedUnits / o.units) * 100 : 0}%` }} /></div></div>
    ) },
    { id: 'lines', header: 'Lines', align: 'right', accessor: (o) => o.items.length },
    { id: 'driver', header: 'Driver', accessor: (o) => o.driver?.name || '', cell: (o) => o.driver?.name || <span className="text-gray-400">Not assigned</span> },
    { id: 'window', header: 'Delivery', accessor: (o) => new Date(o.timeSlotStart || o.scheduledDate || o.createdAt), cell: (o) => <span className="text-gray-600">{formatDateTime(o.timeSlotStart || o.scheduledDate || o.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Picking & packing"
        subtitle="Pick the stock, scan it into the parcel and mark orders ready for dispatch"
        breadcrumbs={[{ label: 'Warehouse' }]}
        icon={<PackageCheck className="h-5 w-5" />}
        actions={
          <>
            <button onClick={() => refetch()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <Button size="sm" variant="secondary" onClick={() => printPickList(rows.filter((o) => o.packingStatus !== 'PACKED').map((o) => o.id))} disabled={!rows.some((o) => o.packingStatus !== 'PACKED')}><Printer className="mr-1.5 h-4 w-4" /> Pick list (all)</Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="To pick" value={stats.todo} icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Being packed" value={stats.picking} icon={<Box className="h-5 w-5" />} tone="info" />
        <StatCard label="Packed" value={stats.packed} icon={<PackageCheck className="h-5 w-5" />} tone="success" />
      </div>
      <DataTable
        storageKey="packing"
        rows={rows}
        columns={columns}
        rowKey={(o) => o.id}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search order or customer…"
        initialSort={{ id: 'priority', dir: 'asc' }}
        activeKey={viewId}
        onRowClick={(o) => setViewId(o.id)}
        filters={<label className="flex items-center gap-2 text-xs font-medium text-gray-600"><input type="checkbox" checked={showPacked} onChange={(e) => setShowPacked(e.target.checked)} /> Show packed</label>}
        bulkActions={(selected, clear) => <Button size="sm" variant="secondary" onClick={() => { printPickList(selected.map((o) => o.id)); clear(); }}><Printer className="mr-1 h-3.5 w-3.5" /> Pick list</Button>}
        empty={<EmptyState title="Nothing to pack" description="New orders appear here until they're packed." />}
      />
      <Drawer open={Boolean(viewId)} onClose={() => setViewId(null)} title="Pack order" subtitle={rows.find((o) => o.id === viewId)?.orderNumber} icon={<PackageCheck className="h-4 w-4" />} width="lg">
        {viewId && <PackOrder id={viewId} isAdmin={isAdmin} onChanged={refetch} />}
      </Drawer>
    </div>
  );
}
