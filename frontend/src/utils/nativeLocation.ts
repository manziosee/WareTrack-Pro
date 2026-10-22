import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

/**
 * In the Android driver app, location is shared by a background service with a
 * permanent notification, so it keeps working with the screen off or another
 * app open. Updates are posted with native HTTP, which Android does not
 * throttle in the background the way it throttles the WebView.
 */

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://waretrack-pro.onrender.com/api';

export const isNativeApp = () => Capacitor.isNativePlatform();

async function postLocation(lat: number, lng: number) {
  const token = localStorage.getItem('token');
  if (!token) return;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const companyId = localStorage.getItem('waretrack-company-id');
  const branchId = localStorage.getItem('waretrack-branch-id');
  if (companyId) headers['X-Company-Id'] = companyId;
  if (branchId) headers['X-Branch-Id'] = branchId;
  await CapacitorHttp.post({ url: `${API_BASE_URL}/drivers/me/location`, headers, data: { lat, lng } }).catch(() => undefined);
}

/**
 * Start background tracking. `onPosition` gets every fix (for the map on screen);
 * the server gets at most one update every `everyMs`. Returns a stop function.
 */
export async function startBackgroundTracking(onPosition: (p: { lat: number; lng: number }) => void, onDenied: () => void, everyMs = 20000) {
  let lastSent = 0;
  const id = await BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: 'Sharing your location',
      backgroundMessage: 'Dispatch can see where you are while you deliver.',
      requestPermissions: true,
      stale: false,
      distanceFilter: 30,
    },
    (location, error) => {
      if (error) {
        if (error.code === 'NOT_AUTHORIZED') onDenied();
        return;
      }
      if (!location) return;
      const p = { lat: location.latitude, lng: location.longitude };
      onPosition(p);
      if (Date.now() - lastSent < everyMs) return;
      lastSent = Date.now();
      void postLocation(p.lat, p.lng);
    },
  );
  return () => { void BackgroundGeolocation.removeWatcher({ id }); };
}

/** Open the phone's settings for this app (to allow location "all the time"). */
export const openAppSettings = () => BackgroundGeolocation.openSettings();
