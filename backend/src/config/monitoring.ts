import * as Sentry from '@sentry/node';

/** Error monitoring with Sentry; active only when SENTRY_DSN is set. */
export const monitoringEnabled = Boolean(process.env.SENTRY_DSN);

export function initMonitoring() {
  if (!monitoringEnabled) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `waretrack-api@${process.env.npm_package_version || '2.3.0'}`,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    // Never send request bodies or credentials (they can contain passwords or codes).
    beforeSend(event) {
      if (!event.request) return event;
      const request = { ...event.request };
      delete request.data;
      if (request.headers) {
        request.headers = Object.fromEntries(
          Object.entries(request.headers).filter(([name]) => !['authorization', 'cookie', 'set-cookie'].includes(name.toLowerCase()))
        );
      }
      return { ...event, request };
    },
  });
  console.log('🛰️  Sentry error monitoring enabled');
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!monitoringEnabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
