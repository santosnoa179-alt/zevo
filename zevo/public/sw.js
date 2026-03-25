// Service Worker — Zevo PWA
// Stratégie : cache-first pour les assets statiques, network-first pour l'API

const CACHE_NAME = 'zevo-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Installation : pré-cache les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Prend le contrôle immédiatement
  self.skipWaiting()
})

// Activation : nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch : network-first pour les requêtes API, cache-first pour les assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return

  // Requêtes Supabase / API → network-first
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone et cache la réponse réussie
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Assets statiques → network-first (ensures fresh deploys are always served)
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && url.origin === self.location.origin) {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
      }
      return response
    }).catch(() => {
      // Fallback to cache if offline
      return caches.match(request).then((cached) => {
        if (cached) return cached
        // Fallback pour les navigations → index.html (SPA)
        if (request.mode === 'navigate') {
          return caches.match('/index.html')
        }
      })
    })
  )
})
