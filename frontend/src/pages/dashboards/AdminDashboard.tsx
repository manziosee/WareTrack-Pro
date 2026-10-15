import { useState } from 'react';
import {
  ShoppingCart, Wallet, Clock, Users, PackageX, UserPlus, TrendingUp, PieChart, Activity, CalendarDays, Flag,
  Building2, Package, CreditCard, Warehouse, Trophy, Truck, MapPin, AlertTriangle, History, DollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '@/services/insightsService';
import Greeting from '@/components/dashboard/Greeting';
import HeroCard from '@/components/dashboard/HeroCard';
import DashboardGrid, { type DashboardCard } from '@/components/dashboard/DashboardGrid';
import DashboardToolbar from '@/components/dashboard/DashboardToolbar';
import StatCard from '@/components/ui/StatCard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { TrendChart, BarsChart, DonutChart, BarList, formatRWF } from '@/components/charts/Widgets';
import { AtRiskList, ActivityFeed, RestockList, Leaderboard } from '@/components/dashboard/Lists';
import { STATUS } from '@/components/charts/chartConfig';
import { statusLabel } from '@/utils/status';

const paymentLabel: Record<string, string> = { MTN_MOMO: 'MTN MoMo', AIRTEL_MONEY: 'Airtel Money', CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', CARD: 'Card' };
const paymentColor: Record<string, string> = { MTN_MOMO: '#FFC533', AIRTEL_MONEY: '#E0578A', CASH: '#2A9D8F', BANK_TRANSFER: '#3B7DC4', CARD: '#8B5CF6' };

export default function AdminDashboard() {
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
      id: 'stats',
      title: 'Key numbers',
      span: 3,
      bare: true,
      render: () => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="Orders · 7 days" value={stats.orders.value} change={stats.orders.change} trend={stats.orders.trend} icon={<ShoppingCart className="h-5 w-5" />} to="/orders" />
          <StatCard label="Revenue · 7 days" value={stats.revenue.value} prefix="RWF " compact change={stats.revenue.change} trend={stats.revenue.trend} icon={<Wallet className="h-5 w-5" />} tone="success" to="/reports" />
          <StatCard label="On-time delivery" value={stats.onTime.value} suffix="%" decimals={1} change={stats.onTime.change} changeLabel="pts vs prior 30d" trend={stats.onTime.trend} icon={<Clock className="h-5 w-5" />} tone="info" />
          <StatCard label="Drivers working" value={stats.activeDrivers.value} suffix={` / ${stats.activeDrivers.total}`} icon={<Users className="h-5 w-5" />} tone="accent" to="/drivers" />
          <StatCard label="Items to restock" value={stats.lowStock.value} icon={<PackageX className="h-5 w-5" />} tone={stats.lowStock.value > 0 ? 'warning' : 'success'} to="/inventory" />
          <StatCard label="Awaiting approval" value={stats.pendingUsers.value} suffix={` · ${stats.pendingUsers.activeUsers} active`} icon={<UserPlus className="h-5 w-5" />} tone={stats.pendingUsers.value > 0 ? 'error' : 'primary'} to="/users" />
        </div>
      ),
    },
    {
      id: 'revenueTrend', title: 'Revenue and orders', subtitle: 'Last 30 days', icon: <TrendingUp className="h-4 w-4" />, span: 2,
      render: () => (
        <TrendChart
          data={charts.revenueTrend}
          toggle
          height={260}
          series={[{ key: 'revenue', name: 'Revenue' }, { key: 'orders', name: 'Orders', color: '#FF8C42' }]}
          valueFormatter={(v) => (Number(v) > 1000 ? formatRWF(Number(v)) : String(v))}
        />
      ),
    },
    {
      id: 'statusMix', title: 'Order status', subtitle: 'Orders created in the last 30 days', icon: <PieChart className="h-4 w-4" />,
      render: () => <DonutChart data={charts.statusMix} centerLabel="Orders" statusColors />,
    },
    {
      id: 'onTimeTrend', title: 'On-time rate', subtitle: 'Weekly, target 90%', icon: <Activity className="h-4 w-4" />,
      render: () => (
        <TrendChart
          data={charts.onTimeTrend}
          series={[{ key: 'onTime', name: 'On time', color: STATUS.good }]}
          height={200}
          referenceY={90}
          yFormatter={(v) => `${v}%`}
          valueFormatter={(v) => `${v}%`}
        />
      ),
    },
    {
      id: 'byWeekday', title: 'Busiest days', subtitle: 'Orders by weekday, last 30 days', icon: <CalendarDays className="h-4 w-4" />,
      render: () => <BarsChart data={charts.byWeekday} xKey="name" series={[{ key: 'value', name: 'Orders' }]} height={200} highlightMax />,
    },
    {
      id: 'priorityMix', title: 'Priority mix', subtitle: 'Last 30 days', icon: <Flag className="h-4 w-4" />,
      render: () => <DonutChart data={charts.priorityMix} centerLabel="Orders" statusColors height={180} />,
    },
    {
      id: 'topCustomers', title: 'Top customers', subtitle: 'Delivered revenue, last 30 days', icon: <Building2 className="h-4 w-4" />,
      render: () => <BarList data={charts.topCustomers.map((c: any) => ({ name: c.name, value: c.revenue, secondary: `${c.orders} orders` }))} format={formatRWF} />,
    },
    {
      id: 'topProducts', title: 'Best-selling products', subtitle: 'Revenue, last 30 days', icon: <Package className="h-4 w-4" />,
      render: () => <BarList data={charts.topProducts.map((p: any) => ({ name: p.name, value: p.revenue, secondary: `${p.units} units` }))} format={formatRWF} color="#2A9D8F" />,
    },
    {
      id: 'paymentMix', title: 'Payment methods', subtitle: 'Paid orders, last 30 days', icon: <CreditCard className="h-4 w-4" />,
      render: () => (
        <DonutChart
          data={charts.paymentMix.map((p: any) => ({ name: paymentLabel[p.name] || p.name, value: p.value, color: paymentColor[p.name] }))}
          centerLabel="Paid"
          height={180}
        />
      ),
    },
    {
      id: 'inventoryValue', title: 'Stock value by category', subtitle: 'Current inventory, RWF', icon: <DollarSign className="h-4 w-4" />, span: 2,
      render: () => <BarsChart data={charts.inventoryByCategory} xKey="name" series={[{ key: 'value', name: 'Stock value' }]} height={220} valueFormatter={(v) => formatRWF(Number(v))} />,
    },
    {
      id: 'stockByWarehouse', title: 'Stock by warehouse', subtitle: 'Units held and space used', icon: <Warehouse className="h-4 w-4" />,
      render: () => (
        <BarList
          data={charts.stockByWarehouse.map((w: any) => ({ name: w.name, value: w.units, secondary: w.utilization != null ? `${w.utilization}% full` : undefined }))}
          format={(v) => `${v.toLocaleString()} units`}
          color="#8B5CF6"
        />
      ),
    },
    {
      id: 'leaderboard', title: 'Driver leaderboard', subtitle: 'Last 30 days', icon: <Trophy className="h-4 w-4" />, span: 2,
      action: <Link to="/drivers" className="text-xs font-semibold text-primary-600 hover:underline">All drivers</Link>,
      render: () => <Leaderboard rows={charts.leaderboard} />,
    },
    {
      id: 'fleet', title: 'Fleet status', subtitle: 'Vehicles right now', icon: <Truck className="h-4 w-4" />,
      render: () => (
        <div className="space-y-5">
          <DonutChart data={charts.vehicleStatus} centerLabel="Vehicles" statusColors height={160} />
          <div className="flex flex-wrap gap-2">
            {charts.driverStatus.map((d: any) => (
              <span key={d.name} className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                {statusLabel(d.name)} drivers: <b className="text-gray-900">{d.value}</b>
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'areaMix', title: 'Deliveries by area', subtitle: 'Kigali neighbourhoods, last 30 days', icon: <MapPin className="h-4 w-4" />,
      render: () => <BarList data={charts.areaMix} format={(v) => `${v} orders`} color="#E0578A" />,
    },
    {
      id: 'atRisk', title: 'Deliveries at risk', subtitle: 'Due within 12 hours or overdue', icon: <AlertTriangle className="h-4 w-4" />,
      render: () => <AtRiskList items={lists.atRisk} />,
    },
    {
      id: 'restock', title: 'Restock soon', subtitle: 'Lowest stock first', icon: <PackageX className="h-4 w-4" />,
      action: <Link to="/inventory" className="text-xs font-semibold text-primary-600 hover:underline">Inventory</Link>,
      render: () => <RestockList items={lists.restock} />,
    },
    {
      id: 'activity', title: 'Recent activity', subtitle: 'Latest changes across the system', icon: <History className="h-4 w-4" />, span: 2,
      render: () => <ActivityFeed items={lists.activity} />,
    },
  ];

  return (
    <div>
      <Greeting
        summary={`${stats.scheduledToday} deliveries scheduled today · ${stats.lowStock.value} items need restocking`}
        actions={<DashboardToolbar editing={editing} onToggleEditing={() => setEditing((v) => !v)} updatedAt={dataUpdatedAt} />}
      />
      <HeroCard
        label={hero.label}
        value={hero.value}
        prefix="RWF "
        compact
        change={hero.change}
        caption={hero.caption}
        series={hero.series}
        icon={<Wallet className="h-3.5 w-3.5" />}
        extras={[
          { label: 'Scheduled today', value: stats.scheduledToday },
          { label: 'On time', value: `${stats.onTime.value}%` },
          { label: 'Orders · 7d', value: stats.orders.value },
          { label: 'To approve', value: stats.pendingUsers.value },
        ]}
      />
      <DashboardGrid storageKey="admin" cards={cards} editing={editing} />
    </div>
  );
}
