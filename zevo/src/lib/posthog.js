// ═══════════════════════════════════════════════════════════════════════════
// PostHog — Product analytics RGPD-friendly
//
// Setup :
//   - EU Cloud (eu.i.posthog.com) → données hébergées en Europe
//   - autocapture: false → on track explicitement les events qui nous interessent
//   - disable_session_recording: true → pas de session recording
//   - respect_dnt: true → respecte le navigator.doNotTrack du browser
//   - persistence: localStorage
//
// Si VITE_POSTHOG_KEY est vide, l'init est no-op (dev local sans clé).
// ═══════════════════════════════════════════════════════════════════════════

import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (initialized) return
  if (typeof window === 'undefined') return

  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return // pas de cle -> pas d'init (dev local sans config)

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    capture_pageview: false, // track manuellement via useLocation (react-router)
    capture_pageleave: true,
    persistence: 'localStorage',
    respect_dnt: true,
    autocapture: false,
    disable_session_recording: true,
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug()
    },
  })
  initialized = true
}

// Lie les events au user authentifie (apres login ou au chargement de la session)
export function phIdentify(user, props = {}) {
  if (!initialized || !user?.id) return
  posthog.identify(user.id, {
    email: user.email,
    ...props,
  })
}

// Reset l'identite (logout) -> evite de cross-linker l'ancien user
export function phReset() {
  if (!initialized) return
  posthog.reset()
}

// Track un event personnalise. No-op si non initialise.
export function phTrack(event, props = {}) {
  if (!initialized) return
  posthog.capture(event, props)
}

// Track un changement de page (utilise par PostHogPageView dans App.jsx)
export function phPageview(url) {
  if (!initialized) return
  posthog.capture('$pageview', { $current_url: url })
}

export { posthog }
