import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import api from '@/services/api';

type Issue = { type: string; recordId: number; record: string; detail: string; href: string };

export default function DataQuality() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['data-quality'],
    queryFn: async () => (await api.get('/intelligence/data-quality')).data,
  });
  const issues: Issue[] = data?.data || [];
  const totals = data?.totals;
  return (
    <div className="space-y-5">
      <PageHeader title="Data quality" subtitle="Find incomplete records that can block delivery and stock workflows." actions={<button onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-medium hover:bg-gray-50"><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</button>} />
      {totals && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Issues to review" value={totals.issues} /><Metric label="Products checked" value={totals.products} /><Metric label="Customers checked" value={totals.customers} /><Metric label="Active orders" value={totals.activeOrders} /></div>}
      {isLoading ? <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">Checking records…</div> : issues.length === 0 ? <div className="flex items-center gap-3 rounded-2xl border border-success-100 bg-success-50 p-5 text-success-800"><CheckCircle2 className="h-5 w-5" /><p className="text-sm font-medium">No data quality issues found.</p></div> : <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white"><div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800"><Database className="h-4 w-4 text-primary-600" /> Issues requiring review <span className="ml-auto rounded-full bg-warning-50 px-2 py-0.5 text-xs text-warning-700">{issues.length}</span></div><div className="divide-y divide-gray-100">{issues.map((issue, i) => <Link key={`${issue.type}-${issue.recordId}-${i}`} to={issue.href} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" /><div className="min-w-0"><p className="text-sm font-semibold text-gray-800">{issue.type} <span className="font-normal text-gray-500">· {issue.record}</span></p><p className="mt-0.5 text-xs text-gray-500">{issue.detail}</p></div><span className="ml-auto text-xs font-medium text-primary-700">Review</span></Link>)}</div></div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{Number(value).toLocaleString()}</p></div>;
}
