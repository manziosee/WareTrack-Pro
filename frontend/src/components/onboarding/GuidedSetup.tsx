import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Circle, Compass, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

type Task = { title: string; detail: string; href: string; done?: boolean };

/** Role-based first-run checklist. Admin completion is derived from live setup data. */
export default function GuidedSetup() {
  const { user } = useAuth();
  const [setup, setSetup] = useState({ branch: false, warehouse: false, category: false, teammate: false });
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const companyId = localStorage.getItem('waretrack-company-id') || 'default';
  const dismissKey = `waretrack-guided-setup:${companyId}:${user?.id || 'unknown'}:${user?.role || 'unknown'}`;

  useEffect(() => setDismissed(localStorage.getItem(dismissKey) === 'dismissed'), [dismissKey]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    let active = true;
    Promise.allSettled([
      api.get('/tenancy/context'), api.get('/tenancy/branches'), api.get('/warehouses'),
      api.get('/inventory/categories'), api.get('/users', { params: { limit: 2 } }),
    ]).then(([context, branches, warehouses, categories, users]) => {
      if (!active) return;
      const branchesData = branches.status === 'fulfilled' ? branches.value.data?.data || [] : [];
      const contextData = context.status === 'fulfilled' ? context.value.data?.data || [] : [];
      const warehousesData = warehouses.status === 'fulfilled' ? warehouses.value.data?.data || [] : [];
      const categoriesData = categories.status === 'fulfilled' ? categories.value.data?.data || [] : [];
      const userTotal = users.status === 'fulfilled' ? Number(users.value.data?.pagination?.total || 0) : 0;
      setSetup({
        branch: contextData.some((entry: any) => entry.branches?.length > 0) || branchesData.length > 0,
        warehouse: warehousesData.length > 0,
        category: categoriesData.length > 0,
        teammate: userTotal > 1,
      });
      setLoaded(true);
    });
    return () => { active = false; };
  }, [user?.role]);

  const tasks = useMemo<Task[]>(() => {
    switch (user?.role) {
      case 'ADMIN': return [
        { title: 'Check company and branch access', detail: 'Confirm your company has an active branch.', href: '/settings', done: setup.branch },
        { title: 'Set up a warehouse', detail: 'Create the place where each branch keeps stock.', href: '/warehouses', done: setup.warehouse },
        { title: 'Add product categories', detail: 'Organize the catalogue before entering stock.', href: '/inventory', done: setup.category },
        { title: 'Invite your team', detail: 'Give each person the right company and branch role.', href: '/users', done: setup.teammate },
        { title: 'Review permissions', detail: 'Choose what each role can read and change.', href: '/settings' },
      ];
      case 'WAREHOUSE_STAFF': return [
        { title: 'Review branch stock', detail: 'Check product quantities for your selected branch.', href: '/inventory' },
        { title: 'Receive an order', detail: 'Record delivered quantities and damaged goods.', href: '/purchasing' },
        { title: 'Run a stock count', detail: 'Reconcile shelf quantities against the system.', href: '/stock-counts' },
        { title: 'Scan a barcode', detail: 'Allow camera access on this HTTPS site or use a USB scanner.', href: '/scanner' },
      ];
      case 'DISPATCH_OFFICER': return [
        { title: 'Review orders', detail: 'Check delivery windows and customer instructions.', href: '/orders/board' },
        { title: 'Plan dispatch', detail: 'Assign drivers and vehicles, then review the route.', href: '/dispatch' },
        { title: 'Follow exceptions', detail: 'Review failed or partial deliveries and arrange follow-up.', href: '/tracking' },
      ];
      case 'DRIVER': return [
        { title: 'Open today’s deliveries', detail: 'Review addresses and customer access instructions.', href: '/my-deliveries' },
        { title: 'Check sync status', detail: 'Queued updates send when this device reconnects.', href: '/my-deliveries' },
        { title: 'Capture proof of delivery', detail: 'Record the recipient, signature, or delivery photo.', href: '/my-deliveries' },
      ];
      default: return [];
    }
  }, [setup, user?.role]);

  if (!user || dismissed || !tasks.length || (user.role === 'ADMIN' && !loaded)) return null;
  const complete = tasks.filter((task) => task.done).length;
  return (
    <section aria-labelledby="guided-setup-title" className="mb-5 rounded-2xl border border-primary-100 bg-gradient-to-br from-white to-primary-50/60 p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700"><Compass className="h-5 w-5" /></span>
          <div><h2 id="guided-setup-title" className="font-semibold text-gray-900">{user.role === 'DRIVER' ? 'Your delivery guide' : user.role === 'ADMIN' ? 'Set up WareTrack' : 'Your work guide'}</h2><p className="mt-1 text-sm text-gray-600">{user.role === 'ADMIN' ? `${complete} of ${tasks.length - 1} setup checks complete. Use the links to finish your workspace setup.` : 'Quick steps for the tasks you handle most.'}</p></div>
        </div>
        <button aria-label="Dismiss setup guide" onClick={() => { localStorage.setItem(dismissKey, 'dismissed'); setDismissed(true); }} className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-800"><X className="h-4 w-4" /></button>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {tasks.map((task) => <li key={task.title}>
          <Link to={task.href} className="flex min-h-16 items-center gap-3 rounded-xl border border-white bg-white/80 px-3 py-2.5 transition hover:border-primary-200 hover:bg-white">
            {task.done ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-gray-300" />}
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-gray-800">{task.title}</span><span className="mt-0.5 block text-xs text-gray-500">{task.detail}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
          </Link>
        </li>)}
      </ul>
    </section>
  );
}
