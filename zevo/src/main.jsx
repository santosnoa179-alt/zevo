import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ui/Toast'
import { ThemeProvider } from './hooks/useTheme'
import { initSentry, Sentry } from './lib/sentry'

// Init Sentry AVANT tout (pour capturer aussi les erreurs au boot)
initSentry()

// ── Auto-reload sur erreur de chunk lazy ────────────────────────────────
// Après un déploiement Vite, les noms de chunks changent (hash dans le nom).
// Les users qui avaient l'ancienne version chargée reçoivent un 404 quand
// React Router tente de charger un chunk → "Failed to fetch dynamically
// imported module". Fix : reload silencieux, avec protection anti-boucle
// (on ne recharge pas plus d'une fois toutes les 10 secondes).
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || ''
  const isChunkError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS')

  if (isChunkError) {
    const lastReload = sessionStorage.getItem('_chunk_reload_at')
    const now = Date.now()
    if (!lastReload || now - parseInt(lastReload) > 10_000) {
      sessionStorage.setItem('_chunk_reload_at', String(now))
      window.location.reload()
    }
  }
})

// Fallback UI si un crash fatal dépasse toutes les ErrorBoundary internes
function FatalErrorFallback() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#060606',
      color: '#F5F5F3',
      padding: '24px',
      textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Une erreur est survenue</h1>
      <p style={{ opacity: 0.6, marginBottom: '24px', maxWidth: '420px' }}>
        Nos équipes ont été notifiées automatiquement. Essaie de recharger la page.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 24px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, #FF5C1A, #FF7A42)',
          color: 'white',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Recharger la page
      </button>
    </div>
  )
}

// Détecte si une erreur est due à un chunk lazy obsolète post-déploiement
function isChunkError(error) {
  const msg = error?.message || ''
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS')
  )
}

// Auto-reload silencieux avec protection anti-boucle (max 1 reload / 10s)
function reloadOnce() {
  const lastReload = sessionStorage.getItem('_chunk_reload_at')
  const now = Date.now()
  if (!lastReload || now - parseInt(lastReload) > 10_000) {
    sessionStorage.setItem('_chunk_reload_at', String(now))
    window.location.reload()
    return true
  }
  return false
}

// Point d'entrée de l'application Zevo
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      // fallback reçoit l'erreur en prop — si chunk error → reload auto,
      // sinon → écran d'erreur classique avec bouton "Recharger"
      fallback={({ error }) => {
        if (isChunkError(error)) {
          reloadOnce()
          return null
        }
        return <FatalErrorFallback />
      }}
      showDialog={false}
    >
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

// Enregistrement du Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
