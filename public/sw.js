/* Grassroots Fantasy service worker.

   What this does: makes return visits open instantly by serving the app shell
   and static assets from the device, while leaving anything live alone.

   IMPORTANT — bump VERSION on every deploy that changes this file. A service
   worker is sticky: it keeps serving its cached copy until a new one replaces
   it, so a stale worker can outlive a deploy. The version is what forces the
   old caches out. */
const VERSION = 'gf-v1'
const STATIC = `${VERSION}-static`
const IMAGES = `${VERSION}-img`
const PAGES = `${VERSION}-pages`
const OFFLINE = '/offline.html'

/* Never cached. These are live — a stale ladder or a stale team page is worse
   than a slow one, and auth pages must always hit the network. */
const LIVE = [
  '/api/', '/auth/', '/admin',
  '/team', '/ladder', '/matchups', '/leaders', '/analytics',
  '/login', '/register', '/reset-password', '/forgot-password',
]
const isLive = (path) => LIVE.some(p => path.startsWith(p))

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PAGES)
      .then(c => c.add(OFFLINE))
      .then(() => self.skipWaiting())
  )
})

/* Clear out anything from a previous version, then take over open tabs. */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

/* The page can ask us to step aside — see the unregister path in the
   registration component. */
self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Only our own origin. Supabase, analytics and fonts go straight through.
  if (url.origin !== self.location.origin) return
  if (isLive(url.pathname)) return

  /* Hashed build assets never change under the same URL, so cache-first is
     safe and is where most of the speed comes from. */
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC))
    return
  }

  // Player photos, crests, icons, splash screens
  if (/\.(png|jpe?g|webp|svg|gif|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGES))
    return
  }

  /* Pages: try the network so content stays fresh, fall back to the last copy
     we held, and fall back again to an honest offline page. */
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }
}) 

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) (await caches.open(cacheName)).put(request, res.clone())
    return res
  } catch {
    return new Response('', { status: 504 })
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request)
    if (res.ok) (await caches.open(PAGES)).put(request, res.clone())
    return res
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return (await caches.match(OFFLINE)) ?? new Response('', { status: 504 })
  }
}