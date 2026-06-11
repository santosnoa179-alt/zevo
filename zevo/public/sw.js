// Service Worker — Zevo PWA
// Stratégie : network-first pour les assets statiques (deploys frais),
// network-only pour Supabase/API (données privées, jamais en cache).

const CACHE_NAME = 'zevo-v4'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Réponse synthétique quand on est offline et que rien n'est en cache.
// respondWith() exige TOUJOURS une vraie Response — renvoyer undefined
// provoque "Failed to convert value to 'Response'" (bug historique).
function offlineResponse() {
  return new Response(
    JSON.stringify({ error: 'offline' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  )
}

// Installation : pré-cache les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  // Prend le contrôle immédiatement
  self.skipWaiting()
})

// Activation : nettoie les anciens caches (dont zevo-v3 qui contenait
// des réponses API Supabase authentifiées — purgées par le rename v4)
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

// Fetch : network-only pour l'API, network-first pour les assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return

  // Requêtes Supabase / API → network only, JAMAIS de cache :
  // ce sont des données privées par utilisateur (messages, profils, etc.).
  // Les mettre en cache = données obsolètes + fuite après logout.
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => offlineResponse())
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
    }).catch(async () => {
      // Fallback to cache if offline
      const cached = await caches.match(request)
      if (cached) return cached
      // Fallback pour les navigations → index.html (SPA)
      if (request.mode === 'navigate') {
        const index = await caches.match('/index.html')
        if (index) return index
      }
      // Toujours renvoyer une vraie Response (jamais undefined)
      return offlineResponse()
    })
  )
})
