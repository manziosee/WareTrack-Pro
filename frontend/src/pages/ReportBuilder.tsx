import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileBarChart, Play, Save, Trash2, CalendarClock, Mail, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { BarsChart, TrendChart } from '@/components/charts/Widgets';
import ExportMenu from '@/components/table/ExportMenu';
import api from '@/services/api';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

interface Config {
  metrics: string[];
  groupBy: string;
  from: string;
  to: string;
}

/** Build custom reports, then export, save or schedule them by email. */
export default function ReportBuilder() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Config>({ metrics: ['orders', 'revenue'], groupBy: 'week', from: iso(new Date(Date.now() - 30 * 86400000)), to: iso(new Date()) });
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [save, setSave] = useState({ name: '', schedule: 'NONE', recipients: '' });

  const { data: options } = useQuery({ queryKey: ['report-options'], queryFn: async () => (await api.get('/report-builder/options')).data?.data });
  const { data: saved = [] } = useQuery({ queryKey: ['saved-reports'], queryFn: async () => (await api.get('/saved-reports', { params: { t: Date.now() } })).data?.data || [] });

  const run = async (c: Config = config) => {
    setRunning(true);
    const res = await api.post('/report-builder/run', c);
    setRunning(false);
    if (res.data?.success) setResult(res.data.data);
    else toast.error(res.data?.error?.message || 'Could not run the report');
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMetric = (m: string) =>
    setConfig((c) => ({ ...c, metrics: c.metrics.includes(m) ? c.metrics.filter((x) => x !== m) : [...c.metrics, m] }));

  const saveReport = async () => {
    if (!save.name.trim()) return toast.error('Give the report a name');
    const res = await api.post('/saved-reports', { name: save.name.trim(), config, schedule: save.schedule, recipients: save.recipients || undefined });
    if (res.data?.success) {
      toast.success(save.schedule === 'NONE' ? 'Report saved' : `Saved; it will be emailed ${save.schedule.toLowerCase()}`);
      setSaveOpen(false);
      setSave({ name: '', schedule: 'NONE', recipients: '' });
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
    } else toast.error(res.data?.error?.message || 'Could not save');
  };

  const remove = async (id: number) => {
    await api.delete(`/saved-reports/${id}`);
    queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
  };

  const load = (r: any) => {
    const days = r.config.rollingDays || 30;
    const next = { metrics: r.config.metrics, groupBy: r.config.groupBy, from: iso(new Date(Date.now() - days * 86400000)), to: iso(new Date()) };
    setConfig(next);
    run(next);
  };

  const timeGrouping = ['day', 'week', 'month'].includes(config.groupBy);
  const label = options?.groups?.[config.groupBy];
  const firstMetric = result?.columns?.[1];
  const chartData = result?.rows?.map((r: any) => ({ label: String(r[label]).replace('Week of ', ''), value: r[firstMetric] })) || [];

  return (
    <div>
      <PageHeader title="Report Builder" subtitle="Choose what to measure, how to group it and for which dates" breadcrumbs={[{ label: 'Reports', to: '/reports' }]} icon={<FileBarChart className="h-5 w-5" />} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">1 · Measure</p>
            <div className="space-y-1.5">
              {options && Object.entries(options.metrics).map(([key, text]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  <input type="checkbox" checked={config.metrics.includes(key)} onChange={() => toggleMetric(key)} className="h-4 w-4 rounded border-gray-300 text-primary-500" />
                  {text as string}
                </label>
              ))}
            </div>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">2 · Group by</p>
            <select value={config.groupBy} onChange={(e) => setConfig({ ...config, groupBy: e.target.value })} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm">
              {options && Object.entries(options.groups).map(([key, text]) => <option key={key} value={key}>{text as string}</option>)}
            </select>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">3 · Dates</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.days} onClick={() => setConfig({ ...config, from: iso(new Date(Date.now() - p.days * 86400000)), to: iso(new Date()) })} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">{p.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={config.from} onChange={(e) => setConfig({ ...config, from: e.target.value })} className="h-9 rounded-xl border border-gray-200 px-2 text-xs" />
              <input type="date" value={config.to} onChange={(e) => setConfig({ ...config, to: e.target.value })} className="h-9 rounded-xl border border-gray-200 px-2 text-xs" />
            </div>
            <div className="mt-5 flex gap-2">
              <Button className="flex-1" onClick={() => run()} disabled={running || !config.metrics.length}>
                {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />} Run
              </Button>
              <Button variant="secondary" onClick={() => setSaveOpen((v) => !v)}><Save className="h-4 w-4" /></Button>
            </div>
            {saveOpen && (
              <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3 animate-pop-in">
                <input value={save.name} onChange={(e) => setSave({ ...save, name: e.target.value })} placeholder="Report name" className="h-9 w-full rounded-lg border border-gray-200 px-2.5 text-sm" />
                <select value={save.schedule} onChange={(e) => setSave({ ...save, schedule: e.target.value })} className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm">
                  <option value="NONE">Don't email</option><option value="DAILY">Email daily</option><option value="WEEKLY">Email every Monday</option><option value="MONTHLY">Email on the 1st</option>
                </select>
                {save.schedule !== 'NONE' && <input value={save.recipients} onChange={(e) => setSave({ ...save, recipients: e.target.value })} placeholder="Also send to (emails, comma separated)" className="h-9 w-full rounded-lg border border-gray-200 px-2.5 text-xs" />}
                <Button size="sm" className="w-full" onClick={saveReport}><Check className="mr-1.5 h-4 w-4" /> Save report</Button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Saved reports</p>
            {saved.length === 0 ? <p className="text-xs text-gray-500">Nothing saved yet.</p> : (
              <ul className="space-y-1">
                {saved.map((r: any) => (
                  <li key={r.id} className="group flex items-center gap-2">
                    <button onClick={() => load(r)} className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50">
                      <span className="block truncate text-sm font-medium text-gray-800">{r.name}</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">{r.schedule === 'NONE' ? <CalendarClock className="h-3 w-3" /> : <Mail className="h-3 w-3 text-accent-500" />}{r.schedule === 'NONE' ? 'On demand' : `Emailed ${r.schedule.toLowerCase()}`}</span>
                    </button>
                    <button onClick={() => remove(r.id)} className="rounded-lg p-1.5 text-gray-300 opacity-0 hover:bg-error-50 hover:text-error-600 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <section className="space-y-5">
          {!result ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-soft"><EmptyState title="Run a report to see results" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Object.entries(result.totals).map(([k, v]) => (
                  <div key={k} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{k}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{Number(v).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{firstMetric} by {label?.toLowerCase()}</p>
                  <span className="text-xs text-gray-500">{result.orderCount} orders analysed</span>
                </div>
                {timeGrouping ? (
                  <TrendChart data={chartData} series={[{ key: 'value', name: firstMetric }]} height={260} />
                ) : (
                  <BarsChart data={chartData.slice(0, 15)} series={[{ key: 'value', name: firstMetric }]} height={260} highlightMax />
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
                <div className="flex items-center justify-between border-b border-gray-100 p-3">
                  <p className="px-1 text-sm font-semibold text-gray-900">{result.rows.length} rows</p>
                  <ExportMenu getRows={() => result.rows} filename={`report-${config.groupBy}-${config.from}_${config.to}`} title={`${result.columns.slice(1).join(', ')} by ${label} (${config.from} to ${config.to})`} />
                </div>
                <div className="max-h-[50vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50"><tr>{result.columns.map((c: string, i: number) => <th key={c} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 ${i ? 'text-right' : 'text-left'}`}>{c}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">{result.columns.map((c: string, j: number) => <td key={c} className={`px-4 py-2.5 ${j ? 'text-right tabular-nums' : 'font-medium text-gray-800'}`}>{typeof row[c] === 'number' ? row[c].toLocaleString() : row[c]}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
