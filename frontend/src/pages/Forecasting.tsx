import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, ShoppingCart, Gauge, Package } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrendChart } from '@/components/charts/Widgets';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import ExportMenu from '@/components/table/ExportMenu';
import api from '@/services/api';
import ReorderPoints from '@/components/inventory/ReorderPoints';

const riskLabel: Record<string, string> = { high: 'Order now', medium: 'Order soon', low: 'Healthy', none: 'No demand' };

/** Demand forecast per item: expected demand, days of stock left, reorder point. */
export default function Forecasting() {
  const [risk, setRisk] = useState('');
  const [category, setCategory] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [demandUplift, setDemandUplift] = useState(0);
  const [supplierDelay, setSupplierDelay] = useState(0);

  const { data = [], isLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: async () => (await api.get('/intelligence/forecast', { params: { horizon: 30 } })).data?.data || [],
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(() => Array.from(new Set(data.map((i: any) => i.category))).sort() as string[], [data]);
  const rows = useMemo(() => data.filter((i: any) => (!risk || i.risk === risk) && (!category || i.category === category)), [data, risk, category]);
  const selected = data.find((i: any) => i.id === selectedId) || data.find((i: any) => i.risk === 'high') || data[0];

  const chart = useMemo(() => {
    if (!selected) return [];
    const history = selected.history.map((h: any) => ({ label: h.date.slice(5), actual: h.demand }));
    const forecast = selected.forecast.map((f: any) => ({ label: f.date.slice(5), forecast: f.demand }));
    if (history.length) forecast.unshift({ label: history[history.length - 1].label, forecast: history[history.length - 1].actual });
    return [...history.slice(0, -1), { ...history[history.length - 1], forecast: history[history.length - 1]?.actual }, ...forecast.slice(1)];
  }, [selected]);

  const columns: Column<any>[] = [
    { id: 'name', header: 'Item', required: true, accessor: (i) => i.name, cell: (i) => <div><p className="font-semibold text-gray-900">{i.name}</p><p className="text-xs text-gray-500">{i.category}</p></div> },
    { id: 'risk', header: 'Status', accessor: (i) => ['high', 'medium', 'low', 'none'].indexOf(i.risk), cell: (i) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${i.risk === 'high' ? 'bg-error-50 text-error-700' : i.risk === 'medium' ? 'bg-warning-50 text-warning-700' : i.risk === 'low' ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-600'}`}>{riskLabel[i.risk]}</span> },
    { id: 'stock', header: 'In stock', align: 'right', accessor: (i) => i.quantity, cell: (i) => `${i.quantity} ${i.unit}` },
    { id: 'cover', header: 'Days of cover', align: 'right', accessor: (i) => i.daysOfCover ?? 9999, cell: (i) => (i.daysOfCover == null ? '—' : <span className={i.daysOfCover <= i.leadTimeDays ? 'font-semibold text-error-600' : 'font-semibold text-gray-900'}>{i.daysOfCover} days</span>) },
    { id: 'next30', header: 'Demand · 30 days', align: 'right', accessor: (i) => i.next30 },
    { id: 'trend', header: 'Trend', align: 'right', accessor: (i) => i.trendPercent, cell: (i) => <span className={i.trendPercent > 0 ? 'text-success-600' : i.trendPercent < 0 ? 'text-error-600' : 'text-gray-500'}>{i.trendPercent > 0 ? '+' : ''}{i.trendPercent}%</span> },
    { id: 'reorder', header: 'Reorder point', align: 'right', accessor: (i) => i.reorderPoint },
    { id: 'suggest', header: 'Suggested order', align: 'right', accessor: (i) => i.suggestedOrder, cell: (i) => (i.suggestedOrder ? <b className="text-accent-600">{i.suggestedOrder} {i.unit}</b> : '—') },
  ];

  const high = data.filter((i: any) => i.risk === 'high');
  const scenarioDaily = selected ? Number(selected.avgDailyDemand || 0) * (1 + Math.max(0, Math.min(300, demandUplift)) / 100) : 0;
  const scenarioCover = scenarioDaily > 0 ? Math.floor(Number(selected?.quantity || 0) / scenarioDaily) : null;
  const scenarioOrder = selected ? Math.max(0, Math.ceil(scenarioDaily * (Number(selected.leadTimeDays || 7) + supplierDelay + 30) + Number(selected.safetyStock || 0) - Number(selected.quantity || 0))) : 0;

  return (
    <div>
      <PageHeader title="Forecasting" subtitle="Expected demand from the last 90 days of orders, with weekday patterns and trend" breadcrumbs={[{ label: 'Warehouse' }]} icon={<TrendingUp className="h-5 w-5" />} />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Order now" value={high.length} icon={<AlertTriangle className="h-5 w-5" />} tone="error" />
        <StatCard label="Order soon" value={data.filter((i: any) => i.risk === 'medium').length} icon={<Gauge className="h-5 w-5" />} tone="warning" />
        <StatCard label="Units to order" value={data.reduce((s: number, i: any) => s + i.suggestedOrder, 0)} icon={<ShoppingCart className="h-5 w-5" />} tone="accent" />
        <StatCard label="Demand · next 30 days" value={data.reduce((s: number, i: any) => s + i.next30, 0)} icon={<Package className="h-5 w-5" />} />
      </div>

      <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
        {isLoading || !selected ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{selected.name}</h3>
                <p className="text-xs text-gray-500">Last 30 days and next 30 days · avg {selected.avgDailyDemand}/day · lead time {selected.leadTimeDays} days</p>
              </div>
              <select value={selected.id} onChange={(e) => setSelectedId(Number(e.target.value))} className="h-9 rounded-xl border border-gray-200 px-2 text-sm">
                {data.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <TrendChart data={chart} series={[{ key: 'actual', name: 'Actual' }, { key: 'forecast', name: 'Forecast', color: '#FF8C42', dashed: true }]} height={260} />
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              {[['In stock', `${selected.quantity} ${selected.unit}`], ['Days of cover', selected.daysOfCover ?? '—'], ['Reorder point', selected.reorderPoint], ['Safety stock', selected.safetyStock]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-gray-50 p-3"><p className="text-gray-500">{l}</p><p className="mt-0.5 text-base font-bold text-gray-900">{v}</p></div>
              ))}
            </div>
          </>
        )}
      </div>

      {selected && <section className="mb-5 rounded-2xl border border-primary-100 bg-primary-50/40 p-5">
        <div className="mb-4"><h2 className="text-base font-semibold text-gray-900">What-if stock plan</h2><p className="mt-1 text-xs text-gray-600">Estimate how higher demand or a late supplier delivery could change this item’s reorder need. This is a planning estimate and does not change stock or create a purchase order.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm"><span className="mb-1 flex justify-between font-medium text-gray-700"><span>Demand increase</span><b>{demandUplift}%</b></span><input aria-label="Demand increase percent" type="range" min="0" max="300" step="5" value={demandUplift} onChange={(e) => setDemandUplift(Number(e.target.value))} className="w-full accent-primary-600" /><span className="text-xs text-gray-500">Promotion or new customer demand over baseline</span></label>
          <label className="text-sm"><span className="mb-1 flex justify-between font-medium text-gray-700"><span>Supplier delay</span><b>{supplierDelay} days</b></span><input aria-label="Supplier delay days" type="range" min="0" max="60" step="1" value={supplierDelay} onChange={(e) => setSupplierDelay(Number(e.target.value))} className="w-full accent-primary-600" /><span className="text-xs text-gray-500">Extra days beyond the normal {selected.leadTimeDays}-day lead time</span></label>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ScenarioMetric label="Scenario demand" value={`${scenarioDaily.toFixed(1)} ${selected.unit}/day`} />
          <ScenarioMetric label="Stock cover under scenario" value={scenarioCover === null ? 'No expected demand' : `${scenarioCover} days`} warn={scenarioCover !== null && scenarioCover <= selected.leadTimeDays + supplierDelay} />
          <ScenarioMetric label="Suggested purchase quantity" value={`${scenarioOrder} ${selected.unit}`} warn={scenarioOrder > 0} />
        </div>
      </section>}

      <ReorderPoints />

      <DataTable
        storageKey="forecast"
        rows={rows}
        columns={columns}
        rowKey={(i) => i.id}
        loading={isLoading}
        initialSort={{ id: 'cover', dir: 'asc' }}
        searchPlaceholder="Search items…"
        activeKey={selected?.id}
        onRowClick={(i) => { setSelectedId(i.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        filters={
          <>
            <FilterChip label="Status" value={risk} onChange={setRisk} options={['high', 'medium', 'low', 'none'].map((r) => ({ value: r, label: riskLabel[r] }))} />
            <FilterChip label="Category" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} />
          </>
        }
        toolbarRight={<ExportMenu getRows={() => rows.map((i: any) => ({ Item: i.name, Status: riskLabel[i.risk], 'In Stock': i.quantity, 'Days of Cover': i.daysOfCover ?? '', 'Demand 30d': i.next30, 'Reorder Point': i.reorderPoint, 'Suggested Order': i.suggestedOrder }))} filename="forecast" title="Demand Forecast" />}
      />
    </div>
  );
}

function ScenarioMetric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return <div className={`rounded-xl border p-3 ${warn ? 'border-warning-200 bg-warning-50' : 'border-gray-100 bg-white'}`}><p className="text-xs text-gray-500">{label}</p><p className={`mt-1 text-lg font-bold ${warn ? 'text-warning-800' : 'text-gray-900'}`}>{value}</p></div>;
}
