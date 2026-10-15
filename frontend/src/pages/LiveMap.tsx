import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Map as MapIcon, Navigation, Package, Warehouse, Route as RouteIcon, Zap, Phone, RefreshCw, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import { useRealtime } from '@/context/RealtimeContext';
import { statusHex, statusLabel } from '@/utils/status';

const KIGALI: [number, number] = [-1.9536, 30.0836];

const ago = (d?: string | null) => {
  if (!d) return 'never';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

function pin(color: string, label: string, shape: 'circle' | 'square' | 'drop' = 'drop', pulse = false) {
  const inner =
    shape === 'square'
      ? `<div style="width:30px;height:30px;border-radius:9px;background:${color};border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:#fff;font:700 11px Space Grotesk,sans-serif">${label}</div>`
      : shape === 'circle'
        ? `<div style="position:relative;width:34px;height:34px">${pulse ? `<span style="position:absolute;inset:-6px;border-radius:999px;background:${color};opacity:.25;animation:wtpulse 1.8s ease-out infinite"></span>` : ''}<div style="position:relative;width:34px;height:34px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font:700 11px Space Grotesk,sans-serif">${label}</div></div>`
        : `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.25)"></div>`;
  return L.divIcon({ html: inner, className: '', iconSize: [34, 34], iconAnchor: shape === 'drop' ? [12, 24] : [17, 17], popupAnchor: [0, -18] });
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 15, { duration: 0.8 });
  }, [target, map]);
  return null;
}

