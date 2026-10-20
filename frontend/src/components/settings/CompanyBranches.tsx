import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';

type Branch = { id: number; name: string; code: string; accessible?: boolean };
type Member = { id: number; name: string; email: string; role: string; branchMemberships?: { branchId: number; roleOverride: string | null }[] };
type CompanySettings = { legalName: string; legalAddress: string; taxNumber: string; taxRate: string; invoicePrefix: string; currency: string; timezone: string };

export default function CompanyBranches() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('WAREHOUSE_STAFF');
  const [branchId, setBranchId] = useState('');
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ legalName: '', legalAddress: '', taxNumber: '', taxRate: '18', invoicePrefix: 'INV', currency: 'RWF', timezone: 'Africa/Kigali' });
  const [busy, setBusy] = useState(false);
  const companyId = Number(localStorage.getItem('waretrack-company-id') || 1);

  const refresh = async () => {
    const [context, branchResponse, users, roleResponse] = await Promise.all([
      api.get('/tenancy/context'), api.get('/tenancy/branches'), api.get('/users?limit=500'), api.get('/users/roles'),
    ]);
    const contextRows = context.data?.data || [];
    const selectedCompany = contextRows.find((entry: any) => entry.selected)?.company;
    if (selectedCompany) setCompanySettings({
      legalName: selectedCompany.legalName || '', legalAddress: selectedCompany.legalAddress || '',
      taxNumber: selectedCompany.taxNumber || '', taxRate: String(Number(selectedCompany.taxRate ?? 0.18) * 100),
      invoicePrefix: selectedCompany.invoicePrefix || 'INV', currency: selectedCompany.currency || 'RWF', timezone: selectedCompany.timezone || 'Africa/Kigali',
    });
    setMemberships(contextRows);
    setBranches(branchResponse.data?.data || []);
    setMembers(users.data?.data || []);
    setRoles(roleResponse.data?.data || []);
  };

  useEffect(() => { refresh().catch(() => toast.error('Could not load company and branch settings')); }, []);

  const createCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.post('/tenancy/companies', { name: companyName });
      const company = response.data?.data?.company;
      const branch = response.data?.data?.branch;
      if (!company || !branch) throw new Error(response.data?.error?.message || 'Company could not be created');
      localStorage.setItem('waretrack-company-id', String(company.id));
      localStorage.setItem('waretrack-branch-id', String(branch.id));
      toast.success('Company created; opening its main branch');
      window.location.reload();
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || error.message || 'Could not create company'); }
    finally { setBusy(false); }
  };

  const createBranch = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.post('/tenancy/branches', { name: branchName, code: branchCode });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Branch could not be created');
      setBranchName(''); setBranchCode('');
      await refresh(); toast.success('Branch created');
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || error.message || 'Could not create branch'); }
    finally { setBusy(false); }
  };

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!branchId) return toast.error('Choose a branch for this member');
    setBusy(true);
    try {
      const response = await api.post(`/tenancy/companies/${companyId}/members`, { email, role, branchIds: [Number(branchId)] });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Member could not be added');
      setEmail(''); await refresh(); toast.success('Company member added');
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || error.message || 'Could not add member'); }
    finally { setBusy(false); }
  };

  const setBranchRole = async (userId: number, branch: Branch, nextRole: string) => {
    try {
      const response = await api.put(`/tenancy/branches/${branch.id}/members`, { userId, roleOverride: nextRole || null });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Role could not be changed');
      toast.success('Branch role updated');
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || error.message || 'Could not update branch role'); }
  };

  const saveCompanySettings = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await api.patch('/tenancy/company', { ...companySettings, taxRate: Number(companySettings.taxRate) / 100 });
      const saved = response.data?.data;
      setCompanySettings({
        legalName: saved.legalName || '', legalAddress: saved.legalAddress || '', taxNumber: saved.taxNumber || '',
        taxRate: String(Number(saved.taxRate) * 100), invoicePrefix: saved.invoicePrefix, currency: saved.currency, timezone: saved.timezone,
      });
      toast.success('Company invoice settings saved');
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Could not save company settings'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <form onSubmit={saveCompanySettings} className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">Legal identity, tax, and invoices</h3>
      <p className="mt-1 text-xs text-gray-500">New invoices use these company settings. Existing issued invoices keep their saved tax breakdown.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-600">Legal business name<input value={companySettings.legalName} onChange={(e) => setCompanySettings({ ...companySettings, legalName: e.target.value })} maxLength={160} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label>
        <label className="text-xs font-medium text-gray-600">Tax identification number<input value={companySettings.taxNumber} onChange={(e) => setCompanySettings({ ...companySettings, taxNumber: e.target.value })} maxLength={60} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label>
        <label className="text-xs font-medium text-gray-600 sm:col-span-2">Legal address<textarea value={companySettings.legalAddress} onChange={(e) => setCompanySettings({ ...companySettings, legalAddress: e.target.value })} maxLength={300} className="mt-1 min-h-16 w-full rounded-lg border border-gray-200 p-3 text-sm" /></label>
        <label className="text-xs font-medium text-gray-600">Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={companySettings.taxRate} onChange={(e) => setCompanySettings({ ...companySettings, taxRate: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label>
        <label className="text-xs font-medium text-gray-600">Invoice prefix<input value={companySettings.invoicePrefix} onChange={(e) => setCompanySettings({ ...companySettings, invoicePrefix: e.target.value.toUpperCase() })} maxLength={12} pattern="[A-Z0-9][A-Z0-9_-]{0,11}" required className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label>
        <label className="text-xs font-medium text-gray-600">Currency<input value={companySettings.currency} onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value.toUpperCase() })} minLength={3} maxLength={3} pattern="[A-Z]{3}" required className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label>
        <label className="text-xs font-medium text-gray-600">Time zone<input value={companySettings.timezone} onChange={(e) => setCompanySettings({ ...companySettings, timezone: e.target.value })} required className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label>
      </div>
      <button disabled={busy} className="mt-4 h-9 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Save company settings</button>
    </form>
    <section className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">Your companies</h3>
      <div className="mt-3 flex flex-wrap gap-2">{memberships.map((membership) => <span key={membership.company.id} className="rounded-lg bg-gray-100 px-3 py-2 text-sm">{membership.company.name} · {membership.role.replace(/_/g, ' ')}</span>)}</div>
      <form onSubmit={createCompany} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} minLength={2} required placeholder="New company name" className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm" />
        <button disabled={busy} className="h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Create company</button>
      </form>
    </section>

    <section className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">Branches</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{branches.map((branch) => <div key={branch.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm"><span className="font-medium">{branch.name}</span><span className="ml-2 text-gray-500">{branch.code}</span></div>)}</div>
      <form onSubmit={createBranch} className="mt-4 grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <input value={branchName} onChange={(event) => setBranchName(event.target.value)} minLength={2} required placeholder="Branch name" className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
        <input value={branchCode} onChange={(event) => setBranchCode(event.target.value.toUpperCase())} minLength={2} maxLength={20} required placeholder="Code" className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
        <button disabled={busy} className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium disabled:opacity-50">Add branch</button>
      </form>
    </section>

    <section className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">Add a company member</h3>
      <form onSubmit={addMember} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="Existing WareTrack user email" className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
        <select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm">{roles.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} required className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"><option value="">Choose branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        <button disabled={busy} className="h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Add member</button>
      </form>
    </section>

    <section className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">Branch role overrides</h3>
      {!members.length ? <p className="mt-2 text-sm text-gray-500">No members are available.</p> : <div className="mt-3 space-y-2">{members.map((member) => <div key={member.id} className="grid items-center gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_1fr]">
        <div className="min-w-0"><p className="truncate text-sm font-medium">{member.name}</p><p className="truncate text-xs text-gray-500">{member.email} · {member.role.replace(/_/g, ' ')}</p></div>
        <div className="flex gap-2">{branches.map((branch) => {
          const membership = member.branchMemberships?.find((entry) => entry.branchId === branch.id);
          const key = `${member.id}:${branch.id}`;
          const selected = roleOverrides[key] ?? (membership ? membership.roleOverride || '' : '__UNASSIGNED__');
          return <label key={branch.id} className="flex min-w-0 flex-1 flex-col text-[11px] text-gray-500">{branch.name}<select value={selected} onChange={(event) => { setRoleOverrides((current) => ({ ...current, [key]: event.target.value })); void setBranchRole(member.id, branch, event.target.value); }} className="mt-1 h-9 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-xs"><option value="__UNASSIGNED__" disabled>Not assigned</option><option value="">Company role</option>{roles.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>;
        })}</div>
      </div>)}</div>}
    </section>
  </div>;
}
