import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Package, Truck, Navigation, CheckCircle2, Clock, Star, XCircle, MapPin } from 'lucide-react';
import { LogoMark } from '@/components/ui/Logo';
import api from '@/services/api';

const STEPS = [
  { status: 'PENDING', label: 'Order placed', icon: Package },
  { status: 'DISPATCHED', label: 'Ready & assigned', icon: Truck },
  { status: 'IN_TRANSIT', label: 'On the way', icon: Navigation },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

const truckIcon = L.divIcon({
  html: '<div style="width:36px;height:36px;border-radius:999px;background:#FF8C42;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:16px">🚚</div>',
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/** Public page for customers to follow their delivery. */
export default function TrackOrder() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(orderNumber || '');

  useEffect(() => setInput(orderNumber || ''), [orderNumber]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['track', orderNumber],
    queryFn: async () => {
      const res = await api.get(`/public/track/${encodeURIComponent(orderNumber!)}`, { params: { t: Date.now() } });
      if (!res.data?.success) throw new Error(res.data?.error?.message || 'Order not found');
      return res.data.data;
    },
    enabled: Boolean(orderNumber),
    refetchInterval: (data: any) => (data?.status === 'IN_TRANSIT' ? 30_000 : false),
    retry: false,
  });

  const stepIndex = data ? STEPS.findIndex((s) => s.status === data.status) : -1;
  const failed = data && ['FAILED', 'CANCELLED', 'RETURNED'].includes(data.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2"><LogoMark className="h-8 w-8" /><span className="font-bold text-gray-900">WareTrack Pro</span></Link>
          <span className="text-xs text-gray-500">Delivery tracking</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Track your delivery</h1>
        <p className="mt-1 text-sm text-gray-500">Enter the order number from your SMS or receipt, e.g. ORD-001234.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) navigate(`/track/${input.trim().toUpperCase()}`); }} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="ORD-001234" className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-base uppercase outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100" />
          </div>
          <button type="submit" className="h-12 rounded-xl bg-primary-500 px-5 font-semibold text-white shadow-glow hover:bg-primary-600">Track</button>
        </form>

        {orderNumber && isLoading && <div className="mt-8 h-64 animate-pulse rounded-2xl bg-white" />}
        {orderNumber && error && (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-soft">
            <XCircle className="mx-auto h-10 w-10 text-error-400" />
            <p className="mt-3 font-semibold text-gray-900">We couldn't find {orderNumber}</p>
            <p className="text-sm text-gray-500">Check the number and try again.</p>
          </div>
        )}

        {data && (
          <div className="mt-8 space-y-5 animate-page-in">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
              <div className="bg-[linear-gradient(135deg,#2F5778,#4682B4)] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.15em] text-white/70">Order {data.orderNumber}</p>
                <p className="mt-1 text-2xl font-bold">
                  {data.status === 'DELIVERED' ? 'Delivered 🎉' : data.status === 'IN_TRANSIT' ? (data.etaMinutes ? `Arriving in about ${data.etaMinutes} min` : 'On the way') : failed ? 'Delivery needs attention' : data.status === 'DISPATCHED' ? 'Ready to go' : 'Order received'}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {data.status === 'DELIVERED' ? `Delivered ${fmt(data.deliveredAt)}` : data.timeSlotStart ? `Delivery window ${fmt(data.timeSlotStart)}${data.timeSlotEnd ? `–${new Date(data.timeSlotEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}` : ''}
                </p>
              </div>
              <div className="p-5">
                {failed ? (
                  <div className="flex items-start gap-3 rounded-xl bg-error-50 p-4 text-sm text-error-800">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{data.status === 'FAILED' ? `We couldn't complete this delivery${data.failureReason ? ` (${data.failureReason.toLowerCase()})` : ''}. Our team will contact you to arrange a new time.` : `This order is ${data.status.toLowerCase()}.`}</span>
                  </div>
                ) : (
                  <ol className="grid grid-cols-4 gap-2">
                    {STEPS.map((s, i) => {
                      const done = i <= stepIndex;
                      return (
                        <li key={s.status} className="flex flex-col items-center text-center">
                          <span className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${done ? 'bg-primary-500 text-white shadow-glow' : 'bg-gray-100 text-gray-400'} ${i === stepIndex ? 'ring-4 ring-primary-100' : ''}`}>
                            <s.icon className="h-5 w-5" />
                          </span>
                          <span className={`mt-2 text-xs font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Delivering to</p><p className="mt-0.5 flex items-center gap-1 font-semibold text-gray-900"><MapPin className="h-3.5 w-3.5 text-accent-500" />{data.area}</p></div>
                  <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Items</p><p className="mt-0.5 font-semibold text-gray-900">{data.itemCount} units</p></div>
                  {data.driver && (
                    <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Your driver</p><p className="mt-0.5 flex items-center gap-1 font-semibold text-gray-900">{data.driver.firstName}{data.driver.rating ? <span className="flex items-center text-xs font-medium text-warning-600"><Star className="ml-1 h-3 w-3 fill-current" />{Number(data.driver.rating).toFixed(1)}</span> : null}</p></div>
                  )}
                </div>
              </div>
            </div>

            {data.destination && (
              <div className="h-72 overflow-hidden rounded-2xl border border-gray-100 shadow-soft">
                <MapContainer center={[data.destination.lat, data.destination.lng]} zoom={14} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <CircleMarker center={[data.destination.lat, data.destination.lng]} radius={40} pathOptions={{ color: '#4682B4', fillColor: '#4682B4', fillOpacity: 0.12, weight: 2 }} />
                  {data.driver?.location && <Marker position={[data.driver.location.lat, data.driver.location.lng]} icon={truckIcon} />}
                </MapContainer>
              </div>
            )}

            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400"><Clock className="h-3 w-3" /> Updated {new Date(data.updatedAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}{data.status === 'IN_TRANSIT' ? ' · refreshes every 30 seconds' : ''}</p>
          </div>
        )}
      </main>
    </div>
  );
}
