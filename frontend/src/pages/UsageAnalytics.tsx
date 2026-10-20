import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, Eye, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

type Summary = {
  periodDays: number;
  totals: { pageViews: number; actions: number; apiErrors: number };
  daily: { date: string; pageViews: number; actions: number; apiErrors: number }[];
  routes: { route: string; pageViews: number; actions: number; apiErrors: number }[];
  truncated: boolean;
};
const number = (n: number) => new Intl.NumberFormat().format(n);

export default function UsageAnalytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const response = await api.get('/usage-events/summary', { params: { days } }); setSummary(response.data?.data || null); }
    catch { toast.error('Could not load usage analytics'); }
    finally { setLoading(false); }
  }, [days]);
  useEffect(() => { void refresh(); }, [refresh]);
  const maxDaily = Math.max(1, ...(summary?.daily.map((d) => d.pageViews + d.actions + d.apiErrors) || [1]));

  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Product usage</h1><p className="mt-1 text-sm text-slate-500">See which workflows get used and where API errors recur. Routes are anonymized and request contents are never recorded.</p></div><div className="flex gap-2"><select aria-label="Reporting period" value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select><button onClick={() => void refresh()} aria-label="Refresh usage" className="rounded-lg border bg-white p-2"><RefreshCw size={18}/></button></div></header>
    {loading && !summary ? <p className="text-sm text-slate-500">Loading usage…</p> : summary && <>
      <section className="grid gap-3 sm:grid-cols-3">
        {[['Page views', summary.totals.pageViews, Eye], ['Actions', summary.totals.actions, Zap], ['API errors', summary.totals.apiErrors, AlertCircle]].map(([label, value, Icon]: any) => <article key={label} className="rounded-xl border bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-slate-500"><Icon size={17}/>{label}</div><p className="mt-2 text-2xl font-bold">{number(value)}</p><p className="mt-1 text-xs text-slate-400">Last {summary.periodDays} days</p></article>)}
      </section>
      <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 font-semibold"><Activity size={18}/>Daily activity</h2>{summary.daily.length ? <div className="space-y-2">{summary.daily.slice(-14).map((day) => { const total = day.pageViews + day.actions + day.apiErrors; return <div key={day.date} className="grid grid-cols-[80px_1fr_45px] items-center gap-3 text-xs"><span className="text-slate-500">{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><div className="flex h-3 overflow-hidden rounded-full bg-slate-100"><div title={`${day.pageViews} page views`} className="bg-blue-500" style={{ width: `${day.pageViews / maxDaily * 100}%` }}/><div title={`${day.actions} actions`} className="bg-emerald-500" style={{ width: `${day.actions / maxDaily * 100}%` }}/><div title={`${day.apiErrors} API errors`} className="bg-rose-500" style={{ width: `${day.apiErrors / maxDaily * 100}%` }}/></div><span className="text-right text-slate-500">{number(total)}</span></div>; })}</div> : <p className="py-8 text-center text-sm text-slate-500">No usage recorded in this period yet.</p>}<div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500"/>Page views</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500"/>Actions</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500"/>API errors</span></div></section>
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b p-4"><h2 className="font-semibold">Routes and recurring errors</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Route</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Actions</th><th className="px-4 py-3">Errors</th></tr></thead><tbody className="divide-y">{summary.routes.map((row) => <tr key={row.route}><td className="px-4 py-3 font-mono text-xs">{row.route}</td><td className="px-4 py-3">{number(row.pageViews)}</td><td className="px-4 py-3">{number(row.actions)}</td><td className="px-4 py-3">{row.apiErrors ? <span className="font-semibold text-rose-600">{number(row.apiErrors)}</span> : '0'}</td></tr>)}</tbody></table></div>{summary.truncated && <p className="border-t px-4 py-2 text-xs text-amber-700">Showing the most recent 50,000 events. Narrow the period for a complete sample.</p>}</section>
      <p className="text-xs text-slate-400">Usage is scoped to the selected company and branch. Only staff activity is included; customer portal activity is excluded.</p>
    </>}
  </div>;
}
