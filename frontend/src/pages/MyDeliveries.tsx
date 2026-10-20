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
import PushSettings from '@/components/settings/PushSettings';

const QUEUE_KEY = 'waretrack-pod-queue';
const FAIL_REASONS = ['Customer not available', 'Wrong address', 'Customer refused delivery', 'Business closed', 'Road closed', 'Vehicle problem'];

const slot = (o: any) => {
  if (!o.timeSlotStart) return null;
  const f = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${f(o.timeSlotStart)}${o.timeSlotEnd ? `–${f(o.timeSlotEnd)}` : ''}`;
};

const CACHE_KEY = 'waretrack-my-deliveries-cache';

/** Actions waiting for a connection: { url, body, label } (older entries were { orderId, body }). */
type QueuedAction = { id: string; url: string; body: any; label?: string; status?: 'CONFLICT'; error?: string; queuedAt?: string };
function readQueue(): QueuedAction[] {
  try {
    const items = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return items.map((i: any) => (i.url
      ? { ...i, id: i.id || `${Date.now()}-${Math.random()}` }
      : { id: `${Date.now()}-${Math.random()}`, url: `/my-deliveries/${i.orderId}/complete`, body: i.body, label: 'delivery' }));
  } catch {
    return [];
  }
}

/** Save the queue; if the phone is out of space, keep the deliveries but drop photos. */
function writeQueue(items: any[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    return true;
  } catch {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(items.map((i) => ({ ...i, body: { ...i.body, photoData: undefined } }))));
      toast('Phone storage is full: the delivery is saved without its photo.', { icon: '⚠️', duration: 6000 });
      return true;
    } catch {
      return false;
    }
  }
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') || undefined;
  } catch {
    return undefined;
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
  const [failNotes, setFailNotes] = useState('');
  const [failPhoto, setFailPhoto] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [cash, setCash] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [queued, setQueued] = useState(readQueue().length);
  const [queueItems, setQueueItems] = useState<QueuedAction[]>(readQueue);
  const [showQueue, setShowQueue] = useState(false);
  const signatureRef = useRef<SignaturePadHandle>(null);
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastSent = useRef(0);

  const { data, isLoading } = useQuery({
    queryKey: ['my-deliveries'],
    queryFn: async () => {
      const result = (await api.get('/my-deliveries', { params: { t: Date.now() } })).data?.data;
      // Keep the last list on the phone so stops are still visible without signal
      if (result?.driver) try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch { /* storage full */ }
      return result ?? readCache();
    },
    initialData: readCache,
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
      const remaining: QueuedAction[] = [];
      for (const item of items) {
        if (item.status === 'CONFLICT') { remaining.push(item); continue; }
        const res = await api.post(item.url, item.body, { headers: { 'Idempotency-Key': item.id } }).catch(() => null);
        if (!res?.status) remaining.push(item);
        else if (res.data?.success === false || res.status >= 400) {
          remaining.push({ ...item, status: 'CONFLICT', error: res.data?.error?.message || 'The server rejected this saved action. Review it before retrying.' });
        }
      }
      writeQueue(remaining);
      setQueueItems(remaining);
      setQueued(remaining.length);
      const sent = items.length - remaining.filter((i) => items.some((old) => old.id === i.id)).length;
      if (sent > 0) {
        toast.success(`${sent} saved update${sent === 1 ? '' : 's'} sent`);
        refresh();
      }
      const blocked = remaining.filter((item) => item.status === 'CONFLICT').length;
      if (blocked) toast.error(`${blocked} saved update${blocked === 1 ? '' : 's'} need review`, { duration: 7000 });
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

  // Keep the screen awake while sharing location, so tracking doesn't pause when the phone would sleep
  useEffect(() => {
    if (!sharing || !('wakeLock' in navigator)) return;
    let lock: any = null;
    const acquire = async () => {
      try { lock = await (navigator as any).wakeLock.request('screen'); } catch { /* not allowed (e.g. battery saver) */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch?.(() => undefined);
    };
  }, [sharing]);

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

  /** No signal: remember the action, update the list on the phone, send it later. */
  const queueOffline = (url: string, body: any, label: string, update: (d: any) => any) => {
    const entry: QueuedAction = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, url, body, label, queuedAt: new Date().toISOString() };
    const nextQueue = [...readQueue(), entry];
    const ok = writeQueue(nextQueue);
    if (!ok) { toast.error('Could not save on this phone. Try again when you have signal.'); return false; }
    setQueueItems(nextQueue);
    setQueued(nextQueue.length);
    queryClient.setQueryData(['my-deliveries'], (d: any) => {
      const next = d ? update(d) : d;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* storage full */ }
      return next;
    });
    return true;
  };

  const discardQueued = (id: string) => {
    const next = readQueue().filter((item) => item.id !== id);
    writeQueue(next);
    setQueueItems(next);
    setQueued(next.length);
  };

  const retryQueued = () => {
    const next = readQueue().map((item) => ({ ...item, status: undefined, error: undefined }));
    writeQueue(next);
    setQueueItems(next);
    window.dispatchEvent(new Event('online'));
  };

  const start = async (o: any) => {
    if (!navigator.onLine) {
      if (queueOffline(`/my-deliveries/${o.id}/start`, {}, 'start', (d) => ({ ...d, open: d.open.map((x: any) => (x.id === o.id ? { ...x, status: 'IN_TRANSIT' } : x)) }))) {
        toast('No signal: marked on the way here, will sync later.', { icon: '📶' });
      }
      return;
    }
    const res = await api.post(`/my-deliveries/${o.id}/start`, {}).catch(() => null);
    if (!res?.status) {
      if (queueOffline(`/my-deliveries/${o.id}/start`, {}, 'start', (d) => ({ ...d, open: d.open.map((x: any) => (x.id === o.id ? { ...x, status: 'IN_TRANSIT' } : x)) }))) {
        toast('Connection lost. Start saved on this phone and will sync later.', { icon: '📶' });
      }
      return;
    }
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
    const saveForLater = () => {
      const id = completing.id;
      const saved = queueOffline(`/my-deliveries/${id}/complete`, body, 'delivery', (d) => ({
        ...d,
        open: d.open.filter((x: any) => x.id !== id),
        done: [{ ...d.open.find((x: any) => x.id === id), status: 'DELIVERED' }, ...(d.done || [])],
      }));
      setBusy(false);
      if (saved) {
        setCompleting(null);
        toast('No connection. Saved on this phone and will send automatically.', { icon: '📶' });
      }
    };
    if (!navigator.onLine) return saveForLater();
    const res = await api.post(`/my-deliveries/${completing.id}/complete`, body).catch(() => null);
    // Weak signal: the phone thinks it's online but the request never reached the server
    if (!res?.status) return saveForLater();
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
    const body = { reason: failReason, notes: failNotes || undefined, photoData: failPhoto || undefined };
    if (!navigator.onLine) {
      const id = failing.id;
      if (queueOffline(`/orders/${id}/fail`, body, 'delivery exception', (d) => ({ ...d, open: d.open.filter((x: any) => x.id !== id) }))) {
        toast('No signal: saved, dispatch will be told when you reconnect.', { icon: '📶' });
        setFailing(null);
      }
      return;
    }
    const res = await api.post(`/orders/${failing.id}/fail`, body).catch(() => null);
    if (!res?.status) {
      const id = failing.id;
      if (queueOffline(`/orders/${id}/fail`, body, 'delivery exception', (d) => ({ ...d, open: d.open.filter((x: any) => x.id !== id) }))) {
        toast('Connection lost. Exception saved on this phone and will sync later.', { icon: '📶' });
        setFailing(null);
      }
      return;
    }
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
          <WifiOff className="h-4 w-4 shrink-0" /> {!online ? `You are offline. Keep working: starts, deliveries and problems are saved on this phone${queued ? ` (${queued} waiting)` : ''} and sent when you reconnect.` : `${queued} saved update${queued === 1 ? '' : 's'} waiting to send…`}
          {queued > 0 && <button className="ml-auto shrink-0 font-semibold underline" onClick={() => setShowQueue(true)}>Review</button>}
        </div>
      )}

      <PushSettings compact />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className={`rounded-2xl border p-3 ${myCash?.cashInHand ? 'border-warning-200 bg-warning-50' : 'border-gray-100 bg-white'}`}>
          <p className="flex items-center gap-1.5 text-xs text-gray-600"><Banknote className="h-3.5 w-3.5" /> Cash in hand</p>
          <p className="text-lg font-bold text-gray-900">RWF {Math.round(myCash?.cashInHand || 0).toLocaleString()}</p>
          <p className="text-[11px] text-gray-500">{myCash?.payments?.length ? `${myCash.payments.length} deliver${myCash.payments.length === 1 ? 'y' : 'ies'} · hand this cash to office staff to record the handover` : 'Cash collected on delivery appears here until you hand it to office staff'}</p>
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
                  <button onClick={() => { setFailing(o); setFailReason(FAIL_REASONS[0]); setFailNotes(''); setFailPhoto(null); }} className="flex flex-col items-center gap-1 border-l border-gray-100 py-3 text-error-600 hover:bg-error-50"><XCircle className="h-4 w-4" /> Can't deliver</button>
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
              <span className="mt-1 block text-xs text-warning-800">Due: RWF {Math.round(Number(completing.amountDue ?? completing.totalAmount)).toLocaleString()}. Enter what the customer actually gives you, or 0 if they did not pay. The amount is added to Cash in hand for office handover.</span>
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
          <label className="block pt-2 text-sm"><span className="mb-1 block font-medium text-gray-700">Notes for dispatch</span><textarea value={failNotes} onChange={(e) => setFailNotes(e.target.value)} rows={2} maxLength={2000} className="w-full rounded-xl border border-gray-200 p-3" placeholder="What happened? What should dispatch follow up on?" /></label>
          {failPhoto ? <div className="relative"><img src={failPhoto} alt="Delivery exception evidence" className="h-32 w-full rounded-xl object-cover" /><button onClick={() => setFailPhoto(null)} className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs">Remove</button></div> : <label className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600"><Camera className="h-4 w-4" /> Add a photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setFailPhoto(await compressImage(f)); }} /></label>}
          <p className="pt-1 text-xs text-gray-500">Dispatch is notified and the delivery can be rescheduled.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setFailing(null)}>Back</Button>
            <Button variant="error" size="sm" onClick={fail}>Confirm</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showQueue} onClose={() => setShowQueue(false)} title="Saved updates" subtitle="These actions are stored on this device until the server accepts them." icon={<WifiOff className="h-5 w-5" />}>
        <div className="space-y-3">
          {queueItems.length === 0 ? <p className="text-sm text-gray-500">No saved updates are waiting.</p> : queueItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold capitalize text-gray-800">{item.label || 'delivery update'}</p><p className="text-xs text-gray-500">{item.queuedAt ? new Date(item.queuedAt).toLocaleString() : 'Saved on this device'}</p></div><button onClick={() => discardQueued(item.id)} className="text-xs font-semibold text-error-600">Discard</button></div>
              {item.error && <p className="mt-2 rounded-lg bg-error-50 p-2 text-xs text-error-700">Needs review: {item.error}</p>}
            </div>
          ))}
          {queueItems.some((item) => item.status === 'CONFLICT') && <Button variant="primary" className="w-full" onClick={retryQueued}>Retry reviewed updates</Button>}
        </div>
      </Modal>
    </div>
  );
}
