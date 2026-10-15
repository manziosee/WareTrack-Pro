import { useMemo, useState } from 'react';
import { Plus, Eye, Edit, Trash2, Users as UsersIcon, UserCheck, UserPlus, UserX, ShieldCheck, Check, X, RefreshCw } from 'lucide-react';
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
import ExportMenu from '@/components/table/ExportMenu';
import AddUserForm from '@/components/forms/AddUserForm';
import EditUserForm from '@/components/forms/EditUserForm';
import ViewUserModal from '@/components/forms/ViewUserModal';
import api from '@/services/api';
import { usersService } from '@/services/usersService';
import { useList } from '@/hooks/useList';
import { undoableAction } from '@/utils/undoableAction';
import { formatDate, initials } from '@/utils/formatters';
import { statusLabel } from '@/utils/status';
import { useQueryClient } from '@tanstack/react-query';

const ROLES = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'];

export default function Users() {
  const queryClient = useQueryClient();
  const { rows, loading, setRows, refresh } = useList<any>('users', '/users', { limit: 200 });
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const pending = rows.filter((u) => u.status === 'PENDING');
  const filtered = useMemo(
    () => rows.filter((u) => (tab === 'pending' ? u.status === 'PENDING' : true) && (!role || u.role === role) && (!status || u.status === status)),
    [rows, tab, role, status]
  );
  const viewing = rows.find((u) => u.id === viewId) || null;

  const afterChange = () => {
    refresh();
    queryClient.invalidateQueries({ queryKey: ['badge', 'pendingUsers'] });
  };

  const setUserStatus = async (targets: any[], action: 'activate' | 'deactivate') => {
    const next = action === 'activate' ? 'ACTIVE' : 'INACTIVE';
    const ids = new Set(targets.map((u) => u.id));
    setRows((list) => list.map((u) => (ids.has(u.id) ? { ...u, status: next } : u)));
    const results = await Promise.all(targets.map((u) => api.put(`/users/${u.id}/${action}`).then((r) => r.data).catch(() => ({ success: false }))));
    const failed = results.filter((r: any) => r?.success === false).length;
    if (failed) toast.error(`${failed} account${failed === 1 ? '' : 's'} could not be updated`);
    else toast.success(action === 'activate' ? `Approved ${targets.length} account${targets.length === 1 ? '' : 's'}` : `Deactivated ${targets.length} account${targets.length === 1 ? '' : 's'}`);
    afterChange();
  };

  const removeUsers = (targets: any[]) => {
    const ids = new Set(targets.map((u) => u.id));
    const snapshot = rows;
    undoableAction({
      message: targets.length === 1 ? `${targets[0].name} deleted` : `${targets.length} users deleted`,
      apply: () => {
        setRows((list) => list.filter((u) => !ids.has(u.id)));
        if (viewId && ids.has(viewId)) setViewId(null);
      },
      revert: () => setRows(() => snapshot),
      commit: async () => {
        for (const u of targets) {
          const res = await usersService.deleteUser(u.id);
          if (res?.success === false) throw new Error(res?.error?.message || `Could not delete ${u.name}`);
        }
        afterChange();
      },
    });
  };

  const saveUser = async (data: any) => {
    const res = editing ? await usersService.updateUser(editing.id, data) : await usersService.createUser(data);
    if (res?.success === false) {
      toast.error(res?.error?.message || 'Could not save the user');
      return;
    }
    toast.success(editing ? 'User updated' : 'User created');
    setEditing(null);
    setShowAdd(false);
    afterChange();
  };

  const columns: Column<any>[] = [
    {
      id: 'name', header: 'Person', required: true, accessor: (u) => u.name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-xs font-bold text-white">{initials(u.name)}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{u.name}</p>
            <p className="truncate text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'role', header: 'Role', accessor: (u) => u.role, cell: (u) => <span className="rounded-lg bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">{statusLabel(u.role)}</span> },
    { id: 'status', header: 'Status', accessor: (u) => u.status, cell: (u) => <StatusBadge status={u.status === 'PENDING' ? 'PENDING_APPROVAL' : u.status} /> },
    { id: 'phone', header: 'Phone', accessor: (u) => u.phone || '' },
    { id: 'lastLogin', header: 'Last sign-in', accessor: (u) => (u.lastLogin ? new Date(u.lastLogin) : null), cell: (u) => <span className="text-gray-600">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</span> },
    { id: 'created', header: 'Joined', accessor: (u) => new Date(u.createdAt), cell: (u) => <span className="text-gray-600">{formatDate(u.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Team accounts, roles and sign-up approvals"
        breadcrumbs={[{ label: 'Administration' }]}
        icon={<UsersIcon className="h-5 w-5" />}
        actions={
          <>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add user</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="All accounts" value={rows.length} icon={<UsersIcon className="h-5 w-5" />} />
        <StatCard label="Active" value={rows.filter((u) => u.status === 'ACTIVE').length} icon={<UserCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Awaiting approval" value={pending.length} icon={<UserPlus className="h-5 w-5" />} tone={pending.length ? 'accent' : 'primary'} />
        <StatCard label="Admins" value={rows.filter((u) => u.role === 'ADMIN').length} icon={<ShieldCheck className="h-5 w-5" />} tone="info" />
      </div>

      <div className="mb-3 flex w-fit rounded-xl bg-gray-100 p-1 text-xs font-medium">
        {([['all', 'All users'], ['pending', `Pending approval (${pending.length})`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-3 py-1.5 transition ${tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      <DataTable
        storageKey="users"
        rows={filtered}
        columns={columns}
        rowKey={(u) => u.id}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, phone…"
        activeKey={viewId}
        onRowClick={(u) => setViewId(u.id)}
        filters={
          <>
            <FilterChip label="Role" value={role} onChange={setRole} options={ROLES.map((r) => ({ value: r, label: statusLabel(r) }))} />
            <FilterChip label="Status" value={status} onChange={setStatus} options={['ACTIVE', 'PENDING', 'INACTIVE'].map((s) => ({ value: s, label: statusLabel(s) }))} />
          </>
        }
        toolbarRight={<ExportMenu getRows={() => filtered.map((u) => ({ Name: u.name, Email: u.email, Role: u.role, Status: u.status, Phone: u.phone || '', Joined: formatDate(u.createdAt) }))} filename="users" title="Users" />}
        rowActions={(u) => (
          <>
            {u.status === 'PENDING' && (
              <>
                <button onClick={() => setUserStatus([u], 'activate')} className="inline-flex h-8 items-center gap-1 rounded-lg bg-success-500 px-2.5 text-xs font-semibold text-white hover:bg-success-600" title="Approve"><Check className="h-3.5 w-3.5" /> Approve</button>
                <button onClick={() => setUserStatus([u], 'deactivate')} className="action-btn action-btn-delete" title="Reject"><X className="h-4 w-4" /></button>
              </>
            )}
            <button onClick={() => setViewId(u.id)} className="action-btn action-btn-view" title="View"><Eye className="h-4 w-4" /></button>
            <button onClick={() => setEditing(u)} className="action-btn action-btn-edit" title="Edit"><Edit className="h-4 w-4" /></button>
            <button onClick={() => removeUsers([u])} className="action-btn action-btn-delete" title="Delete"><Trash2 className="h-4 w-4" /></button>
          </>
        )}
        bulkActions={(selected, clear) => (
          <>
            <button onClick={() => setUserStatus(selected, 'activate').then(clear)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-success-500 px-2.5 text-xs font-semibold text-white hover:bg-success-600"><UserCheck className="h-3.5 w-3.5" /> Activate</button>
            <button onClick={() => setUserStatus(selected, 'deactivate').then(clear)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"><UserX className="h-3.5 w-3.5" /> Deactivate</button>
            <button onClick={() => { removeUsers(selected); clear(); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-error-500 px-2.5 text-xs font-semibold text-white hover:bg-error-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </>
        )}
        empty={tab === 'pending' ? <EmptyState title="No sign-ups waiting" description="New accounts that need your approval will appear here." /> : undefined}
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewId(null)}
        title={viewing?.name || ''}
        subtitle={viewing?.email}
        icon={<UsersIcon className="h-4 w-4" />}
        footer={
          viewing ? (
            <>
              {viewing.status !== 'ACTIVE' ? (
                <Button variant="success" size="sm" onClick={() => setUserStatus([viewing], 'activate')}><UserCheck className="mr-1.5 h-4 w-4" /> {viewing.status === 'PENDING' ? 'Approve' : 'Activate'}</Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setUserStatus([viewing], 'deactivate')}><UserX className="mr-1.5 h-4 w-4" /> Deactivate</Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setEditing(viewing)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
            </>
          ) : undefined
        }
      >
        {viewing && (
          <div className="space-y-5">
            <ViewUserModal user={viewing} />
            <ActivityTimeline entityType="User" entityId={viewing.id} />
          </div>
        )}
      </Drawer>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add user" icon={<Plus className="h-5 w-5" />}>
        <AddUserForm onClose={() => setShowAdd(false)} onSave={saveUser} />
      </Modal>
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit user" subtitle={editing?.email} icon={<Edit className="h-5 w-5" />}>
        {editing && <EditUserForm user={editing} onClose={() => setEditing(null)} onSave={saveUser} />}
      </Modal>
    </div>
  );
}
