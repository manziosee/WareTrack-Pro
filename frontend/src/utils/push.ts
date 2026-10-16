import api from '@/services/api';

const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on';

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Is this device receiving push notifications? */
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

/** Ask permission, subscribe this device and register it with the server. */
export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support notifications. On iPhone, add the app to the Home Screen first.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in the browser settings for this site.');
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const keyRes = await api.get('/push/public-key');
  const key = keyRes.data?.data?.publicKey;
  if (!key) throw new Error('Notifications are not available on the server');
  const subscription = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const res = await api.post('/push/subscribe', { subscription: subscription.toJSON() });
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Could not turn on notifications');
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
  }
}
