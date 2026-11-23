// QPlan service worker.
// Its only jobs are to make QPlan installable and to show a friendly page when there is no
// internet. It never stores job data, and it never serves an old copy of the app.
const CACHE = 'qplan-shell-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // Only page loads are handled. Everything else goes straight to the network as normal.
  if (req.mode !== 'navigate') return
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
})
