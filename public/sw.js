const CACHE = 'courtflow-v2'

// On install: cache the app shell immediately
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(['/', '/index.html']))
  )
  self.skipWaiting()
})

// On activate: delete old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Supabase storage (video files) — cache first, videos don't change
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    e.respondWith(cacheFirst(request))
    return
  }

  // Supabase REST API — stale-while-revalidate so offline shows cached data
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(staleWhileRevalidate(request))
    return
  }

  // App navigation — network first, fall back to cached index.html so the app loads offline
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // JS/CSS/font assets (content-hashed, immutable) — cache first
  if (/\.(js|css|woff2?|svg|png|ico|webp)$/.test(url.pathname)) {
    e.respondWith(cacheFirst(request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  // Return cached immediately if available, otherwise wait for network
  return cached ?? fetchPromise ?? new Response('[]', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
