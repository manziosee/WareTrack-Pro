import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Route as RouteIcon, Navigation, Phone, Play, CheckCircle2, XCircle, Camera, MapPin, Package, Clock, Radio, Banknote, WifiOff, Loader2, Sparkles, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import SignaturePad, { type SignaturePadHandle } from '@/components/ui/SignaturePad';
import api from '@/services/api';
import { useRealtime } from '@/context/RealtimeContext';
import { compressImage } from '@/utils/image';
import ExpenseForm from '@/components/finance/ExpenseForm';

const QUEUE_KEY = 'waretrack-pod-queue';
const FAIL_REASONS = ['Customer not available', 'Wrong address', 'Customer refused delivery', 'Business closed', 'Road closed', 'Vehicle problem'];

const slot = (o: any) => {
  if (!o.timeSlotStart) return null;
  const f = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${f(o.timeSlotStart)}${o.timeSlotEnd ? `–${f(o.timeSlotEnd)}` : ''}`;
};

function readQueue(): any[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(items: any[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable
  }
}

/** The driver's day: route, one-tap status updates and proof of delivery. */
export default function MyDeliveries() {
  const queryClient = useQueryClient();
  const { socket, connected } = useRealtime();
  const [sharing, setSharing] = useState(() => localStorage.getItem('waretrack-share-location') === '1');
  const [completing, setCompleting] = useState<any>(null);
  const [failing, setFailing] = useState<any>(null);
  const [failReason, setFailReason] = useState(FAIL_REASONS[0]);
  const [recipient, setRecipient] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [cash, setCash] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [queued, setQueued] = useState(readQueue().length);
  const signatureRef = useRef<SignaturePadHandle>(null);
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastSent = useRef(0);

  const { data, isLoading } = useQuery({
    queryKey: ['my-deliveries'],
    queryFn: async () => (await api.get('/my-deliveries', { params: { t: Date.now() } })).data?.data,
    refetchInterval: 60_000,
  });

  const { data: myCash, refetch: refetchCash } = useQuery({
    queryKey: ['my-cash'],
    queryFn: async () => (await api.get('/my-cash', { params: { t: Date.now() } })).data?.data,
    refetchInterval: 120_000,
  });

  const driverId = data?.driver?.id;
  const { data: route } = useQuery({
    queryKey: ['my-route', driverId, data?.open?.length],
    queryFn: async () => (await api.get(`/routes/driver/${driverId}`, { params: { t: Date.now() } })).data?.data,
    enabled: Boolean(driverId && data?.open?.length),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['my-deliveries'] });
    queryClient.invalidateQueries({ queryKey: ['my-route'] });
    refetchCash();
  };

  const collectsCash = (o: any) => o && o.paymentMethod === 'CASH' && o.paymentStatus !== 'PAID' && Number(o.amountDue ?? o.totalAmount) > 0;

  // Online/offline and sending queued proofs when back online
  useEffect(() => {
    const flush = async () => {
      const items = readQueue();
      if (!items.length || !navigator.onLine) return;
      const remaining = [];
      for (const item of items) {
        const res = await api.post(`/my-deliveries/${item.orderId}/complete`, item.body).catch(() => null);
        if (!res?.data?.success && res?.status !== 400) remaining.push(item);
      }
      writeQueue(remaining);
      setQueued(remaining.length);
      if (items.length !== remaining.length) {
        toast.success(`${items.length - remaining.length} saved deliver${items.length - remaining.length === 1 ? 'y' : 'ies'} sent`);
        refresh();
      }
    };
    const up = () => { setOnline(true); flush(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    flush();
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Location sharing while the page is open
  useEffect(() => {
    try {
      localStorage.setItem('waretrack-share-location', sharing ? '1' : '0');
    } catch {
      // ignore
    }
    if (!sharing || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        positionRef.current = p;
        if (Date.now() - lastSent.current < 20000) return;
        lastSent.current = Date.now();
        if (socket?.connected) socket.emit('driver:location', p);
        else api.post('/drivers/me/location', p).catch(() => undefined);
      },
      () => {
        toast.error('Location is blocked. Allow location access to share your position.');
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing, socket]);

  const start = async (o: any) => {
    const res = await api.post(`/my-deliveries/${o.id}/start`, {});
    if (res.data?.success) {
      toast.success(`On the way to ${o.customerName}`);
      if (!sharing) setSharing(true);
      refresh();
    } else toast.error(res.data?.error?.message || 'Could not start');
  };

  const openComplete = (o: any) => {
    setCompleting(o);
    setRecipient(o.customerName || '');
    setPhoto(null);
    setNotes('');
    setCash(collectsCash(o) ? String(Math.round(Number(o.amountDue ?? o.totalAmount))) : '');
    setHasSignature(false);
    navigator.geolocation?.getCurrentPosition((pos) => { positionRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; }, () => undefined, { timeout: 8000 });
  };

  const complete = async () => {
    const signatureData = signatureRef.current?.toDataURL();
    if (!recipient.trim() || !signatureData) return toast.error('Add the recipient name and a signature');
    const body = {
      recipientName: recipient.trim(), signatureData, photoData: photo || undefined, notes: notes || undefined,
      latitude: positionRef.current?.lat, longitude: positionRef.current?.lng,
      cashCollected: cash ? Number(cash) : undefined,
    };
    setBusy(true);
    if (!navigator.onLine) {
      writeQueue([...readQueue(), { orderId: completing.id, body }]);
      setQueued(readQueue().length);
      setBusy(false);
      setCompleting(null);
      toast('No connection. Saved on this phone and will send automatically.', { icon: '📶' });
      return;
    }
    const res = await api.post(`/my-deliveries/${completing.id}/complete`, body).catch(() => null);
    setBusy(false);
    if (res?.data?.success) {
      toast.success(`Delivered ✅ Code ${res.data.data.confirmationCode}`);
      setCompleting(null);
      refresh();
    } else {
      toast.error(res?.data?.error?.message || 'Could not complete the delivery');
    }
  };

  const fail = async () => {
    const res = await api.post(`/orders/${failing.id}/fail`, { reason: failReason });
    if (res.data?.success) {
      toast(`${failing.orderNumber} marked as not delivered`, { icon: '📝' });
      setFailing(null);
      refresh();
    } else toast.error(res.data?.error?.message || 'Could not update');
  };

  // Show stops in the optimized order when available
  const open: any[] = data?.open || [];
  const order = route?.stops?.map((s: any) => s.id) || [];
  const sorted = [...open].sort((a, b) => (order.indexOf(a.id) === -1 ? 99 : order.indexOf(a.id)) - (order.indexOf(b.id) === -1 ? 99 : order.indexOf(b.id)));
  const eta = (id: number) => route?.stops?.find((s: any) => s.id === id);

  if (!isLoading && data && !data.driver) {
    return <EmptyState variant="delivery" title="No driver profile linked to your account" description="Ask a dispatch officer or admin to link your account to a driver profile." />;
  }

  return (
    <div>
      <PageHeader
        title="My Deliveries"
        subtitle={data?.driver ? `${open.length} stop${open.length === 1 ? '' : 's'} to go` : 'Loading your day…'}
        icon={<RouteIcon className="h-5 w-5" />}
        actions={
          <button
            onClick={() => setSharing((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-sm transition ${sharing ? 'bg-success-500 text-white' : 'border border-gray-200 bg-white text-gray-700'}`}
          >
            <Radio className={`h-4 w-4 ${sharing ? 'animate-pulse' : ''}`} /> {sharing ? 'Sharing location' : 'Share location'}
          </button>
        }
      />

      {(!online || queued > 0) && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <WifiOff className="h-4 w-4" /> {!online ? 'You are offline. Completed deliveries are saved and sent when you reconnect.' : `${queued} saved deliver${queued === 1 ? 'y' : 'ies'} waiting to send…`}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className={`rounded-2xl border p-3 ${myCash?.cashInHand ? 'border-warning-200 bg-warning-50' : 'border-gray-100 bg-white'}`}>
          <p className="flex items-center gap-1.5 text-xs text-gray-600"><Banknote className="h-3.5 w-3.5" /> Cash in hand</p>
          <p className="text-lg font-bold text-gray-900">RWF {Math.round(myCash?.cashInHand || 0).toLocaleString()}</p>
          <p className="text-[11px] text-gray-500">{myCash?.payments?.length ? `${myCash.payments.length} deliver${myCash.payments.length === 1 ? 'y' : 'ies'} · hand in at the office` : 'Nothing to hand in'}</p>
        </div>
        <button onClick={() => setAddingExpense(true)} className="flex flex-col items-start justify-center rounded-2xl border border-gray-100 bg-white p-3 text-left hover:bg-gray-50">
          <span className="flex items-center gap-1.5 text-xs text-gray-600"><Receipt className="h-3.5 w-3.5" /> Fuel or other cost?</span>
          <span className="text-sm font-semibold text-primary-700">+ Add expense</span>
          <span className="text-[11px] text-gray-500">With a receipt photo</span>
        </button>
      </div>

      {route && route.stops.length > 1 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>Best order for your {route.stops.length} stops: <b>{route.totalKm} km</b>, about <b>{route.totalMinutes} min</b>{route.savedKm > 0 ? ` (saves ${route.savedKm} km)` : ''}.</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-soft"><EmptyState variant="delivery" title="All done for now 🎉" description="New deliveries will appear here when dispatch assigns them." /></div>
      ) : (
        <ol className="space-y-3">
          {sorted.map((o, i) => {
            const leg = eta(o.id);
            const nav = o.latitude && o.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${o.latitude},${o.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.deliveryAddress)}`;
            return (
              <li key={o.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
                <div className="flex items-start gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-gray-900">{o.customerName}</p>
                      <StatusBadge status={o.status} />
                      {o.priority === 'HIGH' && <StatusBadge status="HIGH" />}
                    </div>
                    <p className="mt-0.5 flex items-start gap-1 text-sm text-gray-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />{o.deliveryAddress}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{o.orderNumber}</span>
                      {slot(o) && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {slot(o)}</span>}
                      {leg && <span className={leg.late ? 'font-semibold text-error-600' : ''}>ETA {new Date(leg.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {leg.km} km</span>}
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {o.items.reduce((s: number, it: any) => s + it.quantity, 0)} units</span>
                    </div>
                    {o.deliveryInstructions && <p className="mt-2 rounded-lg bg-accent-50 px-2.5 py-1.5 text-xs text-accent-800">📝 {o.deliveryInstructions}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 border-t border-gray-100 text-xs font-semibold">
                  <a href={`tel:${o.contactNumber}`} className="flex flex-col items-center gap-1 py-3 text-gray-600 hover:bg-gray-50"><Phone className="h-4 w-4" /> Call</a>
                  <a href={nav} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 border-l border-gray-100 py-3 text-primary-600 hover:bg-primary-50"><Navigation className="h-4 w-4" /> Navigate</a>
                  {o.status === 'IN_TRANSIT' ? (
                    <button onClick={() => openComplete(o)} className="flex flex-col items-center gap-1 border-l border-gray-100 bg-success-500 py-3 text-white hover:bg-success-600"><CheckCircle2 className="h-4 w-4" /> Delivered</button>
                  ) : (
                    <button onClick={() => start(o)} className="flex flex-col items-center gap-1 border-l border-gray-100 bg-primary-500 py-3 text-white hover:bg-primary-600"><Play className="h-4 w-4" /> Start</button>
                  )}
                  <button onClick={() => { setFailing(o); setFailReason(FAIL_REASONS[0]); }} className="flex flex-col items-center gap-1 border-l border-gray-100 py-3 text-error-600 hover:bg-error-50"><XCircle className="h-4 w-4" /> Can't deliver</button>
                </div>
                {collectsCash(o) && (
                  <p className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 bg-warning-50 py-2 text-xs font-semibold text-warning-800">
                    <Banknote className="h-4 w-4" /> Collect RWF {Math.round(Number(o.amountDue ?? o.totalAmount)).toLocaleString()} cash on delivery
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {data?.done?.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Recently finished</h2>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
            {data.done.slice(0, 8).map((o: any) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0"><span className="block truncate font-medium text-gray-800">{o.customerName}</span><span className="text-xs text-gray-500">{o.orderNumber}{o.proofs?.[0] ? ` · signed by ${o.proofs[0].recipientName}` : ''}</span></span>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-gray-400"><span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success-500' : 'bg-gray-300'}`} /> {connected ? 'Live updates on' : 'Connecting…'}</p>

      <Modal isOpen={Boolean(completing)} onClose={() => setCompleting(null)} title="Proof of delivery" subtitle={completing ? `${completing.orderNumber} · ${completing.customerName}` : ''} icon={<CheckCircle2 className="h-5 w-5" />}>
        <div className="space-y-4">
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Received by</span>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-base" placeholder="Name of the person receiving" />
          </label>
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Signature</span>
            <SignaturePad ref={signatureRef} onChange={setHasSignature} />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Photo (optional)</span>
            {photo ? (
              <div className="relative">
                <img src={photo} alt="Delivery" className="h-40 w-full rounded-xl object-cover" />
                <button onClick={() => setPhoto(null)} className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-gray-700">Remove</button>
              </div>
            ) : (
              <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600">
                <Camera className="h-5 w-5" /> Take a photo
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await compressImage(f)); }} />
              </label>
            )}
          </div>
          {collectsCash(completing) && (
            <label className="block rounded-xl bg-warning-50 p-3 text-sm"><span className="mb-1 flex items-center gap-1.5 font-medium text-warning-900"><Banknote className="h-4 w-4" /> Cash collected (RWF)</span>
              <input type="number" min={0} inputMode="numeric" value={cash} onChange={(e) => setCash(e.target.value)} className="h-11 w-full rounded-xl border border-warning-200 bg-white px-3 text-base font-semibold" />
              <span className="mt-1 block text-xs text-warning-800">Due: RWF {Math.round(Number(completing.amountDue ?? completing.totalAmount)).toLocaleString()}. Put 0 if the customer didn't pay.</span>
            </label>
          )}
          <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">Notes (optional)</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" placeholder="e.g. left with security" />
          </label>
          <Button className="h-12 w-full text-base" variant="success" disabled={busy || !hasSignature || !recipient.trim()} onClick={complete}>
            {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} Confirm delivery
          </Button>
        </div>
      </Modal>

      <Modal isOpen={addingExpense} onClose={() => setAddingExpense(false)} title="Add expense" icon={<Receipt className="h-5 w-5" />}>
        {addingExpense && <ExpenseForm onSaved={() => setAddingExpense(false)} />}
      </Modal>

      <Modal isOpen={Boolean(failing)} onClose={() => setFailing(null)} title="Couldn't deliver" subtitle={failing?.orderNumber} icon={<XCircle className="h-5 w-5" />} size="sm">
        <div className="space-y-2">
          {FAIL_REASONS.map((r) => (
            <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${failReason === r ? 'border-error-300 bg-error-50' : 'border-gray-200'}`}>
              <input type="radio" checked={failReason === r} onChange={() => setFailReason(r)} className="text-error-500" /> {r}
            </label>
          ))}
          <p className="pt-1 text-xs text-gray-500">Dispatch is notified and the delivery can be rescheduled.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setFailing(null)}>Back</Button>
            <Button variant="error" size="sm" onClick={fail}>Confirm</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
