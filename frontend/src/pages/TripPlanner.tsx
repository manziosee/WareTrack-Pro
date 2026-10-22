import { useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Route, Truck, Plus, X, Send, Ban, RefreshCw, Package, Search, AlertTriangle, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/services/api';
import { formatDate } from '@/utils/formatters';

interface Load { weightKg: number; volumeL: number; units?: number; missingWeight: number }
interface PlannerOrder { id: number; orderNumber: string; customerName: string; deliveryAddress: string; priority: string; totalAmount: string; scheduledDate: string | null; packingStatus: string | null; load: Load }
interface Vehicle { id: number; plateNumber: string; type: string; capacity: number; volumeL: string | null; vehicleModel: string | null }
interface Driver { id: number; name: string; phone: string; currentVehicleId: number | null }
interface Trip {
  id: number; tripNumber: string; status: string; plannedDate: string; notes: string | null;
  vehicle: { id: number; plateNumber: string; capacity: number; volumeL: string | null };
  driver: { id: number; name: string };
  orders: { id: number; orderNumber: string; customerName: string; status: string }[];
  load: Load;
}

const PRIORITY_STYLE: Record<string, string> = { HIGH: 'bg-error-50 text-error-700', MEDIUM: 'bg-warning-50 text-warning-700', LOW: 'bg-gray-100 text-gray-600' };
const kg = (v: number) => `${Math.round(v).toLocaleString()} kg`;

async function call(method: 'post' | 'put', url: string, body?: unknown) {
  const res = await api[method](url, body);
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Something went wrong');
  return res.data;
}
const errorText = (e: any) => e?.response?.data?.error?.message || e?.message || 'Something went wrong';

/** Bar showing how full a vehicle is; red when it is over. */
function LoadBar({ label, used, capacity, unit }: { label: string; used: number; capacity: number | null; unit: string }) {
  if (!capacity) return <p className="text-xs text-gray-500">{label}: {Math.round(used).toLocaleString()} {unit} <span className="text-gray-400">(no limit set)</span></p>;
  const pct = Math.round((used / capacity) * 100);
  const color = pct > 100 ? 'bg-error-500' : pct > 85 ? 'bg-warning-500' : 'bg-success-500';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className={pct > 100 ? 'font-semibold text-error-700' : 'text-gray-500'}>{Math.round(used).toLocaleString()} / {capacity.toLocaleString()} {unit} · {pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
    </div>
  );
}

function OrderCard({ order, onAdd, draggable = true }: { order: PlannerOrder; onAdd?: () => void; draggable?: boolean }) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', String(order.id));
    e.dataTransfer.effectAllowed = 'move';
  };
  return (
    <div draggable={draggable} onDragStart={onDragStart} className="group flex items-start gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:border-primary-200">
      {draggable && <GripVertical className="mt-0.5 hidden h-4 w-4 shrink-0 cursor-grab text-gray-300 sm:block" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/orders/${order.id}`} className="text-sm font-semibold text-primary-700 hover:underline">{order.orderNumber}</Link>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[order.priority] || PRIORITY_STYLE.LOW}`}>{order.priority}</span>
        </div>
        <p className="truncate text-sm text-gray-800">{order.customerName}</p>
        <p className="truncate text-xs text-gray-500">{order.deliveryAddress}</p>
        <p className="mt-1 text-xs text-gray-500">
          {kg(order.load.weightKg)}{order.load.volumeL ? ` · ${Math.round(order.load.volumeL)} L` : ''}
          {order.load.missingWeight > 0 && <span className="ml-1 text-warning-700">· {order.load.missingWeight} item{order.load.missingWeight === 1 ? '' : 's'} without weight</span>}
        </p>
      </div>
      {onAdd && (
        <button onClick={onAdd} className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-700" title="Add to the new trip">
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Area that accepts dropped orders. */
function DropZone({ onDrop, children, className = '' }: { onDrop: (orderId: number) => void; children: React.ReactNode; className?: string }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = Number(e.dataTransfer.getData('text/plain')); if (id) onDrop(id); }}
      className={`${className} transition ${over ? 'ring-2 ring-primary-300 ring-offset-2' : ''}`}
    >
      {children}
    </div>
  );
}

