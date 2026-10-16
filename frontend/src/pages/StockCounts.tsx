import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Plus, RefreshCw, CheckCircle2, XCircle, Send, Undo2, AlertTriangle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ScanInput from '@/components/ui/ScanInput';
import DataTable, { type Column } from '@/components/table/DataTable';
import api from '@/services/api';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/components/inventory/Categories';
import { formatDateTime } from '@/utils/formatters';

const rwf = (v: number) => `RWF ${Math.round(Number(v) || 0).toLocaleString()}`;

async function call(method: 'get' | 'post' | 'put', url: string, body?: unknown) {
  const res = method === 'get' ? await api.get(url, { params: { t: Date.now() } }) : await api[method](url, body ?? {});
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Something went wrong');
  return res.data?.data;
}

function NewCount({ onCreated }: { onCreated: (id: number) => void }) {
  const [type, setType] = useState<'CYCLE' | 'FULL'>('CYCLE');
  const [category, setCategory] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: categories = [] } = useCategories();
  const { rows: warehouses } = useList<any>('warehouses', '/warehouses');
  const start = async () => {
    setBusy(true);
    try {
      const count = await call('post', '/stock-counts', { type, category: type === 'CYCLE' ? category : undefined, warehouseId: warehouseId || undefined });
      toast.success(`${count.countNumber} started: ${count.summary.items} items to count`);
      onCreated(count.id);
    } catch (error: any) {
      toast.error(error.message, { duration: 6000 });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {([['CYCLE', 'Cycle count', 'One category at a time'], ['FULL', 'Full stocktake', 'Every active item']] as const).map(([v, l, h]) => (
          <button key={v} type="button" onClick={() => setType(v)} className={`rounded-xl border p-3 text-left ${type === v ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <span className="block text-sm font-semibold text-gray-900">{l}</span><span className="text-xs text-gray-500">{h}</span>
          </button>
        ))}
      </div>
      {type === 'CYCLE' && (
        <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3">
            <option value="">Choose a category</option>
            {categories.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.items} items)</option>)}
          </select>
        </label>
      )}
      <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Warehouse (optional)</span>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3">
          <option value="">All stock (total quantities)</option>
          {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </label>
      <p className="text-xs text-gray-500">The system quantities are saved when the count starts. Sales made while counting are kept: only the difference you find is applied when the count is approved.</p>
      <div className="flex justify-end"><Button onClick={start} disabled={busy || (type === 'CYCLE' && !category)}><Plus className="mr-1.5 h-4 w-4" /> Start count</Button></div>
    </div>
  );
}

function CountSheet({ id, isAdmin, onChanged }: { id: number; isAdmin: boolean; onChanged: () => void }) {
  const { data: count, refetch } = useQuery({ queryKey: ['stock-count', id], queryFn: () => call('get', `/stock-counts/${id}`) });
  const [filter, setFilter] = useState<'all' | 'todo' | 'diff'>('all');
  const [q, setQ] = useState('');
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  if (!count) return <p className="text-sm text-gray-500">Loading…</p>;
  const editable = count.status === 'OPEN';

  const save = async (itemId: number, value: string) => {
    try {
      await call('put', `/stock-counts/${id}/lines/${itemId}`, { counted: value === '' ? null : Number(value) });
      setDrafts((d) => { const n = { ...d }; delete n[itemId]; return n; });
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const scan = async (code: string) => {
    try {
      const r = await call('post', `/stock-counts/${id}/scan`, { code });
      toast.success(`${r.itemName}: +${r.added} → ${r.counted}`, { duration: 1500 });
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const act = async (action: string, body?: unknown) => {
    try {
      const r = await call('post', `/stock-counts/${id}/${action}`, body);
      toast.success(action === 'approve' ? `Approved: ${r.adjusted} item${r.adjusted === 1 ? '' : 's'} adjusted` : action === 'submit' ? 'Sent for approval' : action === 'reopen' ? 'Sent back for recount' : 'Count cancelled');
      refetch();
      onChanged();
    } catch (error: any) {
      if (action === 'submit' && /not been counted/.test(error.message) && window.confirm(`${error.message}. Submit anyway (uncounted items are left unchanged)?`)) return act('submit', { allowUncounted: true });
      toast.error(error.message, { duration: 6000 });
    }
  };

  const lines = count.lines.filter((l: any) => {
    if (filter === 'todo' && l.counted !== null) return false;
    if (filter === 'diff' && (l.counted === null || l.counted === l.expected)) return false;
    const s = q.trim().toLowerCase();
    return !s || [l.item.name, l.item.code, l.item.location].some((v) => String(v || '').toLowerCase().includes(s));
  });
  const s = count.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={count.status} size="md" />
        <span className="text-sm text-gray-600">{count.title} · started {formatDateTime(count.createdAt)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-gray-50 p-2"><p className="text-lg font-bold">{s.counted}/{s.items}</p><p className="text-[11px] text-gray-500">Counted</p></div>
        <div className={`rounded-xl p-2 ${s.differences ? 'bg-warning-50' : 'bg-gray-50'}`}><p className="text-lg font-bold">{s.differences}</p><p className="text-[11px] text-gray-500">Differences</p></div>
        <div className={`rounded-xl p-2 ${s.valueDifference < 0 ? 'bg-error-50' : 'bg-gray-50'}`}><p className={`text-lg font-bold ${s.valueDifference < 0 ? 'text-error-700' : ''}`}>{rwf(s.valueDifference)}</p><p className="text-[11px] text-gray-500">Value difference</p></div>
      </div>
      {editable && <ScanInput onScan={scan} placeholder="Scan an item or pack to add it to the count" />}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
          {([['all', 'All'], ['todo', 'Not counted'], ['diff', 'Differences']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-2.5 py-1 ${filter === k ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}>{l}</button>
          ))}
        </div>
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find item or shelf" className="h-8 w-full rounded-lg border border-gray-200 pl-8 pr-2 text-xs" /></div>
      </div>
      <ul className="max-h-[50vh] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
        {lines.map((l: any) => {
          const draft = drafts[l.itemId];
          const diff = l.counted === null ? null : l.counted - l.expected;
          return (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{l.item.name}</span>
                <span className="text-xs text-gray-500">{l.item.code} · shelf {l.item.location || '—'} · system {l.expected} {l.item.unit}</span>
              </span>
              {diff !== null && diff !== 0 && <span className={`shrink-0 text-xs font-semibold ${diff < 0 ? 'text-error-600' : 'text-warning-600'}`}>{diff > 0 ? '+' : ''}{diff}</span>}
              {diff === 0 && <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />}
              <input
                type="number"
                min={0}
                inputMode="numeric"
                disabled={!editable}
                value={draft ?? (l.counted ?? '')}
                onChange={(e) => setDrafts((d) => ({ ...d, [l.itemId]: e.target.value }))}
                onBlur={() => draft !== undefined && save(l.itemId, draft)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="Count"
                className="h-9 w-20 shrink-0 rounded-lg border border-gray-200 px-2 text-right text-sm font-semibold disabled:bg-gray-50"
              />
            </li>
          );
        })}
        {!lines.length && <li className="p-4 text-center text-sm text-gray-500">Nothing to show.</li>}
      </ul>
      <div className="flex flex-wrap justify-end gap-2">
        {['OPEN', 'SUBMITTED'].includes(count.status) && <Button size="sm" variant="secondary" onClick={() => window.confirm('Cancel this count? Nothing will change in stock.') && act('cancel')}><XCircle className="mr-1.5 h-4 w-4" /> Cancel count</Button>}
        {count.status === 'OPEN' && <Button size="sm" onClick={() => act('submit')}><Send className="mr-1.5 h-4 w-4" /> Submit for approval</Button>}
        {count.status === 'SUBMITTED' && isAdmin && <Button size="sm" variant="secondary" onClick={() => act('reopen')}><Undo2 className="mr-1.5 h-4 w-4" /> Send back</Button>}
        {count.status === 'SUBMITTED' && isAdmin && <Button size="sm" variant="success" onClick={() => act('approve')}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve & adjust stock</Button>}
      </div>
      {count.status === 'SUBMITTED' && !isAdmin && <p className="flex items-center gap-2 rounded-xl bg-info-50 p-3 text-sm text-info-800"><AlertTriangle className="h-4 w-4" /> Waiting for an admin to approve.</p>}
    </div>
  );
}

export default function StockCounts() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [creating, setCreating] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { data = [], isLoading, refetch } = useQuery({ queryKey: ['list', 'stock-counts'], queryFn: () => call('get', '/stock-counts') });
  const rows: any[] = data;
  const stats = useMemo(() => ({
    open: rows.filter((c) => c.status === 'OPEN').length,
    waiting: rows.filter((c) => c.status === 'SUBMITTED').length,
    approved: rows.filter((c) => c.status === 'APPROVED').length,
  }), [rows]);

  const columns: Column<any>[] = [
    { id: 'number', header: 'Count', required: true, accessor: (c) => c.countNumber, cell: (c) => <div><p className="font-semibold text-gray-900">{c.countNumber}</p><p className="text-xs text-gray-500">{c.title}</p></div> },
    { id: 'status', header: 'Status', accessor: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
    { id: 'progress', header: 'Counted', accessor: (c) => (c.items ? c.counted / c.items : 0), cell: (c) => (
      <div className="w-32"><p className="mb-0.5 text-xs text-gray-600">{c.counted} of {c.items}</p><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-primary-500" style={{ width: `${c.items ? (c.counted / c.items) * 100 : 0}%` }} /></div></div>
    ) },
    { id: 'diff', header: 'Differences', align: 'right', accessor: (c) => c.differences, cell: (c) => (c.differences ? <span className="font-semibold text-warning-700">{c.differences}</span> : <span className="text-gray-400">0</span>) },
    { id: 'value', header: 'Value difference', align: 'right', accessor: (c) => c.valueDifference, cell: (c) => <span className={c.valueDifference < 0 ? 'font-semibold text-error-600' : 'text-gray-700'}>{rwf(c.valueDifference)}</span> },
    { id: 'date', header: 'Started', accessor: (c) => new Date(c.createdAt), cell: (c) => formatDateTime(c.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Stock counts"
        subtitle="Count what's on the shelves, compare with the system and approve the corrections"
        breadcrumbs={[{ label: 'Warehouse' }]}
        icon={<ClipboardCheck className="h-5 w-5" />}
        actions={
          <>
            <button onClick={() => refetch()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New count</Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="In progress" value={stats.open} icon={<ClipboardCheck className="h-5 w-5" />} tone="info" />
        <StatCard label="Waiting for approval" value={stats.waiting} icon={<Send className="h-5 w-5" />} tone="warning" />
        <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
      </div>
      <DataTable
        storageKey="stock-counts"
        rows={rows}
        columns={columns}
        rowKey={(c) => c.id}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search count…"
        initialSort={{ id: 'date', dir: 'desc' }}
        activeKey={viewId}
        onRowClick={(c) => setViewId(c.id)}
        empty={<EmptyState title="No stock counts yet" description="Start with one category, or do a full stocktake." action={<Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New count</Button>} />}
      />
      <Drawer open={Boolean(viewId)} onClose={() => setViewId(null)} title={rows.find((c) => c.id === viewId)?.countNumber || 'Count'} subtitle={rows.find((c) => c.id === viewId)?.title} icon={<ClipboardCheck className="h-4 w-4" />} width="lg">
        {viewId && <CountSheet id={viewId} isAdmin={isAdmin} onChanged={refetch} />}
      </Drawer>
      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New stock count" icon={<Plus className="h-5 w-5" />}>
        {creating && <NewCount onCreated={(id) => { setCreating(false); refetch(); setViewId(id); }} />}
      </Modal>
    </div>
  );
}
