import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, UserCheck, Users, Navigation, Star, Phone, Award, RefreshCw, CreditCard as IdCard } from 'lucide-react';
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
import AddDriverForm from '@/components/forms/AddDriverForm';
import EditDriverForm from '@/components/forms/EditDriverForm';
import { DriverDeliveries } from '@/components/fleet/FleetHistory';
import { driversService } from '@/services/driversService';
import { useList } from '@/hooks/useList';
import { undoableAction } from '@/utils/undoableAction';
import { formatDate, initials } from '@/utils/formatters';
import { statusLabel } from '@/utils/status';
import { useAuth } from '@/context/AuthContext';

export default function Drivers() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'DISPATCH_OFFICER'].includes(user?.role || '');
  const [params, setParams] = useSearchParams();
  const { rows, loading, setRows, refresh } = useList<any>('drivers', '/drivers');
  const { rows: vehicles } = useList<any>('vehicles', '/vehicles');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  useEffect(() => {
    const view = Number(params.get('view'));
    if (view) {
      setViewId(view);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const plate = (d: any) =>
    d.activeOrders?.find((o: any) => o.vehicle)?.vehicle?.plateNumber || d.currentVehicle?.plateNumber || vehicles.find((v) => v.id === d.currentVehicleId)?.plateNumber || '';
  const filtered = useMemo(() => rows.filter((d) => !status || d.status === status), [rows, status]);
  const viewing = rows.find((d) => d.id === viewId) || null;
  const licenseSoon = (d: any) => d.licenseExpiry && new Date(d.licenseExpiry).getTime() < Date.now() + 30 * 86400000;

  const onSaved = () => {
    setShowAdd(false);
    setEditing(null);
    refresh();
  };

  const removeDrivers = (targets: any[]) => {
    const ids = new Set(targets.map((d) => d.id));
    const snapshot = rows;
    undoableAction({
      message: targets.length === 1 ? `${targets[0].name} removed` : `${targets.length} drivers removed`,
      apply: () => {
        setRows((list) => list.filter((d) => !ids.has(d.id)));
        if (viewId && ids.has(viewId)) setViewId(null);
      },
      revert: () => setRows(() => snapshot),
      commit: async () => {
        for (const d of targets) {
          const res = await driversService.deleteDriver(d.id);
          if (res?.success === false) throw new Error(res?.error?.message || `Could not remove ${d.name}`);
        }
        refresh();
      },
    });
  };

  const columns: Column<any>[] = [
    {
      id: 'name', header: 'Driver', required: true, accessor: (d) => d.name,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-bold text-white">
            {initials(d.name)}
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${d.status === 'AVAILABLE' ? 'bg-success-500' : d.status === 'ON_DUTY' ? 'bg-info-500' : 'bg-gray-300'}`} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{d.name}</p>
            <p className="truncate text-xs text-gray-500">{d.phone}</p>
          </div>
        </div>
      ),
    },
    { id: 'status', header: 'Status', accessor: (d) => d.status, cell: (d) => <StatusBadge status={d.status} /> },
    {
      id: 'jobs', header: 'Open deliveries', align: 'right', accessor: (d) => d.activeJobs || 0,
      cell: (d) => d.activeJobs ? <span className="font-semibold text-info-700">{d.activeJobs}</span> : <span className="text-gray-400">0</span>,
    },
    { id: 'vehicle', header: 'Vehicle', accessor: plate, cell: (d) => <span className="text-gray-700">{plate(d) || '—'}</span> },
    { id: 'rating', header: 'Rating', align: 'right', accessor: (d) => Number(d.rating || 0), cell: (d) => <span className="font-semibold text-gray-900">{d.rating ? `${Number(d.rating).toFixed(1)}★` : '—'}</span> },
    { id: 'experience', header: 'Experience', align: 'right', accessor: (d) => d.experience || 0, cell: (d) => `${d.experience || 0} yrs` },
    { id: 'license', header: 'License', accessor: (d) => d.licenseNumber, cell: (d) => <span className="font-mono text-xs text-gray-600">{d.licenseNumber}</span> },
    {
      id: 'expiry', header: 'License expiry', accessor: (d) => (d.licenseExpiry ? new Date(d.licenseExpiry) : null),
      cell: (d) => d.licenseExpiry ? <span className={licenseSoon(d) ? 'font-semibold text-error-600' : 'text-gray-600'}>{formatDate(d.licenseExpiry)}</span> : <span className="text-gray-400">—</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Driver availability, vehicles and performance"
        breadcrumbs={[{ label: 'Fleet' }]}
        icon={<UserCheck className="h-5 w-5" />}
        actions={
          <>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            {canEdit && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add driver</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Drivers" value={rows.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Available" value={rows.filter((d) => d.status === 'AVAILABLE').length} icon={<UserCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="On duty" value={rows.filter((d) => d.status === 'ON_DUTY').length} icon={<Navigation className="h-5 w-5" />} tone="info" />
        <StatCard label="Licenses expiring" value={rows.filter(licenseSoon).length} icon={<IdCard className="h-5 w-5" />} tone={rows.some(licenseSoon) ? 'error' : 'primary'} />
      </div>

      <DataTable
        storageKey="drivers"
        rows={filtered}
        columns={columns}
        rowKey={(d) => d.id}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, phone, license…"
        activeKey={viewId}
        onRowClick={(d) => setViewId(d.id)}
        filters={<FilterChip label="Status" value={status} onChange={setStatus} options={['AVAILABLE', 'ON_DUTY', 'OFF_DUTY'].map((s) => ({ value: s, label: statusLabel(s) }))} />}
        toolbarRight={<ExportMenu getRows={() => filtered.map((d) => ({ Name: d.name, Phone: d.phone, Status: d.status, Vehicle: plate(d), Rating: d.rating ? Number(d.rating).toFixed(1) : '', License: d.licenseNumber }))} filename="drivers" title="Drivers Report" />}
        rowActions={(d) => (
          <>
            <a href={`tel:${d.phone}`} onClick={(e) => e.stopPropagation()} className="action-btn action-btn-view" title="Call"><Phone className="h-4 w-4" /></a>
            <button onClick={() => setViewId(d.id)} className="action-btn action-btn-view" title="View"><Eye className="h-4 w-4" /></button>
            {canEdit && <button onClick={() => setEditing(d)} className="action-btn action-btn-edit" title="Edit"><Edit className="h-4 w-4" /></button>}
            {canEdit && <button onClick={() => removeDrivers([d])} className="action-btn action-btn-delete" title="Remove"><Trash2 className="h-4 w-4" /></button>}
          </>
        )}
        bulkActions={canEdit ? (selected, clear) => (
          <button onClick={() => { removeDrivers(selected); clear(); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-error-500 px-2.5 text-xs font-semibold text-white hover:bg-error-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
        ) : undefined}
        empty={!rows.length ? <EmptyState variant="delivery" title="No drivers yet" action={canEdit ? <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add driver</Button> : undefined} /> : undefined}
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewId(null)}
        title={viewing?.name || ''}
        subtitle={viewing?.phone}
        icon={<UserCheck className="h-4 w-4" />}
        footer={viewing ? (
          <>
            <a href={`tel:${viewing.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"><Phone className="h-4 w-4" /> Call</a>
            {canEdit && <Button variant="secondary" size="sm" onClick={() => setEditing(viewing)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>}
          </>
        ) : undefined}
      >
        {viewing && (
          <div className="space-y-5">
            <DetailHero avatar={initials(viewing.name)} title={viewing.name} subtitle={viewing.email || viewing.phone} badges={<StatusBadge status={viewing.status} size="md" />} />
            <div className="grid grid-cols-2 gap-4">
              <DetailStat label="Rating" value={viewing.rating ? `${Number(viewing.rating).toFixed(1)}★` : '—'} icon={<Star className="h-4 w-4" />} tone="warning" />
              <DetailStat label="Experience" value={`${viewing.experience || 0} yrs`} icon={<Award className="h-4 w-4" />} />
            </div>
            <DetailSection title="Details" icon={<IdCard className="h-4 w-4" />}>
              <DetailGrid>
                <DetailField label="License">{viewing.licenseNumber}</DetailField>
                <DetailField label="License expiry">{viewing.licenseExpiry ? formatDate(viewing.licenseExpiry) : '—'}</DetailField>
                <DetailField label="Hired">{viewing.hireDate ? formatDate(viewing.hireDate) : '—'}</DetailField>
                <DetailField label="Address" className="sm:col-span-2">{viewing.address || '—'}</DetailField>
              </DetailGrid>
            </DetailSection>
            <DriverDeliveries driverId={viewing.id} />
            <ActivityTimeline entityType="Driver" entityId={viewing.id} />
          </div>
        )}
      </Drawer>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add driver" icon={<Plus className="h-5 w-5" />}>
        <AddDriverForm onClose={() => setShowAdd(false)} onSave={onSaved} />
      </Modal>
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit driver" subtitle={editing?.name} icon={<Edit className="h-5 w-5" />}>
        {editing && <EditDriverForm driver={editing} onClose={() => setEditing(null)} onSave={onSaved} />}
      </Modal>
    </div>
  );
}