export default function TripPlanner() {
  const qc = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['trip-planner'],
    queryFn: async () => (await api.get('/trips/planner', { params: { t: Date.now() } })).data.data as { orders: PlannerOrder[]; vehicles: Vehicle[]; drivers: Driver[]; trips: Trip[] },
  });
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<number[]>([]);
  const [vehicleId, setVehicleId] = useState<number | ''>('');
  const [driverId, setDriverId] = useState<number | ''>('');
  const [plannedDate, setPlannedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState<string | null>(null);

  const orders = data?.orders || [];
  const byId = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const waiting = orders.filter((o) => !draft.includes(o.id) && `${o.orderNumber} ${o.customerName} ${o.deliveryAddress}`.toLowerCase().includes(search.toLowerCase()));
  const draftOrders = draft.map((id) => byId.get(id)).filter(Boolean) as PlannerOrder[];
  const vehicle = data?.vehicles.find((v) => v.id === vehicleId);
  const draftLoad = draftOrders.reduce((s, o) => ({ weightKg: s.weightKg + o.load.weightKg, volumeL: s.volumeL + o.load.volumeL, missingWeight: s.missingWeight + o.load.missingWeight }), { weightKg: 0, volumeL: 0, missingWeight: 0 });
  const overloaded = !!vehicle && (draftLoad.weightKg > vehicle.capacity || (!!vehicle.volumeL && draftLoad.volumeL > Number(vehicle.volumeL)));

  const refresh = () => qc.invalidateQueries({ queryKey: ['trip-planner'] });
  const addToDraft = (id: number) => setDraft((d) => (d.includes(id) || !byId.has(id) ? d : [...d, id]));
  const pickVehicle = (id: number | '') => {
    setVehicleId(id);
    const usual = data?.drivers.find((d) => d.currentVehicleId === id);
    if (usual && !driverId) setDriverId(usual.id);
  };

  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(success);
      await refresh();
      return true;
    } catch (e) {
      toast.error(errorText(e), { duration: 6000 });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveTrip = async () => {
    const ok = await run('save', () => call('post', '/trips', { vehicleId, driverId, orderIds: draft, plannedDate }), 'Trip planned');
    if (ok) { setDraft([]); setVehicleId(''); setDriverId(''); }
  };
  const changeTrip = (trip: Trip, orderIds: number[]) => run(`trip-${trip.id}`, () => call('put', `/trips/${trip.id}`, { orderIds }), `${trip.tripNumber} updated`);
  const dispatchTrip = (trip: Trip) => run(`send-${trip.id}`, () => call('post', `/trips/${trip.id}/dispatch`), `${trip.tripNumber} sent to ${trip.driver.name}`);
  const cancelTrip = (trip: Trip) => {
    if (!window.confirm(`Cancel ${trip.tripNumber}? Its orders go back to the waiting list.`)) return;
    void run(`cancel-${trip.id}`, () => call('post', `/trips/${trip.id}/cancel`), `${trip.tripNumber} cancelled`);
  };

  return (
    <div>
      <PageHeader
        title="Trip planner"
        subtitle="Put several orders on one vehicle, check the load fits, then send the whole trip"
        breadcrumbs={[{ label: 'Operations' }]}
        icon={<Route className="h-5 w-5" />}
        actions={
          <button onClick={() => refetch()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Waiting orders */}
          <DropZone onDrop={(id) => setDraft((d) => d.filter((x) => x !== id))} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Package className="h-4 w-4 text-gray-400" /> Waiting for a vehicle <span className="text-gray-400">({orders.length - draft.length})</span></h2>
            </div>
            <label className="relative mb-3 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders, customers, places" className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-300" />
            </label>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {waiting.length ? waiting.map((o) => <OrderCard key={o.id} order={o} onAdd={() => addToDraft(o.id)} />) : <EmptyState title="No orders waiting" description="Pending orders without a trip show up here." />}
            </div>
          </DropZone>

          <div className="space-y-5">
            {/* New trip */}
            <DropZone onDrop={addToDraft} className="rounded-2xl border border-primary-100 bg-white p-4 shadow-soft">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Truck className="h-4 w-4 text-primary-600" /> New trip</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm"><span className="mb-1 block text-xs font-medium text-gray-600">Vehicle</span>
                  <select value={vehicleId} onChange={(e) => pickVehicle(e.target.value ? Number(e.target.value) : '')} className="h-10 w-full rounded-xl border border-gray-200 px-2 text-sm">
                    <option value="">Choose…</option>
                    {data?.vehicles.map((v) => <option key={v.id} value={v.id}>{v.plateNumber} · {v.capacity.toLocaleString()} kg</option>)}
                  </select>
                </label>
                <label className="text-sm"><span className="mb-1 block text-xs font-medium text-gray-600">Driver</span>
                  <select value={driverId} onChange={(e) => setDriverId(e.target.value ? Number(e.target.value) : '')} className="h-10 w-full rounded-xl border border-gray-200 px-2 text-sm">
                    <option value="">Choose…</option>
                    {data?.drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="text-sm"><span className="mb-1 block text-xs font-medium text-gray-600">Date</span>
                  <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-2 text-sm" />
                </label>
              </div>
              {(!data?.vehicles.length || !data?.drivers.length) && (
                <p className="mt-2 text-xs text-warning-700">{!data?.vehicles.length ? 'No vehicle is available right now. ' : ''}{!data?.drivers.length ? 'No driver is available right now.' : ''}</p>
              )}

              <div className="mt-4 min-h-[120px] space-y-2 rounded-xl border-2 border-dashed border-gray-200 p-2">
                {draftOrders.length ? draftOrders.map((o) => (
                  <div key={o.id} className="relative">
                    <OrderCard order={o} />
                    <button onClick={() => setDraft((d) => d.filter((x) => x !== o.id))} className="absolute right-2 top-2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Take off the trip"><X className="h-4 w-4" /></button>
                  </div>
                )) : <p className="py-8 text-center text-sm text-gray-400">Drag orders here, or press + on an order</p>}
              </div>

              {draftOrders.length > 0 && (
                <div className="mt-4 space-y-2">
                  {vehicle ? (
                    <>
                      <LoadBar label="Weight" used={draftLoad.weightKg} capacity={vehicle.capacity} unit="kg" />
                      <LoadBar label="Volume" used={draftLoad.volumeL} capacity={vehicle.volumeL ? Number(vehicle.volumeL) : null} unit="L" />
                    </>
                  ) : <p className="text-xs text-gray-500">Load: {kg(draftLoad.weightKg)}{draftLoad.volumeL ? ` · ${Math.round(draftLoad.volumeL)} L` : ''}. Choose a vehicle to check it fits.</p>}
                  {draftLoad.missingWeight > 0 && <p className="flex items-center gap-1.5 text-xs text-warning-700"><AlertTriangle className="h-3.5 w-3.5" /> Some items have no weight set, so the real load is higher. Add weights on the Inventory page.</p>}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button onClick={saveTrip} disabled={!draft.length || !vehicleId || !driverId || overloaded || busy === 'save'}>
                  {busy === 'save' ? 'Saving…' : overloaded ? 'Too heavy for this vehicle' : `Plan trip (${draft.length} order${draft.length === 1 ? '' : 's'})`}
                </Button>
              </div>
            </DropZone>

            {/* Planned and running trips */}
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Planned and running trips</h2>
              {data?.trips.length ? (
                <div className="space-y-3">
                  {data.trips.map((trip) => {
                    const planned = trip.status === 'PLANNED';
                    const ids = trip.orders.map((o) => o.id);
                    const card = (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{trip.tripNumber} · {trip.vehicle.plateNumber}</p>
                            <p className="text-xs text-gray-500">{trip.driver.name} · {formatDate(trip.plannedDate)} · {trip.orders.length} order{trip.orders.length === 1 ? '' : 's'}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${planned ? 'bg-primary-50 text-primary-700' : 'bg-success-50 text-success-700'}`}>{planned ? 'Planned' : 'On the road'}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <LoadBar label="Weight" used={trip.load.weightKg} capacity={trip.vehicle.capacity} unit="kg" />
                          {trip.vehicle.volumeL && <LoadBar label="Volume" used={trip.load.volumeL} capacity={Number(trip.vehicle.volumeL)} unit="L" />}
                        </div>
                        <ul className="mt-3 divide-y divide-gray-50 text-sm">
                          {trip.orders.map((o) => (
                            <li key={o.id} className="flex items-center justify-between py-1.5">
                              <span><Link to={`/orders/${o.id}`} className="font-medium text-primary-700 hover:underline">{o.orderNumber}</Link> <span className="text-gray-500">{o.customerName}</span></span>
                              {planned ? (
                                <button onClick={() => changeTrip(trip, ids.filter((x) => x !== o.id))} disabled={!!busy} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Take off the trip"><X className="h-3.5 w-3.5" /></button>
                              ) : <span className="text-xs text-gray-500">{o.status.replace('_', ' ').toLowerCase()}</span>}
                            </li>
                          ))}
                        </ul>
                        {planned && (
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => cancelTrip(trip)} disabled={!!busy}><Ban className="mr-1.5 h-4 w-4" /> Cancel</Button>
                            <Button size="sm" variant="success" onClick={() => dispatchTrip(trip)} disabled={!!busy || !trip.orders.length}><Send className="mr-1.5 h-4 w-4" /> {busy === `send-${trip.id}` ? 'Sending…' : 'Send trip'}</Button>
                          </div>
                        )}
                      </div>
                    );
                    return planned
                      ? <DropZone key={trip.id} onDrop={(id) => { if (!ids.includes(id)) { setDraft((d) => d.filter((x) => x !== id)); void changeTrip(trip, [...ids, id]); } }}>{card}</DropZone>
                      : <div key={trip.id}>{card}</div>;
                  })}
                </div>
              ) : <EmptyState title="No trips yet" description="Plan a trip above. Sent trips stay here until every order is delivered." />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
