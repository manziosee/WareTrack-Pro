import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Download, ChevronLeft, ChevronRight, Package, CheckCircle2, Wallet, Clock, Users, AlertTriangle,
  TrendingUp, PieChart as PieIcon, Boxes, Truck, Star, Gauge, RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import ExportReportForm from '@/components/forms/ExportReportForm';
import { ChartCard } from '@/components/charts/chartTheme';
import { TrendChart, BarsChart, DonutChart, BarList, Meter, formatRWF } from '@/components/charts/Widgets';
import { reportsService } from '@/services/reportsService';

type View = 'day' | 'week' | 'month' | 'custom';

const DAY = 86400000;
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** First and last day (inclusive) of the period containing `anchor`. */
function periodFor(view: View, anchor: Date) {
  const d = startOfDay(anchor);
  if (view === 'week') {
    const monday = new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY);
    return { start: monday, end: new Date(monday.getTime() + 6 * DAY) };
  }
  if (view === 'month') return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 0) };
  return { start: d, end: d };
}

function shift(view: View, anchor: Date, step: number) {
  if (view === 'month') return new Date(anchor.getFullYear(), anchor.getMonth() + step, 1);
  return new Date(anchor.getTime() + step * (view === 'week' ? 7 : 1) * DAY);
}

function titleFor(view: View, start: Date, end: Date) {
  const today = startOfDay(new Date()).getTime();
  if (view === 'day') {
    if (start.getTime() === today) return 'Today';
    if (start.getTime() === today - DAY) return 'Yesterday';
    return start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (view === 'month') return start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const f = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${f(start)} – ${f(end)} ${end.getFullYear()}`;
}

const PREVIOUS: Record<View, string> = { day: 'vs previous day', week: 'vs previous week', month: 'vs previous month', custom: 'vs previous period' };

async function fetchReport(params: { startDate: string; endDate: string; groupBy?: string }) {
  const res = await reportsService.getAnalytics(params as any);
  if (res?.success === false) throw new Error(res?.error?.message || 'Could not load the report');
  return res.data;
}

export default function Reports() {
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [custom, setCustom] = useState({ startDate: iso(new Date(Date.now() - 29 * DAY)), endDate: iso(new Date()) });
  const [showExport, setShowExport] = useState(false);

  const range = useMemo(() => {
    if (view === 'custom') return custom;
    const { start, end } = periodFor(view, anchor);
    return { startDate: iso(start), endDate: iso(end) };
  }, [view, anchor, custom]);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['reports', range.startDate, range.endDate],
    queryFn: () => fetchReport({ ...range, groupBy: view === 'custom' ? undefined : 'day' }),
    keepPreviousData: true,
  });

  // A single day has no trend of its own, so the day view shows the 14 days leading up to it
  const context = useQuery({
    queryKey: ['reports-context', range.endDate],
    queryFn: () => fetchReport({ startDate: iso(new Date(new Date(range.endDate).getTime() - 13 * DAY)), endDate: range.endDate, groupBy: 'day' }),
    enabled: view === 'day',
    keepPreviousData: true,
  });

  const { start, end } = view === 'custom'
    ? { start: new Date(custom.startDate), end: new Date(custom.endDate) }
    : periodFor(view, anchor);
  const isCurrent = view !== 'custom' && end.getTime() >= startOfDay(new Date()).getTime();
  const todayIso = iso(new Date());
  // Don't draw days that haven't happened yet (e.g. the rest of the current week)
  const trends = ((view === 'day' ? context.data?.trends : data?.trends) || []).filter((t: any) => t.date <= todayIso);
  const s = data?.summary || {};
  const k = data?.kpis || {};
  const vs = PREVIOUS[view];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Daily, weekly and monthly results for orders, deliveries, revenue and stock"
        breadcrumbs={[{ label: 'Insights' }]}
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <>
            <button onClick={() => refetch()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <Button size="sm" onClick={() => setShowExport(true)} disabled={!data}><Download className="mr-1.5 h-4 w-4" /> Export</Button>
          </>
        }
      />

      {/* Period picker */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-soft">
        <div className="flex rounded-xl bg-gray-100 p-1 text-sm font-medium">
          {([['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['custom', 'Custom']] as [View, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setView(key); if (key !== 'custom') setAnchor(new Date()); }}
              className={`rounded-lg px-3.5 py-1.5 transition ${view === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'custom' ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="date" value={custom.startDate} max={custom.endDate} onChange={(e) => setCustom({ ...custom, startDate: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2.5" />
            <span className="text-gray-400">to</span>
            <input type="date" value={custom.endDate} min={custom.startDate} max={iso(new Date())} onChange={(e) => setCustom({ ...custom, endDate: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2.5" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setAnchor(shift(view, anchor, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" title="Previous"><ChevronLeft className="h-4 w-4" /></button>
            <p className="min-w-[11rem] text-center text-sm font-semibold text-gray-900">{titleFor(view, start, end)}</p>
            <button onClick={() => setAnchor(shift(view, anchor, 1))} disabled={isCurrent} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40" title="Next"><ChevronRight className="h-4 w-4" /></button>
            {!isCurrent && <button onClick={() => setAnchor(new Date())} className="text-xs font-semibold text-primary-600 hover:underline">{view === 'day' ? 'Today' : view === 'week' ? 'This week' : 'This month'}</button>}
          </div>
        )}
      </div>

      {error && !data ? (
        <div className="rounded-2xl border border-error-100 bg-error-50 p-6 text-sm text-error-700">{(error as Error).message}</div>
      ) : isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <div className={`space-y-5 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Orders placed" value={s.totalOrders || 0} icon={<Package className="h-5 w-5" />} change={s.ordersChange} changeLabel={vs} trend={trends.map((t: any) => t.orders)} />
            <StatCard label="Delivered" value={s.deliveredInPeriod || 0} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" trend={trends.map((t: any) => t.delivered)} />
            <StatCard label="Revenue delivered" value={s.revenue || 0} prefix="RWF " compact icon={<Wallet className="h-5 w-5" />} tone="accent" change={s.revenueChange} changeLabel={vs} trend={trends.map((t: any) => t.revenue)} />
            <StatCard label="Delivery rate" value={s.deliveryRate || 0} suffix="%" decimals={1} icon={<TrendingUp className="h-5 w-5" />} tone="info" change={s.deliveryRateChange} changeLabel={`points ${vs}`} />
            <StatCard label="Avg. delivery time" value={s.avgDeliveryHours || 0} suffix=" h" decimals={1} icon={<Clock className="h-5 w-5" />} tone="primary" change={s.avgDeliveryHoursChange ? Math.round((s.avgDeliveryHoursChange / Math.max(s.avgDeliveryHours - s.avgDeliveryHoursChange, 0.1)) * 100) : null} changeLabel={vs} invertChange />
            <StatCard label="Failed or returned" value={s.failed || 0} icon={<AlertTriangle className="h-5 w-5" />} tone="error" trend={trends.map((t: any) => t.failed)} />
            <StatCard label="Drivers who delivered" value={s.activeDrivers || 0} suffix={` / ${s.totalDrivers || 0}`} icon={<Users className="h-5 w-5" />} tone="info" />
            <StatCard label="Still pending" value={s.pending || 0} icon={<Truck className="h-5 w-5" />} tone="warning" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title={view === 'day' ? 'Last 14 days' : 'Orders and deliveries'}
              subtitle={view === 'day' ? 'Orders placed and delivered each day up to the selected day' : `Each ${data.period?.groupBy === 'month' ? 'month' : data.period?.groupBy === 'week' ? 'week' : 'day'} in the period`}
              icon={<TrendingUp className="h-4 w-4" />}
            >
              <TrendChart
                data={trends}
                series={[{ key: 'orders', name: 'Orders placed' }, { key: 'delivered', name: 'Delivered', color: '#10B981' }]}
                height={260}
              />
            </ChartCard>
            <ChartCard title="Order status" subtitle="Orders placed in this period, by current status" icon={<PieIcon className="h-4 w-4" />}>
              <DonutChart data={(data.statusDistribution || []).map((r: any) => ({ name: r.status, value: r.count }))} centerLabel="orders" statusColors />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ChartCard className="xl:col-span-2" title="Revenue" subtitle="Value of orders delivered" icon={<Wallet className="h-4 w-4" />}>
              <BarsChart data={trends} series={[{ key: 'revenue', name: 'Revenue', color: '#4682B4' }]} valueFormatter={(v) => formatRWF(Number(v))} highlightMax height={240} />
            </ChartCard>
            <ChartCard title="Performance" subtitle="Service quality in this period" icon={<Gauge className="h-4 w-4" />}>
              <div className="space-y-5">
                <Meter label="On-time deliveries" value={k.onTimeDeliveryRate || 0} hint={k.onTimeSample ? `${k.onTimeSample} deliveries with a deadline` : 'No deliveries with a deadline yet'} />
                <Meter label="Fleet used" value={k.fleetUtilization || 0} hint={`${k.vehiclesUsed || 0} of ${k.fleetSize || 0} vehicles`} />
                <Meter label="Delivery rate" value={s.deliveryRate || 0} hint="Orders placed that are delivered" />
                <div className="flex items-center justify-between rounded-xl bg-warning-50 p-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-warning-800"><Star className="h-4 w-4 fill-current" /> Customer rating</span>
                  <span className="text-lg font-bold text-warning-800">{k.customerSatisfaction ? `${k.customerSatisfaction}/5` : '—'}</span>
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Top drivers" subtitle="Deliveries completed" icon={<Users className="h-4 w-4" />}>
              <BarList data={(data.topDrivers || []).map((d: any) => ({ name: d.name, value: d.delivered, secondary: formatRWF(d.revenue) }))} emptyMessage="No deliveries in this period" />
            </ChartCard>
            <ChartCard title="Top customers" subtitle="Value delivered" icon={<Wallet className="h-4 w-4" />}>
              <BarList data={(data.topCustomers || []).map((c: any) => ({ name: c.name, value: c.revenue, secondary: `${c.orders} orders` }))} format={formatRWF} emptyMessage="No deliveries in this period" />
            </ChartCard>
            <ChartCard title="Stock by category" subtitle="Current stock value" icon={<Boxes className="h-4 w-4" />}>
              <BarList data={(data.inventoryByCategory || []).map((c: any) => ({ name: c.category, value: c.value, secondary: `${c.count} items${c.lowStock ? ` · ${c.lowStock} low` : ''}` }))} format={formatRWF} color="#10B981" />
            </ChartCard>
          </div>
        </div>
      )}

      <Modal isOpen={showExport} onClose={() => setShowExport(false)} title="Export report" subtitle={titleFor(view, start, end)} icon={<Download className="h-5 w-5" />}>
        <ExportReportForm onClose={() => setShowExport(false)} analytics={data} dateRange={range} />
      </Modal>
    </div>
  );
}
