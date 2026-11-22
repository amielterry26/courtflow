// Runs admin service worker (runs.courtflowhoops.com) — push notifications only, no caching
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  const d = e.data ? e.data.json() : {}
  const jobs = [
    self.registration.showNotification(d.title || 'CourtFlow Runs', {
      body: d.body,
      icon: '/runs-icon-192.png',
      badge: '/runs-icon-192.png',
      data: { url: d.url || '/admin/requests' },
    }),
  ]
  if (typeof d.badge === 'number' && self.navigator.setAppBadge) jobs.push(self.navigator.setAppBadge(d.badge))
  e.waitUntil(Promise.all(jobs))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow(e.notification.data?.url || '/admin/requests'))
})
