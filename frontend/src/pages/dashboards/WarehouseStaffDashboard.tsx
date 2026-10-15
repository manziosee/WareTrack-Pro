import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes, Wallet, PackageCheck, ClipboardList, Timer, FileText, ArrowLeftRight, DollarSign, Warehouse, Flame,
  CalendarClock, PieChart, PackageX, ListChecks, Package,
} from 'lucide-react';
import { useDashboardData } from '@/services/insightsService';
import Greeting from '@/components/dashboard/Greeting';
import HeroCard from '@/components/dashboard/HeroCard';
import DashboardGrid, { type DashboardCard } from '@/components/dashboard/DashboardGrid';
import DashboardToolbar from '@/components/dashboard/DashboardToolbar';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { BarsChart, DonutChart, BarList, formatRWF } from '@/components/charts/Widgets';
import { RestockList } from '@/components/dashboard/Lists';
import { STATUS } from '@/components/charts/chartConfig';

export default function WarehouseStaffDashboard() {
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
          <StatCard label="Products (SKUs)" value={stats.skus.value} icon={<Boxes className="h-5 w-5" />} to="/inventory" />
          <StatCard label="Stock value" value={stats.stockValue.value} prefix="RWF " compact icon={<Wallet className="h-5 w-5" />} tone="success" />
          <StatCard label="Units shipped · 7 days" value={stats.unitsShipped.value} change={stats.unitsShipped.change} trend={stats.unitsShipped.trend} icon={<PackageCheck className="h-5 w-5" />} tone="info" />
          <StatCard label="Orders to pick" value={stats.toPick.value} icon={<ClipboardList className="h-5 w-5" />} tone="accent" to="/orders" />
          <StatCard label="Batches expiring · 30d" value={stats.expiring.value} icon={<Timer className="h-5 w-5" />} tone={stats.expiring.value > 0 ? 'warning' : 'success'} />
          <StatCard label="Open purchase orders" value={stats.openPOs.value} icon={<FileText className="h-5 w-5" />} tone="primary" />
        </div>
      ),
    },
    {
      id: 'stockFlow', title: 'Stock in vs stock out', subtitle: 'Units per day, last 30 days', icon: <ArrowLeftRight className="h-4 w-4" />, span: 2,
      render: () => (
        <BarsChart
          data={charts.stockFlow}
          series={[{ key: 'stockIn', name: 'Received', color: STATUS.good }, { key: 'stockOut', name: 'Shipped', color: '#FF8C42' }]}
          height={250}
        />
      ),
    },
    {
      id: 'orderStatus', title: 'Order pipeline', subtitle: 'Last 30 days', icon: <PieChart className="h-4 w-4" />,
      render: () => <DonutChart data={charts.orderStatus} centerLabel="Orders" statusColors />,
    },
    {
      id: 'categoryValue', title: 'Stock value by category', subtitle: 'RWF', icon: <DollarSign className="h-4 w-4" />, span: 2,
      render: () => (
        <BarsChart data={charts.inventoryByCategory} xKey="name" series={[{ key: 'value', name: 'Stock value' }]} height={230} valueFormatter={(v) => formatRWF(Number(v))} />
      ),
    },
    {
      id: 'categoryUnits', title: 'Products per category', subtitle: 'Number of SKUs', icon: <Package className="h-4 w-4" />,
      render: () => <DonutChart data={charts.inventoryByCategory.map((c: any) => ({ name: c.name, value: c.items }))} centerLabel="SKUs" height={190} />,
    },
    {
      id: 'warehouses', title: 'Warehouses', subtitle: 'Units held and space used', icon: <Warehouse className="h-4 w-4" />,
      render: () => (
        <ul className="space-y-4">
          {charts.stockByWarehouse.map((w: any) => (
            <li key={w.code}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span>
                  <span className="font-semibold text-gray-800">{w.name}</span>
                  <span className="ml-1.5 text-gray-400">{w.city}</span>
                </span>
                <span className="font-semibold tabular-nums text-gray-900">{w.units.toLocaleString()} units</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600" style={{ width: `${Math.max(3, w.utilization ?? 0)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">{w.utilization ?? 0}% of capacity · {formatRWF(w.value)}</p>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'topMovers', title: 'Fastest-moving products', subtitle: 'Units shipped, last 30 days', icon: <Flame className="h-4 w-4" />,
      render: () => <BarList data={charts.topMovers.map((p: any) => ({ name: p.name, value: p.units }))} format={(v) => `${v.toLocaleString()} units`} color="#2A9D8F" />,
    },
    {
      id: 'expiry', title: 'Expiry timeline', subtitle: 'Units expiring in the next 8 weeks', icon: <CalendarClock className="h-4 w-4" />,
      render: () => <BarsChart data={charts.expiryWeeks} series={[{ key: 'value', name: 'Units expiring', color: STATUS.warning }]} height={200} />,
    },
    {
      id: 'restock', title: 'Restock now', subtitle: 'Lowest stock first', icon: <PackageX className="h-4 w-4" />,
      action: <Link to="/inventory" className="text-xs font-semibold text-primary-600 hover:underline">Inventory</Link>,
      render: () => <RestockList items={lists.restock} />,
    },
    {
      id: 'expiring', title: 'Batches expiring soon', subtitle: 'Use or move these first', icon: <Timer className="h-4 w-4" />,
      render: () =>
        lists.expiring.length ? (
          <ul className="divide-y divide-gray-50">
            {lists.expiring.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-800">{b.item}</span>
                  <span className="block text-xs text-gray-400">Batch {b.batchNumber} · {b.quantity} {b.unit}</span>
                </span>
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${b.daysLeft <= 7 ? 'bg-error-50 text-error-700' : b.daysLeft <= 21 ? 'bg-warning-50 text-warning-700' : 'bg-gray-100 text-gray-600'}`}>
                  {b.daysLeft <= 0 ? 'Expired' : `${b.daysLeft} days`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title="Nothing expiring soon" />
        ),
    },
    {
      id: 'purchaseOrders', title: 'Purchase orders', subtitle: 'All time, by status', icon: <FileText className="h-4 w-4" />,
      render: () => <DonutChart data={charts.purchaseOrderMix} centerLabel="POs" statusColors height={180} />,
    },
    {
      id: 'toPick', title: 'Next orders to pick', subtitle: 'Pending orders, newest first', icon: <ListChecks className="h-4 w-4" />, span: 2,
      action: <Link to="/orders" className="text-xs font-semibold text-primary-600 hover:underline">All orders</Link>,
      render: () =>
        lists.toPick.length ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {lists.toPick.map((o: any) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/30">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{o.orderNumber}</span>
                  <span className="block truncate text-xs text-gray-500">{o.customerName} · {o.items} item{o.items === 1 ? '' : 's'}</span>
                </span>
                <StatusBadge status={o.priority} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState compact title="Nothing waiting to be picked" description="All pending orders have been prepared." />
        ),
    },
  ];

  return (
    <div>
      <Greeting
        summary={`${stats.toPick.value} orders to pick · ${stats.expiring.value} batches expiring this month`}
        actions={<DashboardToolbar editing={editing} onToggleEditing={() => setEditing((v) => !v)} updatedAt={dataUpdatedAt} />}
      />
      <HeroCard
        label={hero.label}
        value={hero.value}
        caption={hero.caption}
        series={hero.series}
        icon={<PackageX className="h-3.5 w-3.5" />}
        extras={[
          { label: 'Products', value: stats.skus.value },
          { label: 'Stock value', value: formatRWF(stats.stockValue.value) },
          { label: 'To pick', value: stats.toPick.value },
          { label: 'Open POs', value: stats.openPOs.value },
        ]}
      />
      <DashboardGrid storageKey="warehouse" cards={cards} editing={editing} />
    </div>
  );
}
