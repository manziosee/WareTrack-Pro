import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck, Package, Wrench, User, MapPin, Clock } from 'lucide-react';
import api from '@/services/api';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { DetailSection } from '@/components/ui/Detail';
import { formatDate, formatDateTime } from '@/utils/formatters';

const rwf = (v: number) => `RWF ${Math.round(Number(v) || 0).toLocaleString()}`;

async function load(url: string) {
  const res = await api.get(url, { params: { t: Date.now() } });
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Could not load');
  return res.data?.data;
}

function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="mb-3 flex w-fit rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`rounded-md px-2.5 py-1 transition ${active === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1 text-gray-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function OrderRow({ o, right }: { o: any; right?: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <span className="min-w-0">
        <Link to={`/orders/${o.id}`} className="font-semibold text-primary-700 hover:underline">{o.orderNumber}</Link>
        <span className="ml-1.5 text-gray-700">{o.customerName}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{o.deliveryAddress}</span>
        </span>
        {right}
      </span>
      <span className="shrink-0 text-right">
        <StatusBadge status={o.status} />
        <span className="mt-1 block text-[11px] text-gray-400">{formatDate(o.deliveredAt || o.timeSlotStart || o.scheduledDate || o.updatedAt)}</span>
      </span>
    </li>
  );
}

