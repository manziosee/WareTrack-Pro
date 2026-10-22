import type { CapacitorConfig } from '@capacitor/cli';

/** Android driver app: the web app in a native shell, so GPS keeps working with the screen off. */
const config: CapacitorConfig = {
  appId: 'rw.waretrack.driver',
  appName: 'WareTrack Driver',
  webDir: 'dist',
  android: {
    // The API is served over HTTPS; nothing loads over plain HTTP
    allowMixedContent: false,
    // Keeps background location updates flowing past 5 minutes (background-geolocation plugin)
    useLegacyBridge: true,
  },
  // CAP_LOCAL_API=1 builds a test app that talks to an API on the developer's
  // machine over plain HTTP (http://10.0.2.2:<port> from the emulator)
  ...(process.env.CAP_LOCAL_API ? { server: { androidScheme: 'http', cleartext: true } } : {}),
};

export default config;
