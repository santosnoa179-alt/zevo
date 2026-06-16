// Sentry — monitoring d'erreurs JS en prod (errors + performance + session replay)
// Doc: https://docs.sentry.io/platforms/javascript/guides/react/
//
// Setup :
//   1. Crée un projet sur https://sentry.io/ (type "React")
//   2. Copie la DSN dans .env.local : VITE_SENTRY_DSN=https://...@o4509...ingest.sentry.io/4509...
//   3. Redéploie
//
// Si VITE_SENTRY_DSN n'est pas défini, Sentry est désactivé silencieusement
// (pas de pollution logs, pas de crash en dev).

import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN
const ENV = import.meta.env.MODE // 'development' | 'production'

export function initSentry() {
  // Pas de DSN configuré → on skip (ex : dev local sans Sentry configuré)
  if (!DSN) return

  Sentry.init({
    dsn: DSN,
    environment: ENV,

    // Release tracking : facilite le debug des regressions
    release: `zevo@${import.meta.env.VITE_APP_VERSION || 'dev'}`,

    // Performance monitoring — sample seulement 10% en prod (cost control)
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,

    // Session Replay — rediffusion vidéo des sessions
    // 10% des sessions normales + 100% des sessions qui crashent
    replaysSessionSampleRate: ENV === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      // Tracing browser + instrumentation automatique fetch/xhr
      Sentry.browserTracingIntegration(),
      // Session Replay avec masking PII par défaut (emails, passwords, etc.)
      Sentry.replayIntegration({
        maskAllText: false,          // on garde le texte visible (pas des médicaux ici)
        maskAllInputs: true,         // MASQUE tous les inputs (mots de passe, emails, etc.)
        blockAllMedia: false,
      }),
    ],

    // Filtre les erreurs "bruit" qu'on veut pas tracker
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Extensions navigateur
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
      // Network errors typiques (user offline)
      'NetworkError',
      'Load failed',
      // Chunks lazy obsolètes après un déploiement : bénin, géré par
      // l'auto-reload dans main.jsx (le user récupère la nouvelle version).
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
      'Unable to preload CSS',
    ],

    beforeSend(event) {
      // Jamais envoyer en dev si DSN absent (ceinture + bretelles)
      if (ENV === 'development' && !DSN) return null
      return event
    },
  })
}

// Helper pour identifier le user dans Sentry (à appeler après login)
export function identifyUser(user) {
  if (!DSN || !user) return
  Sentry.setUser({
    id: user.id,
    email: user.email,
  })
}

// Helper pour clear le user (à appeler au logout)
export function clearUser() {
  if (!DSN) return
  Sentry.setUser(null)
}

// Re-export pour l'ErrorBoundary dans App.jsx
export { Sentry }