/** Driver panel: what they are doing now, what they finished and which vehicles they drove. */
export function DriverDeliveries({ driverId }: { driverId: number }) {
  const [tab, setTab] = useState('active');
  const { data, isLoading } = useQuery({ queryKey: ['driver-assignments', driverId], queryFn: () => load(`/drivers/${driverId}/assignments`), refetchInterval: 30_000 });

  if (isLoading) return <DetailSection title="Deliveries" icon={<Package className="h-4 w-4" />}><p className="text-sm text-gray-500">Loading…</p></DetailSection>;
  if (!data) return null;
  const { active = [], finished = [], vehiclesUsed = [], summary = {} } = data;
  const current = active.find((o: any) => o.vehicle)?.vehicle || data.driver?.currentVehicle;

  return (
    <>
      <DetailSection title="Vehicle" icon={<Truck className="h-4 w-4" />}>
        {current ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600"><Truck className="h-4 w-4" /></span>
              <span>
                <Link to={`/vehicles?view=${current.id}`} className="font-semibold text-gray-900 hover:underline">{current.plateNumber}</Link>
                <span className="block text-xs text-gray-500">{current.type}{current.vehicleModel ? ` · ${current.vehicleModel}` : ''}</span>
              </span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active.length ? 'bg-info-50 text-info-700' : 'bg-gray-100 text-gray-600'}`}>
              {active.length ? 'Driving now' : 'Last used'}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No vehicle yet. One is assigned with each delivery.</p>
        )}
        {vehiclesUsed.length > 1 && (
          <p className="mt-2 text-xs text-gray-500">
            Has driven: {vehiclesUsed.map((v: any) => `${v.plateNumber} (${v.trips})`).join(', ')}
          </p>
        )}
      </DetailSection>

      <DetailSection title="Deliveries" icon={<Package className="h-4 w-4" />}>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-info-50 p-2"><p className="text-base font-bold text-info-700">{summary.active || 0}</p><p className="text-[11px] text-info-700/80">In progress</p></div>
          <div className="rounded-lg bg-success-50 p-2"><p className="text-base font-bold text-success-700">{summary.delivered || 0}</p><p className="text-[11px] text-success-700/80">Delivered</p></div>
          <div className="rounded-lg bg-error-50 p-2"><p className="text-base font-bold text-error-700">{summary.failed || 0}</p><p className="text-[11px] text-error-700/80">Failed</p></div>
        </div>
        <Tabs
          tabs={[{ key: 'active', label: 'In progress', count: active.length }, { key: 'finished', label: 'Finished', count: finished.length }]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'active' ? (
          active.length ? (
            <ul className="divide-y divide-gray-100">
              {active.map((o: any) => <OrderRow key={o.id} o={o} right={o.vehicle && <span className="mt-0.5 block text-xs text-gray-500">Vehicle {o.vehicle.plateNumber}</span>} />)}
            </ul>
          ) : (
            <EmptyState compact title="Nothing in progress" description="This driver is free for a new delivery." />
          )
        ) : finished.length ? (
          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto pr-1">
            {finished.map((o: any) => <OrderRow key={o.id} o={o} right={o.vehicle && <span className="mt-0.5 block text-xs text-gray-500">Vehicle {o.vehicle.plateNumber}</span>} />)}
          </ul>
        ) : (
          <EmptyState compact title="No finished deliveries yet" />
        )}
        {summary.deliveredValue > 0 && <p className="mt-3 text-xs text-gray-500">Delivered value: <span className="font-semibold text-gray-800">{rwf(summary.deliveredValue)}</span></p>}
      </DetailSection>
    </>
  );
}

/** Vehicle panel: current use, the drivers who used it and everything it has done since it joined. */
export function VehicleUsage({ vehicleId }: { vehicleId: number }) {
  const [tab, setTab] = useState('trips');
  const { data, isLoading } = useQuery({ queryKey: ['vehicle-history', vehicleId], queryFn: () => load(`/vehicles/${vehicleId}/history`), refetchInterval: 30_000 });

  if (isLoading) return <DetailSection title="Usage" icon={<Truck className="h-4 w-4" />}><p className="text-sm text-gray-500">Loading…</p></DetailSection>;
  if (!data) return null;
  const { active = [], currentDriver, drivers = [], timeline = [], summary = {} } = data;

  return (
    <>
      <DetailSection title="Right now" icon={<Clock className="h-4 w-4" />}>
        {active.length ? (
          <div className="space-y-2">
            {currentDriver && (
              <p className="flex items-center gap-2 text-sm text-gray-700">
                <User className="h-4 w-4 text-gray-400" />
                Driven by <Link to={`/drivers?view=${currentDriver.id}`} className="font-semibold text-gray-900 hover:underline">{currentDriver.name}</Link>
                {currentDriver.phone && <a href={`tel:${currentDriver.phone}`} className="text-xs text-primary-600 hover:underline">{currentDriver.phone}</a>}
              </p>
            )}
            <ul className="divide-y divide-gray-100">
              {active.map((o: any) => <OrderRow key={o.id} o={o} />)}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Not on a delivery. It becomes <b>In Use</b> automatically when assigned to one.</p>
        )}
      </DetailSection>

      <DetailSection title="History" icon={<Truck className="h-4 w-4" />}>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-gray-50 p-2"><p className="text-base font-bold text-gray-900">{summary.trips || 0}</p><p className="text-[11px] text-gray-500">Deliveries</p></div>
          <div className="rounded-lg bg-gray-50 p-2"><p className="text-base font-bold text-gray-900">{drivers.length}</p><p className="text-[11px] text-gray-500">Drivers</p></div>
          <div className="rounded-lg bg-gray-50 p-2"><p className="text-base font-bold text-gray-900">{rwf(summary.maintenanceCost || 0).replace('RWF ', '')}</p><p className="text-[11px] text-gray-500">Service cost (RWF)</p></div>
        </div>
        <p className="mb-3 text-xs text-gray-500">In the fleet since {formatDate(summary.inServiceSince)}</p>
        <Tabs
          tabs={[{ key: 'trips', label: 'All activity', count: timeline.length }, { key: 'drivers', label: 'Drivers', count: drivers.length }]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'drivers' ? (
          drivers.length ? (
            <ul className="divide-y divide-gray-100">
              {drivers.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link to={`/drivers?view=${d.id}`} className="font-medium text-gray-900 hover:underline">{d.name}</Link>
                  <span className="text-xs text-gray-500">{d.trips} {d.trips === 1 ? 'delivery' : 'deliveries'} · last {formatDate(d.lastTrip)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="No one has driven it yet" />
          )
        ) : timeline.length ? (
          <ol className="max-h-96 space-y-0 overflow-y-auto pr-1">
            {timeline.map((t: any, i: number) => (
              <li key={`${t.kind}-${t.orderId || t.id}-${i}`} className="relative flex gap-3 pb-3 pl-1 text-sm">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${t.kind === 'maintenance' ? 'bg-warning-50 text-warning-600' : 'bg-primary-50 text-primary-600'}`}>
                  {t.kind === 'maintenance' ? <Wrench className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  {t.kind === 'maintenance' ? (
                    <>
                      <span className="font-medium text-gray-800">{t.type?.replace(/_/g, ' ').toLowerCase().replace(/^./, (c: string) => c.toUpperCase())}</span>
                      <span className="text-gray-600"> · {t.description}</span>
                      <span className="block text-xs text-gray-500">{formatDateTime(t.at)} · {rwf(t.cost)} · {t.completed ? 'done' : 'scheduled'}</span>
                    </>
                  ) : (
                    <>
                      <Link to={`/orders/${t.orderId}`} className="font-semibold text-primary-700 hover:underline">{t.orderNumber}</Link>
                      <span className="text-gray-700"> · {t.customerName}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {formatDateTime(t.at)}{t.driver ? ` · ${t.driver.name}` : ''} · {rwf(t.amount)}
                      </span>
                    </>
                  )}
                </span>
                {t.kind === 'delivery' && <span className="shrink-0"><StatusBadge status={t.status} /></span>}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState compact title="No activity yet" description="Deliveries and services will appear here." />
        )}
      </DetailSection>
    </>
  );
}
