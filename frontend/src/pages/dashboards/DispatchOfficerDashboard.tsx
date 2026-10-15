import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation, Clock, CheckCircle2, UserCheck, Car, XCircle, BarChart3, PieChart, Users, Activity, MapPin, Wrench,
  AlertTriangle, CalendarClock, Truck, Sun,
} from 'lucide-react';
import { useDashboardData } from '@/services/insightsService';
import Greeting from '@/components/dashboard/Greeting';
import HeroCard from '@/components/dashboard/HeroCard';
import DashboardGrid, { type DashboardCard } from '@/components/dashboard/DashboardGrid';
import DashboardToolbar from '@/components/dashboard/DashboardToolbar';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { TrendChart, BarsChart, DonutChart, BarList } from '@/components/charts/Widgets';
import { AtRiskList, Leaderboard } from '@/components/dashboard/Lists';
import { STATUS } from '@/components/charts/chartConfig';
import { statusLabel } from '@/utils/status';

export default function DispatchOfficerDashboard() {
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

  const { hero, stats, charts, lists } = data;

  const cards: DashboardCard[] = [
    {
      id: 'stats', title: 'Key numbers', span: 3, bare: true,
      render: () => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="In transit now" value={stats.inTransit.value} icon={<Navigation className="h-5 w-5" />} tone="info" to="/tracking" />
          <StatCard label="Waiting for dispatch" value={stats.pending.value} icon={<Clock className="h-5 w-5" />} tone="accent" to="/dispatch" />
          <StatCard label="On-time delivery" value={stats.onTime.value} suffix="%" decimals={1} change={stats.onTime.change} changeLabel="pts vs prior 30d" trend={stats.onTime.trend} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          <StatCard label="Drivers available" value={stats.availableDrivers.value} suffix={` / ${stats.availableDrivers.total}`} icon={<UserCheck className="h-5 w-5" />} to="/drivers" />
          <StatCard label="Vehicles available" value={stats.availableVehicles.value} suffix={` / ${stats.availableVehicles.total}`} icon={<Car className="h-5 w-5" />} tone="primary" to="/vehicles" />
          <StatCard label="Failed · 7 days" value={stats.failed.value} change={stats.failed.change} invertChange icon={<XCircle className="h-5 w-5" />} tone={stats.failed.value > 0 ? 'error' : 'success'} />
        </div>
      ),
    },
    {
      id: 'dispatchVolume', title: 'Dispatched vs delivered', subtitle: 'Last 14 days', icon: <BarChart3 className="h-4 w-4" />, span: 2,
      render: () => (
        <BarsChart
          data={charts.dispatchVolume}
          series={[{ key: 'dispatched', name: 'Dispatched' }, { key: 'delivered', name: 'Delivered', color: STATUS.good }]}
          height={250}
        />
      ),
    },
    {
      id: 'statusMix', title: 'Delivery status', subtitle: 'Last 30 days', icon: <PieChart className="h-4 w-4" />,
      render: () => <DonutChart data={charts.statusMix} centerLabel="Orders" statusColors />,
    },
    {
      id: 'workload', title: 'Driver workload', subtitle: 'Last 30 days', icon: <Users className="h-4 w-4" />, span: 2,
      render: () => <Leaderboard rows={charts.driverWorkload} showActive />,
    },
    {
      id: 'onTime', title: 'On-time rate', subtitle: 'Weekly, target 90%', icon: <Activity className="h-4 w-4" />,
      render: () => (
        <TrendChart data={charts.onTimeTrend} series={[{ key: 'onTime', name: 'On time', color: STATUS.good }]} height={210} referenceY={90} yFormatter={(v) => `${v}%`} valueFormatter={(v) => `${v}%`} />
      ),
    },
    {
      id: 'byHour', title: 'Deliveries by hour', subtitle: 'When drops are completed', icon: <Sun className="h-4 w-4" />,
      render: () => <BarsChart data={charts.byHour} xKey="hour" series={[{ key: 'value', name: 'Deliveries' }]} height={200} highlightMax />,
    },
    {
      id: 'areaMix', title: 'Busiest areas', subtitle: 'Orders by neighbourhood, last 30 days', icon: <MapPin className="h-4 w-4" />,
      render: () => <BarList data={charts.areaMix} format={(v) => `${v} orders`} color="#E0578A" />,
    },
    {
      id: 'fleet', title: 'Fleet right now', subtitle: 'Vehicles by status', icon: <Truck className="h-4 w-4" />,
      render: () => <DonutChart data={charts.vehicleStatus} centerLabel="Vehicles" statusColors height={180} />,
    },
    {
      id: 'atRisk', title: 'Deliveries at risk', subtitle: 'Due within 12 hours or overdue', icon: <AlertTriangle className="h-4 w-4" />,
      render: () => <AtRiskList items={lists.atRisk} />,
    },
    {
      id: 'failures', title: 'Why deliveries fail', subtitle: 'Reasons recorded by drivers', icon: <XCircle className="h-4 w-4" />,
      render: () => <BarList data={charts.failureReasons} format={(v) => `${v}`} color="#EF4444" emptyMessage="No failed deliveries" />,
    },
    {
      id: 'maintenance', title: 'Upcoming maintenance', subtitle: 'Next 30 days', icon: <Wrench className="h-4 w-4" />,
      action: <Link to="/vehicles" className="text-xs font-semibold text-primary-600 hover:underline">Vehicles</Link>,
      render: () =>
        lists.maintenance.length ? (
          <ul className="space-y-2.5">
            {lists.maintenance.map((m: any) => (
              <li key={m.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-50 leading-none text-primary-700">
                  <span className="text-[9px] font-semibold uppercase">{new Date(m.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-sm font-bold">{new Date(m.date).getDate()}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">{m.plateNumber}</span>
                  <span className="block truncate text-xs text-gray-500">{statusLabel(m.type)} · {m.description}</span>
                </span>
                <CalendarClock className="h-4 w-4 text-gray-300" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title="No maintenance due" />
        ),
    },
  ];

  return (
    <div>
      <Greeting
        summary={`${stats.inTransit.value} deliveries on the road · ${stats.pending.value} waiting for a driver`}
        actions={<DashboardToolbar editing={editing} onToggleEditing={() => setEditing((v) => !v)} updatedAt={dataUpdatedAt} />}
      />
      <HeroCard
        label={hero.label}
        value={hero.value}
        caption={hero.caption}
        series={hero.series}
        icon={<Truck className="h-3.5 w-3.5" />}
        extras={[
          { label: 'In transit', value: stats.inTransit.value },
          { label: 'Pending', value: stats.pending.value },
          { label: 'On time', value: `${stats.onTime.value}%` },
          { label: 'Drivers free', value: stats.availableDrivers.value },
        ]}
      />
      <DashboardGrid storageKey="dispatch" cards={cards} editing={editing} />
    </div>
  );
}
