import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Trophy, Clock, Star, Fuel, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarsChart } from '@/components/charts/Widgets';
import DataTable, { type Column } from '@/components/table/DataTable';
import ExportMenu from '@/components/table/ExportMenu';
import api from '@/services/api';
import { initials } from '@/utils/formatters';

const rwf = (v: number) => `RWF ${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v || 0)}`;
const scoreColor = (s: number) => (s >= 85 ? 'text-success-600' : s >= 70 ? 'text-warning-600' : 'text-error-600');

/** Driver performance: on-time rate, success rate, ratings, speed and fuel. */
export default function Scorecards() {
  const [days, setDays] = useState(30);
  const { data = [], isLoading } = useQuery({
    queryKey: ['scorecards', days],
    queryFn: async () => (await api.get('/intelligence/scorecards', { params: { days } })).data?.data || [],
  });

  const active = data.filter((d: any) => d.deliveries > 0);
  const avg = (key: string) => (active.length ? active.reduce((s: number, d: any) => s + (Number(d[key]) || 0), 0) / active.length : 0);
  const podium = active.slice(0, 3);
  const medals = ['from-[#FFD166] to-[#FF8C42]', 'from-gray-200 to-gray-400', 'from-[#E6A57A] to-[#B35C26]'];

  const columns: Column<any>[] = [
    {
      id: 'name', header: 'Driver', required: true, accessor: (d) => d.name,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-bold text-white">{initials(d.name)}</span>
          <div><p className="font-semibold text-gray-900">{d.name}</p><p className="text-xs text-gray-500">{d.vehicle || 'No vehicle'} · {d.experience || 0} yrs</p></div>
        </div>
      ),
    },
    { id: 'score', header: 'Score', align: 'right', accessor: (d) => d.score, cell: (d) => <span className={`text-base font-bold ${scoreColor(d.score)}`}>{d.score}</span> },
    { id: 'deliveries', header: 'Delivered', align: 'right', accessor: (d) => d.deliveries },
    { id: 'onTime', header: 'On time', align: 'right', accessor: (d) => d.onTimeRate, cell: (d) => `${d.onTimeRate}%` },
    { id: 'success', header: 'Success', align: 'right', accessor: (d) => d.successRate, cell: (d) => `${d.successRate}%` },
    { id: 'rating', header: 'Rating', align: 'right', accessor: (d) => d.rating, cell: (d) => `${d.rating}★ (${d.ratingsCount})` },
    { id: 'speed', header: 'Avg delivery', align: 'right', accessor: (d) => d.avgDeliveryMinutes ?? 9999, cell: (d) => (d.avgDeliveryMinutes ? `${d.avgDeliveryMinutes} min` : '—') },
    { id: 'revenue', header: 'Value delivered', align: 'right', accessor: (d) => d.revenue, cell: (d) => rwf(d.revenue) },
    { id: 'fuel', header: 'Fuel / delivery', align: 'right', accessor: (d) => d.fuelPerDelivery ?? 0, cell: (d) => (d.fuelPerDelivery ? rwf(d.fuelPerDelivery) : '—') },
    { id: 'status', header: 'Status', defaultHidden: true, accessor: (d) => d.status, cell: (d) => <StatusBadge status={d.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Driver Scorecards"
        subtitle="Score = 40% on time + 30% success + 30% customer rating"
        breadcrumbs={[{ label: 'Fleet' }]}
        icon={<Award className="h-5 w-5" />}
        actions={
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-medium">
            {[30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 ${days === d ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}>Last {d} days</button>)}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Average score" value={avg('score')} decimals={0} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Average on time" value={avg('onTimeRate')} decimals={1} suffix="%" icon={<Clock className="h-5 w-5" />} tone="info" />
        <StatCard label="Average rating" value={avg('rating')} decimals={1} suffix="★" icon={<Star className="h-5 w-5" />} tone="warning" />
        <StatCard label="Fuel allowance" value={data.reduce((s: number, d: any) => s + d.fuelAllowance, 0)} prefix="RWF " compact icon={<Fuel className="h-5 w-5" />} tone="accent" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900"><Trophy className="h-4 w-4 text-accent-500" /> Top drivers</h3>
          {isLoading ? <Skeleton className="h-48" /> : (
            <div className="flex items-end justify-center gap-3">
              {[1, 0, 2].map((idx) => podium[idx] && (
                <div key={podium[idx].id} className="flex flex-1 flex-col items-center text-center">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${medals[idx]} text-sm font-bold text-white shadow-lift`}>{initials(podium[idx].name)}</span>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold text-gray-800">{podium[idx].name}</p>
                  <p className={`text-lg font-bold ${scoreColor(podium[idx].score)}`}>{podium[idx].score}</p>
                  <div className={`mt-1 w-full rounded-t-xl bg-gradient-to-b ${medals[idx]} opacity-90`} style={{ height: [96, 72, 56][idx] }}>
                    <span className="block pt-2 text-lg font-bold text-white">{idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Scores</h3>
          {isLoading ? <Skeleton className="h-56" /> : <BarsChart data={active.map((d: any) => ({ label: d.name.split(' ')[0], score: d.score }))} series={[{ key: 'score', name: 'Score' }]} height={230} highlightMax />}
        </div>
      </div>

      <DataTable
        storageKey="scorecards"
        rows={data}
        columns={columns}
        rowKey={(d) => d.id}
        loading={isLoading}
        initialSort={{ id: 'score', dir: 'desc' }}
        searchPlaceholder="Search drivers…"
        toolbarRight={<ExportMenu getRows={() => data.map((d: any) => ({ Driver: d.name, Score: d.score, Delivered: d.deliveries, 'On Time %': d.onTimeRate, 'Success %': d.successRate, Rating: d.rating, 'Avg Minutes': d.avgDeliveryMinutes ?? '', 'Value Delivered': d.revenue }))} filename="driver-scorecards" title={`Driver Scorecards (last ${days} days)`} />}
      />
    </div>
  );
}
