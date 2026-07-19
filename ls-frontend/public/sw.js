// Service worker LS Marketplace.
// v2 (2026-07-19) : correctif du piege « cache-first sur les scripts » qui servait
// d'anciens bundles apres deploiement. Strategie corrigee ci-dessous.
// IMPORTANT : bumper CACHE_VERSION a chaque changement critique de ce fichier.
const CACHE_VERSION = 'ls-marketplace-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

const OFFLINE_URL = '/offline'
const PRECACHE = ['/offline']

// Installation : on ne precache QUE la page offline (plus jamais les routes HTML,
// source de la peremption). Le nouveau SW prend la main immediatement (skipWaiting).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

// Activation : purge TOUS les caches d'anciennes versions (prefixe != version courante),
// puis prend le controle des onglets ouverts.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // 1) Cross-origin ou API : reseau uniquement, fallback JSON hors-ligne.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(
        () => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })
      )
    )
    return
  }

  // 2) Assets immuables Next (hashes) : cache-first SUR — une nouvelle build = nouvelle URL,
  //    donc jamais de peremption possible. Rapide et sans risque.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const clone = res.clone()
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone))
            return res
          })
      )
    )
    return
  }

  // 3) Images / polices (potentiellement non hashees) : stale-while-revalidate.
  if (req.destination === 'image' || req.destination === 'font') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const clone = res.clone()
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone))
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
    return
  }

  // 4) Tout le reste (navigations, RSC, HTML, CSS/JS non hashes) : network-first.
  //    Document toujours frais => references de chunks toujours a jour => plus JAMAIS
  //    de bundle perime. Fallback cache, puis page /offline pour les navigations.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone()
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone))
        return res
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match(OFFLINE_URL) : undefined))
      )
  )
})

// ─── Push notifications (INCHANGE) ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'LS Marketplace', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'))
})
