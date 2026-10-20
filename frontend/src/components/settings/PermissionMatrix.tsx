import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';

type Grant = { role: string; permission: string; allowed: boolean; branchId: number | null };

export default function PermissionMatrix() {
  const [catalog, setCatalog] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [role, setRole] = useState('WAREHOUSE_STAFF');
  const [roleDraft, setRoleDraft] = useState('');
  const [branchId, setBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/tenancy/permissions'), api.get('/tenancy/branches')]).then(([permissionResponse, branchResponse]) => {
      const data = permissionResponse.data?.data;
      setCatalog(data?.permissions || []);
      setRoles([...new Set([...(data?.roles || []), ...(data?.customRoles || [])])]);
      setGrants(data?.grants || []);
      setBranches(branchResponse.data?.data || []);
    }).catch(() => toast.error('Could not load company permissions'));
  }, []);

  const current = useMemo(() => new Map(
    grants.filter((grant) => grant.role === role && grant.branchId === (branchId ? Number(branchId) : null))
      .map((grant) => [grant.permission, grant.allowed]),
  ), [grants, role, branchId]);
  const groups = useMemo(() => catalog.reduce<Record<string, string[]>>((all, permission) => {
    const [group] = permission.split('.');
    (all[group] ||= []).push(permission);
    return all;
  }, {}), [catalog]);

  const setPermission = (permission: string, allowed: boolean) => {
    setGrants((prior) => [
      ...prior.filter((grant) => !(grant.role === role && grant.permission === permission && grant.branchId === (branchId ? Number(branchId) : null))),
      { role, permission, branchId: branchId ? Number(branchId) : null, allowed },
    ]);
  };

  const addRole = () => {
    const value = roleDraft.trim().toUpperCase().replace(/[^A-Z0-9_:-]/g, '_');
    if (!/^[A-Z][A-Z0-9_:-]{1,63}$/.test(value)) return toast.error('Use a role name with at least 2 letters or numbers');
    if (!roles.includes(value)) setRoles((prior) => [...prior, value].sort());
    setRole(value);
    setRoleDraft('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const selected = grants.filter((grant) => grant.role === role && grant.branchId === (branchId ? Number(branchId) : null));
      const response = await api.put('/tenancy/permissions', {
        role,
        branchId: branchId ? Number(branchId) : null,
        grants: catalog.map((permission) => ({ permission, allowed: selected.find((grant) => grant.permission === permission)?.allowed ?? false })),
      });
      if (response.status >= 400) throw new Error(response.data?.error?.message || 'Save failed');
      toast.success('Permissions saved');
      const refreshed = await api.get('/tenancy/permissions');
      setGrants(refreshed.data?.data?.grants || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4 md:flex-row md:items-end">
        <label className="flex-1 text-sm font-medium text-gray-700">Role
          <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-gray-200 bg-white px-3">
            {roles.map((entry) => <option key={entry} value={entry}>{entry.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
        <label className="flex-1 text-sm font-medium text-gray-700">Location
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-gray-200 bg-white px-3">
            <option value="">All branches (company default)</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <button onClick={save} disabled={saving || !catalog.length} className="h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save permissions'}
        </button>
      </div>

      <div className="flex gap-2">
        <input value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)} placeholder="Add a custom role, e.g. STOCK_AUDITOR" className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm" />
        <button onClick={addRole} className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50">Add role</button>
      </div>

      <p className="text-xs leading-5 text-gray-500">Checked actions are allowed for this role and location. Saving creates an allowlist: unchecked actions are denied. Branch permissions override company defaults.</p>
      <div className="grid gap-4 xl:grid-cols-2">
        {Object.entries(groups).map(([group, permissions]) => (
          <section key={group} className="rounded-xl border border-gray-200">
            <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold capitalize text-gray-800">{group}</h3>
            <div className="divide-y divide-gray-50 px-4">
              {permissions.map((permission) => {
                const allowed = current.get(permission) || false;
                return <label key={permission} className="flex cursor-pointer items-center justify-between gap-3 py-2.5 text-sm text-gray-600">
                  <span>{permission.split('.')[1].replace(/_/g, ' ')}</span>
                  <input type="checkbox" checked={allowed} onChange={(event) => setPermission(permission, event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </label>;
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
