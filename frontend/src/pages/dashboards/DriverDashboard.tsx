import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CalendarCheck, Clock, Star, Wallet, Trophy, Route, BarChart3, PieChart, Sun, Award, Navigation } from 'lucide-react';
import { useDashboardData } from '@/services/insightsService';
import Greeting from '@/components/dashboard/Greeting';
import HeroCard from '@/components/dashboard/HeroCard';
import DashboardGrid, { type DashboardCard } from '@/components/dashboard/DashboardGrid';
import DashboardToolbar from '@/components/dashboard/DashboardToolbar';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { BarsChart, DonutChart } from '@/components/charts/Widgets';
import { RouteList, Leaderboard } from '@/components/dashboard/Lists';
import { STATUS } from '@/components/charts/chartConfig';

export default function DriverDashboard() {
  const { data, isLoading, isError, dataUpdatedAt, refetch } = useDashboardData();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <EmptyState
        variant="error"
        title="We couldn't load your dashboard"
        description="The server may be waking up. This usually takes under a minute."
        action={<button onClick={() => refetch()} className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white">Try again</button>}
      />
    );
  }

  if (!data.driver) {
    return (
      <div>
        <Greeting summary="Your driver profile isn't set up yet." />
        <EmptyState
          variant="delivery"
          title="No driver profile linked to your account"
          description="Ask a dispatch officer or admin to link your account to a driver profile. Your deliveries will then appear here."
        />
      </div>
    );
  }

  const { hero, stats, charts, lists } = data;

  const cards: DashboardCard[] = [
    {
      id: 'route', title: "Today's route", subtitle: 'Stops in order, tap the arrow to navigate', icon: <Route className="h-4 w-4" />, span: 2,
      action: <Link to="/my-deliveries" className="text-xs font-semibold text-primary-600 hover:underline">Open my deliveries</Link>,
      render: () => <RouteList stops={lists.route} />,
    },
    {
      id: 'rank', title: 'Leaderboard', subtitle: 'This month', icon: <Trophy className="h-4 w-4" />,
      render: () => <Leaderboard rows={charts.leaderboard} />,
    },
    {
      id: 'stats', title: 'My numbers', span: 3, bare: true,
      render: () => (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="Completed today" value={stats.completedToday.value} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          <StatCard label="This week" value={stats.week.value} change={stats.week.change} trend={stats.week.trend} icon={<CalendarCheck className="h-5 w-5" />} />
          <StatCard label="On time" value={stats.onTime.value} suffix="%" decimals={1} trend={stats.onTime.trend} icon={<Clock className="h-5 w-5" />} tone="info" />
          <StatCard label="My rating" value={stats.rating.value} decimals={1} suffix="★" icon={<Star className="h-5 w-5" />} tone="warning" />
          <StatCard label="Value delivered · 30d" value={stats.deliveredValue.value} prefix="RWF " compact icon={<Wallet className="h-5 w-5" />} tone="accent" />
          <StatCard label="My rank" value={stats.rank.value} prefix="#" suffix={` of ${stats.rank.of}`} icon={<Award className="h-5 w-5" />} tone="primary" />
        </div>
      ),
    },
    {
      id: 'deliveries', title: 'My deliveries', subtitle: 'Last 14 days', icon: <BarChart3 className="h-4 w-4" />, span: 2,
      render: () => <BarsChart data={charts.deliveries} series={[{ key: 'value', name: 'Delivered', color: STATUS.good }]} height={220} highlightMax />,
    },
    {
      id: 'onTimeSplit', title: 'On time vs late', subtitle: 'Last 30 days', icon: <PieChart className="h-4 w-4" />,
      render: () => (
        <DonutChart
          data={charts.onTimeSplit.map((d: any) => ({ ...d, color: d.name === 'Late' ? STATUS.critical : STATUS.good }))}
          centerLabel="Delivered"
          height={180}
        />
      ),
    },
    {
      id: 'byHour', title: 'When I deliver', subtitle: 'Completed drops by hour', icon: <Sun className="h-4 w-4" />, span: 2,
      render: () => <BarsChart data={charts.byHour} xKey="hour" series={[{ key: 'value', name: 'Deliveries' }]} height={200} highlightMax />,
    },
    {
      id: 'ratings', title: 'Customer ratings', subtitle: 'All time', icon: <Star className="h-4 w-4" />,
      render: () => (
        <ul className="space-y-2">
          {charts.ratingMix.map((r: any) => {
            const total = charts.ratingMix.reduce((s: number, x: any) => s + x.value, 0) || 1;
            return (
              <li key={r.name} className="flex items-center gap-3 text-xs">
                <span className="w-7 font-semibold text-gray-700">{r.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span className="block h-full rounded-full bg-warning-500" style={{ width: `${(r.value / total) * 100}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums text-gray-500">{r.value}</span>
              </li>
            );
          })}
        </ul>
      ),
    },
  ];

  return (
    <div>
      <Greeting
        summary={hero.caption}
        actions={<DashboardToolbar editing={editing} onToggleEditing={() => setEditing((v) => !v)} updatedAt={dataUpdatedAt} />}
      />
      <HeroCard
        label={hero.label}
        value={hero.value}
        caption={hero.caption}
        series={hero.series}
        icon={<Navigation className="h-3.5 w-3.5" />}
        extras={[
          { label: 'Done today', value: stats.completedToday.value },
          { label: 'On time', value: `${stats.onTime.value}%` },
          { label: 'Rating', value: `${stats.rating.value}★` },
          { label: 'Rank', value: `#${stats.rank.value}` },
        ]}
      />
      <DashboardGrid storageKey="driver" cards={cards} editing={editing} />
    </div>
  );
}