/** Real-time map of drivers, open deliveries and warehouses. */
export default function LiveMap() {
  const queryClient = useQueryClient();
  const { socket, connected } = useRealtime();
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [layer, setLayer] = useState({ drivers: true, orders: true, warehouses: true });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['live-map'],
    queryFn: async () => (await api.get('/live-map', { params: { t: Date.now() } })).data?.data,
    refetchInterval: 30_000,
  });

  const { data: route } = useQuery({
    queryKey: ['route', selectedDriver],
    queryFn: async () => (await api.get(`/routes/driver/${selectedDriver}`, { params: { t: Date.now() } })).data?.data,
    enabled: Boolean(selectedDriver),
  });

  // Move driver markers as positions arrive
  useEffect(() => {
    if (!socket) return;
    const onLocation = (u: { driverId: number; lat: number; lng: number; at: string }) => {
      queryClient.setQueryData(['live-map'], (old: any) =>
        old ? { ...old, drivers: old.drivers.map((d: any) => (d.id === u.driverId ? { ...d, lat: u.lat, lng: u.lng, lastLocationAt: u.at } : d)) } : old
      );
    };
    socket.on('driver:location', onLocation);
    return () => {
      socket.off('driver:location', onLocation);
    };
  }, [socket, queryClient]);

  const drivers = data?.drivers || [];
  const orders = data?.orders || [];
  const warehouses = data?.warehouses || [];
  const counts = useMemo(() => ({
    onDuty: drivers.filter((d: any) => d.status === 'ON_DUTY').length,
    pending: orders.filter((o: any) => o.status === 'PENDING').length,
    moving: orders.filter((o: any) => o.status === 'IN_TRANSIT').length,
  }), [drivers, orders]);

  const autoDispatch = async (order: any) => {
    const res = await api.post(`/auto-dispatch/${order.id}`, {});
    if (res.data?.success) {
      toast.success(`${order.orderNumber} dispatched automatically`);
      refetch();
    } else {
      toast.error(res.data?.error?.message || 'Could not auto-dispatch');
    }
  };

  return (
    <div>
      <style>{'@keyframes wtpulse{0%{transform:scale(.6);opacity:.5}100%{transform:scale(1.6);opacity:0}}.leaflet-popup-content{font-family:Space Grotesk,sans-serif;margin:12px 14px}.leaflet-container{font-family:Space Grotesk,sans-serif}'}</style>
      <PageHeader
        title="Live Map"
        subtitle="Drivers, open deliveries and warehouses across Rwanda"
        breadcrumbs={[{ label: 'Operations' }]}
        icon={<MapIcon className="h-5 w-5" />}
        actions={
          <>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${connected ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
              <Radio className="h-3.5 w-3.5" /> {connected ? 'Live' : 'Updating every 30s'}
            </span>
            <button onClick={() => refetch()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : (
            <MapContainer center={KIGALI} zoom={12} scrollWheelZoom className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyTo target={focus} />
              {layer.warehouses && warehouses.map((w: any) => (
                <Marker key={`w${w.id}`} position={[w.lat, w.lng]} icon={pin('#23415A', 'WH', 'square')}>
                  <Popup><b>{w.name}</b><br />{w.code}</Popup>
                </Marker>
              ))}
              {layer.orders && orders.map((o: any) => (
                <Marker key={`o${o.id}`} position={[o.lat, o.lng]} icon={pin(statusHex(o.status), '', 'drop')}>
                  <Popup>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold">{o.orderNumber}</p>
                      <p className="text-xs text-gray-600">{o.customerName}<br />{o.deliveryAddress}</p>
                      <p className="text-xs">{statusLabel(o.status)} · {statusLabel(o.priority)} priority</p>
                      {o.status === 'PENDING' && (
                        <button onClick={() => autoDispatch(o)} className="mt-1 inline-flex items-center gap-1 rounded-lg bg-primary-500 px-2.5 py-1 text-xs font-semibold text-white">
                          <Zap className="h-3 w-3" /> Auto-dispatch
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              {layer.drivers && drivers.map((d: any) => (
                <Marker
                  key={`d${d.id}`}
                  position={[d.lat, d.lng]}
                  icon={pin(d.status === 'ON_DUTY' ? '#3B82F6' : d.status === 'AVAILABLE' ? '#10B981' : '#94A3B8', d.name.split(' ').map((n: string) => n[0]).slice(0, 2).join(''), 'circle', d.status === 'ON_DUTY')}
                  eventHandlers={{ click: () => setSelectedDriver(d.id) }}
                >
                  <Popup>
                    <p className="text-sm font-bold">{d.name}</p>
                    <p className="text-xs text-gray-600">{statusLabel(d.status)}{d.plate ? ` · ${d.plate}` : ''}<br />Seen {ago(d.lastLocationAt)}</p>
                  </Popup>
                </Marker>
              ))}
              {route?.stops?.length > 0 && (
                <Polyline positions={[[route.start.lat, route.start.lng], ...route.stops.map((s: any) => [s.lat, s.lng])]} pathOptions={{ color: '#FF8C42', weight: 4, dashArray: '8 8' }} />
              )}
            </MapContainer>
          )}

          <div className="absolute left-3 top-3 z-[400] flex flex-wrap gap-1.5">
            {([['drivers', 'Drivers', Navigation], ['orders', 'Deliveries', Package], ['warehouses', 'Warehouses', Warehouse]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setLayer((l) => ({ ...l, [key]: !l[key] }))}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-soft transition ${layer[key] ? 'bg-white text-gray-800' : 'bg-white/70 text-gray-400 line-through'}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[['On duty', counts.onDuty, '#3B82F6'], ['To dispatch', counts.pending, '#94A3B8'], ['Moving', counts.moving, '#FF8C42']].map(([label, value, color]) => (
              <div key={label as string} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-soft">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                <p className="mt-1 text-xl font-bold" style={{ color: color as string }}>{value}</p>
              </div>
            ))}
          </div>

          {route && (
            <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-accent-800"><RouteIcon className="h-4 w-4" /> {route.driver.name}'s best route</p>
              <p className="mt-1 text-xs text-accent-700">{route.stops.length} stops · {route.totalKm} km · about {route.totalMinutes} min{route.savedKm > 0 ? ` · saves ${route.savedKm} km` : ''}</p>
              <ol className="mt-2 space-y-1 text-xs text-gray-700">
                {route.stops.map((s: any) => (
                  <li key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.sequence}. {s.customerName}</span><span className={`shrink-0 ${s.late ? 'font-semibold text-error-600' : 'text-gray-500'}`}>{new Date(s.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white shadow-soft">
            <p className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">Drivers</p>
            <ul className="max-h-[48vh] divide-y divide-gray-50 overflow-y-auto">
              {drivers.map((d: any) => (
                <li key={d.id}>
                  <button
                    onClick={() => { setFocus([d.lat, d.lng]); setSelectedDriver(d.id); }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50 ${selectedDriver === d.id ? 'bg-primary-50/60' : ''}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.status === 'ON_DUTY' ? '#3B82F6' : d.status === 'AVAILABLE' ? '#10B981' : '#94A3B8' }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-800">{d.name}</span>
                      <span className="block text-[11px] text-gray-500">{d.plate || 'No vehicle'} · {ago(d.lastLocationAt)}</span>
                    </span>
                    <StatusBadge status={d.status} />
                    {d.phone && <a href={`tel:${d.phone}`} onClick={(e) => e.stopPropagation()} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Phone className="h-3.5 w-3.5" /></a>}
                  </button>
                </li>
              ))}
              {!drivers.length && !isLoading && <li className="px-4 py-6 text-center text-xs text-gray-500">No drivers are sharing their location yet.</li>}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
