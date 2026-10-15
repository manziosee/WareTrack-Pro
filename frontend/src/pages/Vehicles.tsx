import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, Edit, Trash2, Truck, Wrench, Package, CheckCircle2, Gauge, CalendarClock, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import { DetailHero, DetailSection, DetailField, DetailGrid, DetailStat } from '@/components/ui/Detail';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import ExportMenu from '@/components/table/ExportMenu';
import AddVehicleForm from '@/components/forms/AddVehicleForm';
import EditVehicleForm from '@/components/forms/EditVehicleForm';
import ScheduleMaintenanceForm from '@/components/forms/ScheduleMaintenanceForm';
import { vehiclesService } from '@/services/vehiclesService';
import { useList } from '@/hooks/useList';
import { undoableAction } from '@/utils/undoableAction';
import { formatDate } from '@/utils/formatters';
import { statusLabel } from '@/utils/status';
import { useAuth } from '@/context/AuthContext';

function MaintenanceHistory({ vehicleId }: { vehicleId: number }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['maintenance', vehicleId],
    queryFn: async () => {
      const res = await vehiclesService.getMaintenanceHistory(vehicleId);
      const list = res?.data ?? res;
      return Array.isArray(list) ? list : [];
    },
  });
  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!data.length) return <EmptyState compact title="No maintenance recorded" />;
  return (
    <ul className="divide-y divide-gray-100">
      {data.slice(0, 8).map((m: any) => (
        <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium text-gray-800">{statusLabel(m.type)} · {m.description}</span>
            <span className="block text-xs text-gray-500">{formatDate(m.completedDate || m.scheduledDate)}{m.performedBy ? ` · ${m.performedBy}` : ''}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-xs font-semibold text-gray-900">RWF {Number(m.cost || 0).toLocaleString()}</span>
            <StatusBadge status={m.completedDate ? 'COMPLETED' : 'SCHEDULED'} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Vehicles() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'DISPATCH_OFFICER'].includes(user?.role || '');
  const [params, setParams] = useSearchParams();
  const { rows, loading, setRows, refresh } = useList<any>('vehicles', '/vehicles');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [servicing, setServicing] = useState<any>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  useEffect(() => {
    const view = Number(params.get('view'));
    if (view) {
      setViewId(view);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const types = useMemo(() => Array.from(new Set(rows.map((v) => v.type))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((v) => (!status || v.status === status) && (!type || v.type === type)), [rows, status, type]);
  const viewing = rows.find((v) => v.id === viewId) || null;

  const onSaved = () => {
    setShowAdd(false);
    setEditing(null);
    setServicing(null);
    refresh();
  };

  const removeVehicles = (targets: any[]) => {
    const ids = new Set(targets.map((v) => v.id));
    const snapshot = rows;
    undoableAction({
      message: targets.length === 1 ? `${targets[0].plateNumber} deleted` : `${targets.length} vehicles deleted`,
      apply: () => {
        setRows((list) => list.filter((v) => !ids.has(v.id)));
        if (viewId && ids.has(viewId)) setViewId(null);
      },
      revert: () => setRows(() => snapshot),
      commit: async () => {
        for (const v of targets) {
          const res = await vehiclesService.deleteVehicle(v.id);
          if (res?.success === false) throw new Error(res?.error?.message || `Could not delete ${v.plateNumber}`);
        }
        refresh();
      },
    });
  };

  const columns: Column<any>[] = [
    {
      id: 'plate', header: 'Vehicle', required: true, accessor: (v) => v.plateNumber,
      cell: (v) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600"><Truck className="h-4 w-4" /></span>
          <div>
            <p className="font-semibold text-gray-900">{v.plateNumber}</p>
            <p className="text-xs text-gray-500">{[v.vehicleModel || v.model, v.year].filter(Boolean).join(' · ') || v.type}</p>
          </div>
        </div>
      ),
    },
    { id: 'type', header: 'Type', accessor: (v) => v.type },
    { id: 'status', header: 'Status', accessor: (v) => v.status, cell: (v) => <StatusBadge status={v.status} /> },
    { id: 'capacity', header: 'Capacity', align: 'right', accessor: (v) => v.capacity, cell: (v) => `${Number(v.capacity || 0).toLocaleString()} kg` },
    { id: 'fuel', header: 'Fuel', accessor: (v) => v.fuelType || '' },
    { id: 'service', header: 'Last service', accessor: (v) => (v.lastMaintenance ? new Date(v.lastMaintenance) : null), cell: (v) => <span className="text-gray-600">{v.lastMaintenance ? formatDate(v.lastMaintenance) : 'Never'}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Fleet status, capacity and maintenance"
        breadcrumbs={[{ label: 'Fleet' }]}
        icon={<Truck className="h-5 w-5" />}
        actions={
          <>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            {canEdit && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add vehicle</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Vehicles" value={rows.length} icon={<Truck className="h-5 w-5" />} />
        <StatCard label="Available" value={rows.filter((v) => v.status === 'AVAILABLE').length} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="On the road" value={rows.filter((v) => v.status === 'IN_USE').length} icon={<Gauge className="h-5 w-5" />} tone="info" />
        <StatCard label="In maintenance" value={rows.filter((v) => v.status === 'MAINTENANCE').length} icon={<Wrench className="h-5 w-5" />} tone="warning" />
      </div>

      <DataTable
        storageKey="vehicles"
        rows={filtered}
        columns={columns}
        rowKey={(v) => v.id}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search plate, model, type…"
        activeKey={viewId}
        onRowClick={(v) => setViewId(v.id)}
        filters={
          <>
            <FilterChip label="Status" value={status} onChange={setStatus} options={['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'UNAVAILABLE'].map((s) => ({ value: s, label: statusLabel(s) }))} />
            <FilterChip label="Type" value={type} onChange={setType} options={types.map((t) => ({ value: t, label: t }))} />
          </>
        }
        toolbarRight={<ExportMenu getRows={() => filtered.map((v) => ({ Plate: v.plateNumber, Type: v.type, Status: v.status, 'Capacity (kg)': v.capacity, Fuel: v.fuelType || '', 'Last Service': v.lastMaintenance ? formatDate(v.lastMaintenance) : 'Never' }))} filename="vehicles" title="Vehicles Report" />}
        rowActions={(v) => (
          <>
            <button onClick={() => setViewId(v.id)} className="action-btn action-btn-view" title="View"><Eye className="h-4 w-4" /></button>
            {canEdit && <button onClick={() => setServicing(v)} className="action-btn action-btn-edit" title="Schedule maintenance"><Wrench className="h-4 w-4" /></button>}
            {canEdit && <button onClick={() => setEditing(v)} className="action-btn action-btn-edit" title="Edit"><Edit className="h-4 w-4" /></button>}
            {canEdit && <button onClick={() => removeVehicles([v])} className="action-btn action-btn-delete" title="Delete"><Trash2 className="h-4 w-4" /></button>}
          </>
        )}
        bulkActions={canEdit ? (selected, clear) => (
          <button onClick={() => { removeVehicles(selected); clear(); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-error-500 px-2.5 text-xs font-semibold text-white hover:bg-error-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        ) : undefined}
        empty={!rows.length ? <EmptyState variant="delivery" title="No vehicles yet" description="Add your first vehicle to start dispatching." action={canEdit ? <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add vehicle</Button> : undefined} /> : undefined}
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewId(null)}
        title={viewing?.plateNumber || ''}
        subtitle={viewing?.type}
        icon={<Truck className="h-4 w-4" />}
        width="lg"
        footer={viewing && canEdit ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => setServicing(viewing)}><Wrench className="mr-1.5 h-4 w-4" /> Schedule service</Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(viewing)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
          </>
        ) : undefined}
      >
        {viewing && (
          <div className="space-y-5">
            <DetailHero
              avatar={<Truck className="h-6 w-6" />}
              title={viewing.plateNumber}
              subtitle={[viewing.vehicleModel || viewing.model, viewing.year].filter(Boolean).join(' · ') || viewing.type}
              badges={<StatusBadge status={viewing.status} size="md" />}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailStat label="Type" value={viewing.type} icon={<Truck className="h-4 w-4" />} />
              <DetailStat label="Capacity" value={`${Number(viewing.capacity || 0).toLocaleString()} kg`} icon={<Package className="h-4 w-4" />} tone="accent" />
            </div>
            <DetailSection title="Details" icon={<CalendarClock className="h-4 w-4" />}>
              <DetailGrid>
                <DetailField label="Fuel">{viewing.fuelType || 'Not specified'}</DetailField>
                <DetailField label="Year">{viewing.year || 'Not specified'}</DetailField>
                <DetailField label="Last service">{viewing.lastMaintenance ? formatDate(viewing.lastMaintenance) : 'Never'}</DetailField>
                <DetailField label="Added">{formatDate(viewing.createdAt)}</DetailField>
              </DetailGrid>
            </DetailSection>
            <DetailSection title="Maintenance history" icon={<Wrench className="h-4 w-4" />}>
              <MaintenanceHistory vehicleId={viewing.id} />
            </DetailSection>
            <ActivityTimeline entityType="Vehicle" entityId={viewing.id} />
          </div>
        )}
      </Drawer>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add vehicle" icon={<Plus className="h-5 w-5" />}>
        <AddVehicleForm onClose={() => setShowAdd(false)} onSave={onSaved} />
      </Modal>
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit vehicle" subtitle={editing?.plateNumber} icon={<Edit className="h-5 w-5" />}>
        {editing && <EditVehicleForm vehicle={editing} onClose={() => setEditing(null)} onSave={onSaved} />}
      </Modal>
      <Modal isOpen={Boolean(servicing)} onClose={() => setServicing(null)} title="Schedule maintenance" subtitle={servicing?.plateNumber} icon={<Wrench className="h-5 w-5" />}>
        {servicing && <ScheduleMaintenanceForm vehicle={servicing} onClose={() => setServicing(null)} onSave={onSaved} />}
      </Modal>
    </div>
  );
}
