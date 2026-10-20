import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CheckCheck, ClipboardCheck, MessageSquare, RefreshCw, RotateCcw, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';

export default function ApprovalInbox() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['approval-inbox', user?.role],
    queryFn: async () => {
      const canCount = ['ADMIN', 'WAREHOUSE_STAFF'].includes(user?.role || '');
      const canReviewFeedback = ['ADMIN', 'DISPATCH_OFFICER'].includes(user?.role || '');
      const [counts, returns, feedback, cash] = await Promise.all([
        canCount ? api.get('/stock-counts') : Promise.resolve(null),
        api.get('/returns'),
        canReviewFeedback ? api.get('/feedback', { params: { limit: 250 } }) : Promise.resolve(null),
        api.get('/cash/handovers', { params: { limit: 100 } }),
      ]);
      for (const response of [counts, returns, feedback, cash]) if (response?.data?.success === false && response.status >= 400) throw new Error(response.data?.error?.message || 'Could not load the review queue');
      return {
        counts: (counts?.data?.data || []).filter((item: any) => item.status === 'SUBMITTED'),
        returns: (returns.data?.data || []).filter((item: any) => item.status === 'REQUESTED'),
        feedback: (feedback?.data?.data || []).filter((item: any) => ['OPEN', 'IN_REVIEW'].includes(item.status)),
        cash: (cash.data?.data || []).filter((item: any) => ['SHORT', 'OVER'].includes(item.status)),
      };
    }, refetchInterval: 60_000,
  });
  const rows = data ? [...data.counts, ...data.returns, ...data.feedback] : [];
  const total = rows.length + (data?.cash.length || 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Approval inbox" subtitle="Review stock counts, returns, operational issues, and cash differences." breadcrumbs={[{ label: 'Operations' }]} icon={<CheckCheck className="h-5 w-5" />} actions={<button onClick={() => void refetch()} aria-label="Refresh approvals" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500"><RefreshCw className="h-4 w-4" /></button>} />
      {isLoading ? <div className="h-48 animate-pulse rounded-2xl bg-gray-100" /> : isError ? <EmptyState variant="error" title="Review queue could not load" description="Some review queues may require a permission your role does not have." action={<button onClick={() => void refetch()} className="rounded-xl bg-primary-500 px-4 py-2 text-sm text-white">Try again</button>} /> : total === 0 ? <EmptyState title="Nothing waiting for review" description="Submitted stock counts, new returns, open reports, and cash discrepancies will appear here." /> : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Stock counts', count: data!.counts.length, icon: ClipboardCheck, href: '/stock-counts' },
              { label: 'Returns', count: data!.returns.length, icon: RotateCcw, href: '/returns' },
              { label: 'Feedback and issues', count: data!.feedback.length, icon: MessageSquare, href: '/feedback' },
              { label: 'Cash differences', count: data!.cash.length, icon: Scale, href: '/cash' },
            ].map(({ label, count, icon: Icon, href }) => <Link key={label} to={href} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft hover:border-primary-200"><span className="flex items-center gap-2 text-xs text-gray-500"><Icon className="h-4 w-4"/>{label}</span><b className="mt-2 block text-2xl text-gray-900">{count}</b></Link>)}
          </div>
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
            <header className="flex items-center justify-between border-b border-gray-100 p-4"><div><h2 className="font-semibold text-gray-900">Needs attention</h2><p className="text-xs text-gray-500">{total} items across the selected company and branch.</p></div></header>
            <div className="divide-y divide-gray-100">
              {data!.counts.map((item: any) => <Link key={`count-${item.id}`} to="/stock-counts" className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50"><span className="min-w-0"><b className="block truncate text-sm">Stock count · {item.countNumber}</b><small className="text-gray-500">{item.title} · {item.differences} differences · {item.valueDifference?.toLocaleString() || 0} RWF impact</small></span><ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400"/></Link>)}
              {data!.returns.map((item: any) => <Link key={`return-${item.id}`} to="/returns" className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50"><span className="min-w-0"><b className="block truncate text-sm">Return · {item.returnNumber}</b><small className="text-gray-500">{item.order?.orderNumber} · {item.reason}</small></span><ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400"/></Link>)}
              {data!.feedback.map((item: any) => <Link key={`feedback-${item.id}`} to="/feedback" className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50"><span className="min-w-0"><b className="block truncate text-sm">{item.category.replaceAll('_', ' ')} · report #{item.id}</b><small className="block truncate text-gray-500">{item.order?.orderNumber ? `${item.order.orderNumber} · ` : ''}{item.message}</small></span><ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400"/></Link>)}
              {data!.cash.map((item: any) => <Link key={`cash-${item.id}`} to="/cash" className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50"><span className="min-w-0"><b className="block truncate text-sm">Cash handover · {item.handoverNumber}</b><small className="text-gray-500">{item.driver?.name} · {item.status} by {Math.abs(Number(item.difference)).toLocaleString()} RWF · received by {item.receivedBy || 'staff'}</small></span><ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400"/></Link>)}
            </div>
          </section>
          {user?.role !== 'ADMIN' && <p className="text-xs text-gray-500">Stock count approvals are completed by a company administrator. Cash differences are kept in the cash handover history for investigation.</p>}
        </>
      )}
    </div>
  );
}
