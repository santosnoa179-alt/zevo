import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ui/Toast'
import { ThemeProvider } from './hooks/useTheme'
import { initSentry, Sentry } from './lib/sentry'

// Init Sentry AVANT tout (pour capturer aussi les erreurs au boot)
initSentry()

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

// Point d'entrée de l'application Zevo
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<FatalErrorFallback />} showDialog={false}>
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
