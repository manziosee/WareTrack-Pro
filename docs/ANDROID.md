# Android driver app (background GPS)

The driver app runs in the browser and can be installed from it (Add to Home
Screen). A browser app can only share its location **while it is open on
screen**. WareTrack keeps the screen awake while "Share location" is on, which
covers most delivery runs.

For tracking that continues with the screen off or the app in the background,
wrap the same app as a native Android app with [Capacitor](https://capacitorjs.com)
and the community background-geolocation plugin. Nothing in the web app needs to
change except one small file (step 5).

## What you need

- Android Studio (includes the Android SDK and an emulator)
- Node.js 18+
- A Google Play developer account ($25 once) if you want to publish on the Play Store;
  otherwise you can share the `.apk` file directly with drivers

## Steps

Run these in `frontend/`.

1. Install Capacitor and the plugin:

   ```bash
   npm i @capacitor/core @capacitor/android @capacitor-community/background-geolocation
   npm i -D @capacitor/cli
   npx cap init "WareTrack Driver" rw.waretrack.driver --web-dir dist
   ```

2. Point the app at the live API when building, then build and add Android:

   ```bash
   VITE_API_URL=https://waretrack-pro.onrender.com/api npm run build
   npx cap add android
   npx cap sync android
   ```

3. In `android/app/src/main/AndroidManifest.xml`, add inside `<manifest>`:

   ```xml
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   ```

4. Allow the Android app's origin in the API: add `capacitor://localhost,https://localhost`
   to `CORS_ORIGINS` on Render.

5. Create `frontend/src/utils/nativeLocation.ts`:

   ```ts
   import { Capacitor, registerPlugin } from '@capacitor/core';
   import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
   import api from '@/services/api';

   const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
   let watcherId: string | null = null;
   let last = 0;

   export const isNativeApp = () => Capacitor.isNativePlatform();

   /** Share location in the background (shows a "Sharing location" notification). */
   export async function startBackgroundLocation() {
     if (!isNativeApp() || watcherId) return;
     watcherId = await BackgroundGeolocation.addWatcher(
       { backgroundTitle: 'WareTrack', backgroundMessage: 'Sharing your location with dispatch', requestPermissions: true, distanceFilter: 30 },
       (location, error) => {
         if (error || !location || Date.now() - last < 20000) return;
         last = Date.now();
         api.post('/drivers/me/location', { lat: location.latitude, lng: location.longitude }).catch(() => undefined);
       }
     );
   }

   export async function stopBackgroundLocation() {
     if (watcherId) await BackgroundGeolocation.removeWatcher({ id: watcherId });
     watcherId = null;
   }
   ```

   Then in `src/pages/MyDeliveries.tsx`, in the location-sharing effect, call
   `startBackgroundLocation()` when `sharing` is on and `isNativeApp()` is true
   (and `stopBackgroundLocation()` in the cleanup) instead of `navigator.geolocation.watchPosition`.

6. Open and run:

   ```bash
   npx cap open android
   ```

   In Android Studio press **Run** for a phone/emulator, or **Build → Build App
   Bundle(s) / APK(s)** to get an `.apk` to share or an `.aab` for the Play Store.

7. After changing the web app later: `npm run build && npx cap sync android`, then build again.

## On the phone

The first time, Android asks for location permission. Drivers must choose
**Allow all the time** for tracking to continue with the screen off. Some brands
(Tecno, Infinix, Xiaomi, Samsung) also need: Settings → Battery → WareTrack
Driver → **No restrictions**.
