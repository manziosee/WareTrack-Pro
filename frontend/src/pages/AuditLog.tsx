import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Plus, Pencil, Trash2, LogIn, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Drawer from '@/components/ui/Drawer';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import ExportMenu from '@/components/table/ExportMenu';
import api from '@/services/api';
import { statusLabel } from '@/utils/status';

const ACTIONS: Record<string, { label: string; icon: typeof Plus; className: string }> = {
  CREATE: { label: 'Created', icon: Plus, className: 'bg-success-50 text-success-700' },
  UPDATE: { label: 'Updated', icon: Pencil, className: 'bg-info-50 text-info-700' },
  DELETE: { label: 'Deleted', icon: Trash2, className: 'bg-error-50 text-error-700' },
  LOGIN: { label: 'Signed in', icon: LogIn, className: 'bg-primary-50 text-primary-700' },
};
const ENTITIES = ['Order', 'InventoryItem', 'Dispatch', 'Driver', 'Vehicle', 'User', 'Warehouse', 'StockTransfer', 'Supplier', 'PurchaseOrder', 'ReturnRequest', 'Payment', 'Webhook', 'Settings'];
const entityLabel = (e: string) => e.replace(/([a-z])([A-Z])/g, '$1 $2');

/** Every change made in the system: who, what and when. */
export default function AuditLog() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [viewing, setViewing] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit', action, entityType],
    queryFn: async () => (await api.get('/audit', { params: { limit: 200, action: action || undefined, entityType: entityType || undefined, t: Date.now() } })).data,
  });
  const rows = data?.data || [];
  const counts = Object.fromEntries((data?.summary || []).map((s: any) => [s.action, s.count]));

  const columns: Column<any>[] = [
    { id: 'when', header: 'When', required: true, accessor: (r) => new Date(r.createdAt), cell: (r) => <span className="whitespace-nowrap text-gray-700">{new Date(r.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span> },
    { id: 'who', header: 'Who', accessor: (r) => r.userName || 'System', cell: (r) => <div><p className="font-medium text-gray-900">{r.userName || 'System'}</p><p className="text-xs text-gray-500">{r.userRole ? statusLabel(r.userRole) : ''}</p></div> },
    {
      id: 'action', header: 'Action', accessor: (r) => r.action,
      cell: (r) => {
        const a = ACTIONS[r.action] || { label: r.action, icon: Pencil, className: 'bg-gray-100 text-gray-700' };
        return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${a.className}`}><a.icon className="h-3 w-3" />{a.label}</span>;
      },
    },
    { id: 'what', header: 'What', accessor: (r) => r.summary, cell: (r) => <span className="block max-w-[28rem] truncate text-gray-800">{r.summary}</span> },
    { id: 'entity', header: 'Record', accessor: (r) => entityLabel(r.entityType), cell: (r) => <span className="text-xs text-gray-500">{entityLabel(r.entityType)}{r.entityId ? ` #${r.entityId}` : ''}</span> },
    { id: 'ip', header: 'IP address', defaultHidden: true, accessor: (r) => r.ipAddress || '' },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Every create, update, delete and sign-in, newest first"
        breadcrumbs={[{ label: 'Administration' }]}
        icon={<History className="h-5 w-5" />}
        actions={<button onClick={() => refetch()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Created" value={counts.CREATE || 0} icon={<Plus className="h-5 w-5" />} tone="success" />
        <StatCard label="Updated" value={counts.UPDATE || 0} icon={<Pencil className="h-5 w-5" />} tone="info" />
        <StatCard label="Deleted" value={counts.DELETE || 0} icon={<Trash2 className="h-5 w-5" />} tone="error" />
        <StatCard label="Sign-ins" value={counts.LOGIN || 0} icon={<LogIn className="h-5 w-5" />} />
      </div>

      <DataTable
        storageKey="audit"
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={isLoading}
        initialSort={{ id: 'when', dir: 'desc' }}
        searchPlaceholder="Search who or what…"
        onRowClick={setViewing}
        activeKey={viewing?.id}
        filters={
          <>
            <FilterChip label="Action" value={action} onChange={setAction} options={Object.entries(ACTIONS).map(([k, v]) => ({ value: k, label: v.label }))} />
            <FilterChip label="Record" value={entityType} onChange={setEntityType} options={ENTITIES.map((e) => ({ value: e, label: entityLabel(e) }))} />
          </>
        }
        toolbarRight={<ExportMenu getRows={() => rows.map((r: any) => ({ When: new Date(r.createdAt).toLocaleString('en-GB'), Who: r.userName || 'System', Role: r.userRole || '', Action: r.action, What: r.summary, Record: `${r.entityType}${r.entityId ? ` #${r.entityId}` : ''}` }))} filename="audit-log" title="Audit Log" />}
      />

      <Drawer open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.summary || ''} subtitle={viewing ? `${viewing.userName || 'System'} · ${new Date(viewing.createdAt).toLocaleString('en-GB')}` : ''} icon={<History className="h-4 w-4" />} width="md">
        {viewing && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-gray-500">Action</dt><dd className="font-medium">{ACTIONS[viewing.action]?.label || viewing.action}</dd></div>
              <div><dt className="text-xs text-gray-500">Record</dt><dd className="font-medium">{entityLabel(viewing.entityType)}{viewing.entityId ? ` #${viewing.entityId}` : ''}</dd></div>
              <div><dt className="text-xs text-gray-500">Role</dt><dd className="font-medium">{viewing.userRole ? statusLabel(viewing.userRole) : '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">IP address</dt><dd className="font-mono text-xs">{viewing.ipAddress || '—'}</dd></div>
            </dl>
            {viewing.changes && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Fields sent</p>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  {Object.entries(viewing.changes).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-b border-gray-50 px-3 py-2 last:border-0">
                      <span className="text-xs font-medium text-gray-500">{k}</span>
                      <span className="break-words font-mono text-xs text-gray-800">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
