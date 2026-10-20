import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

// If a deployment replaces a lazy-loaded chunk while a tab is open, Vite emits
// this event. Reload once so the browser gets the current HTML and asset map.
const staleChunkReloadKey = 'waretrack-stale-chunk-reload'
if (sessionStorage.getItem(staleChunkReloadKey)) {
  // This runs in the successfully reloaded document; the failed document is
  // unloaded before its own timeout could clear the one-reload guard.
  window.setTimeout(() => sessionStorage.removeItem(staleChunkReloadKey), 10_000)
}
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  if (!sessionStorage.getItem(staleChunkReloadKey)) {
    sessionStorage.setItem(staleChunkReloadKey, '1')
    window.location.reload()
  }
})

// Error monitoring: only when a DSN is configured for the build
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  })
}

// Installable app with an offline shell (production builds only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
