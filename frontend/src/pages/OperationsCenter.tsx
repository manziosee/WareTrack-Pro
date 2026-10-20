import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, Banknote, BellRing, CheckCircle2, Clock3, PackageX, RefreshCw, ShieldAlert, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';

const money = (value: unknown) => `RWF ${Math.round(Number(value) || 0).toLocaleString()}`;
const when = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Time unavailable';

export default function OperationsCenter() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['operations-command-center'],
    queryFn: async () => {
      const response = await api.get('/insights/command-center', { params: { t: Date.now() } });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Could not load operations');
      return response.data.data;
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-12 w-1/3 rounded-xl bg-gray-100"/><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <div key={n} className="h-28 rounded-2xl bg-gray-100" />)}</div><div className="h-72 rounded-2xl bg-gray-100" /></div>;
  if (isError || !data) return <EmptyState variant="error" title="Operations could not load" description="Check your connection and try again." action={<button onClick={() => void refetch()} className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white">Try again</button>} />;

  const late = data.orders.filter((order: any) => order.issue === 'LATE' || order.issue === 'DELIVERY_FAILED');
  const unassigned = data.orders.filter((order: any) => order.issue === 'UNASSIGNED');
  const atRisk = data.orders.filter((order: any) => order.issue === 'AT_RISK');
  const allApprovals = [...data.approvals.stockCounts.map((item: any) => ({ ...item, kind: 'Stock count' })), ...data.approvals.returns.map((item: any) => ({ ...item, kind: 'Return' }))];
  const overdueCash = data.cash.filter((item: any) => item.overdue);

  return (
    <div className="space-y-5">
      <PageHeader title="Operations center" subtitle="The items that need attention across your selected branch." breadcrumbs={[{ label: 'Overview' }]} icon={<ShieldAlert className="h-5 w-5" />} actions={<button onClick={() => void refetch()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" aria-label="Refresh operations"><RefreshCw className="h-4 w-4" /></button>} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Late / failed" value={late.length} icon={<AlertTriangle className="h-5 w-5" />} tone={late.length ? 'error' : 'success'} to="/orders" />
        <StatCard label="Unassigned orders" value={unassigned.length} icon={<Truck className="h-5 w-5" />} tone={unassigned.length ? 'warning' : 'success'} to="/dispatch" />
        <StatCard label="Stock to review" value={data.lowStock.length} icon={<PackageX className="h-5 w-5" />} tone={data.lowStock.length ? 'warning' : 'success'} to="/inventory" />
        <StatCard label="Cash with drivers" value={data.cash.reduce((sum: number, row: any) => sum + row.amount, 0)} prefix="RWF " compact icon={<Banknote className="h-5 w-5" />} tone={overdueCash.length ? 'warning' : 'success'} to="/cash" />
        <StatCard label="Waiting for review" value={allApprovals.length + data.approvals.cashDiscrepancies.length + data.feedback.length} icon={<BellRing className="h-5 w-5" />} tone={allApprovals.length + data.approvals.cashDiscrepancies.length + data.feedback.length ? 'accent' : 'success'} to="/approvals" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold text-gray-900"><Clock3 className="h-4 w-4 text-error-500" /> Delivery attention</h2><Link to="/dispatch" className="text-xs font-semibold text-primary-600">Open dispatch <ArrowUpRight className="inline h-3.5 w-3.5" /></Link></div>
          {[...late, ...unassigned, ...atRisk].slice(0, 8).map((order: any) => <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between gap-3 border-t border-gray-100 py-3 hover:bg-gray-50"><span className="min-w-0"><b className="block truncate text-sm text-gray-900">{order.orderNumber} · {order.customerName}</b><small className="text-gray-500">{order.issue === 'UNASSIGNED' ? 'Needs a driver' : order.issue === 'DELIVERY_FAILED' ? 'Delivery failed' : order.slaDeadline ? `${order.issue === 'LATE' ? 'Late since' : 'Deadline'} ${when(order.slaDeadline)}` : order.status}</small></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${order.issue === 'LATE' || order.issue === 'DELIVERY_FAILED' ? 'bg-error-50 text-error-700' : 'bg-warning-50 text-warning-700'}`}>{order.issue.replaceAll('_', ' ')}</span></Link>)}
          {!late.length && !unassigned.length && !atRisk.length && <p className="border-t py-6 text-center text-sm text-gray-500">No late, unassigned, or at-risk deliveries.</p>}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold text-gray-900"><PackageX className="h-4 w-4 text-warning-600" /> Stock and cash</h2><Link to="/inventory" className="text-xs font-semibold text-primary-600">View inventory <ArrowUpRight className="inline h-3.5 w-3.5" /></Link></div>
          {data.lowStock.slice(0, 5).map((item: any) => <Link key={item.id} to={`/inventory/${item.id}/edit`} className="flex justify-between gap-3 border-t border-gray-100 py-2.5 text-sm"><span className="truncate">{item.name} <small className="text-gray-400">{item.code}</small></span><b className="shrink-0 text-warning-700">{item.quantity}/{item.minQuantity}</b></Link>)}
          {data.cash.slice(0, 5).map((item: any) => <Link key={item.driverId} to="/cash" className="flex justify-between gap-3 border-t border-gray-100 py-2.5 text-sm"><span className="truncate">{item.driverName} · {item.deliveries} deliveries{item.overdue && <small className="ml-2 font-semibold text-error-600">over 24h</small>}</span><b className="shrink-0">{money(item.amount)}</b></Link>)}
          {!data.lowStock.length && !data.cash.length && <p className="border-t py-6 text-center text-sm text-gray-500">No stock or cash needs attention.</p>}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold text-gray-900"><CheckCircle2 className="h-4 w-4 text-primary-600" /> Approval inbox</h2><Link to="/approvals" className="text-xs font-semibold text-primary-600">Open inbox <ArrowUpRight className="inline h-3.5 w-3.5" /></Link></div>
          {allApprovals.slice(0, 6).map((item: any) => <Link key={`${item.kind}-${item.id}`} to={item.kind === 'Stock count' ? '/stock-counts' : '/returns'} className="flex justify-between gap-3 border-t border-gray-100 py-3 text-sm"><span><b>{item.kind} · {item.countNumber || item.returnNumber}</b><small className="block text-gray-500">{item.title || item.order?.orderNumber || item.reason || 'Needs review'} · {when(item.submittedAt || item.createdAt)}</small></span><ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400" /></Link>)}
          {data.approvals.cashDiscrepancies.slice(0, 3).map((item: any) => <Link key={`cash-${item.id}`} to="/cash" className="flex justify-between gap-3 border-t border-gray-100 py-3 text-sm"><span><b>Cash {item.status.toLowerCase()} · {item.handoverNumber}</b><small className="block text-gray-500">{item.driver.name} · expected {money(item.expected)}, received {money(item.received)}</small></span><span className="font-semibold text-warning-700">{money(Math.abs(Number(item.difference)))}</span></Link>)}
          {data.feedback.slice(0, 3).map((item: any) => <Link key={`feedback-${item.id}`} to="/feedback" className="flex justify-between gap-3 border-t border-gray-100 py-3 text-sm"><span><b>{item.category.replaceAll('_', ' ')}{item.order && ` · ${item.order.orderNumber}`}</b><small className="block truncate text-gray-500">{item.message}</small></span><ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400" /></Link>)}
          {!allApprovals.length && !data.approvals.cashDiscrepancies.length && !data.feedback.length && <p className="border-t py-6 text-center text-sm text-gray-500">Nothing is waiting for review.</p>}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><BellRing className="h-4 w-4 text-info-600" /> System signals</h2>
          <div className="flex items-center justify-between border-t py-3 text-sm"><span>API errors in the last 24 hours</span><b className={data.apiErrorsLast24Hours ? 'text-error-600' : 'text-success-700'}>{data.apiErrorsLast24Hours}</b></div>
          <div className="flex items-center justify-between border-t py-3 text-sm"><span>Orders at risk within 12 hours</span><b className={atRisk.length ? 'text-warning-700' : 'text-success-700'}>{atRisk.length}</b></div>
          <p className="border-t pt-3 text-xs text-gray-500">Driver offline conflicts remain on the driver’s phone until they reconnect. This screen refreshes every minute. Updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'just now'}{user?.role ? ` · ${user.role.replaceAll('_', ' ').toLowerCase()}` : ''}.</p>
        </section>
      </div>
    </div>
  );
}
