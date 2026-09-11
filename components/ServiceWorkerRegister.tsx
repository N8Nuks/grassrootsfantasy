'use client'
import { useEffect } from 'react'

/* Registers the service worker, and gives us a way out if one ever goes bad.

   Visiting any page with ?sw=off unregisters the worker and clears every
   cache. That escape hatch matters: a broken service worker keeps serving its
   own copy of the site, and a user can't always refresh their way out of it. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const kill = new URLSearchParams(window.location.search).get('sw') === 'off'
    if (kill) {
      navigator.serviceWorker.getRegistrations()
        .then(rs => Promise.all(rs.map(r => r.unregister())))
        .then(() => caches.keys())
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => window.location.replace('/'))
      return
    }

    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Guarded, or a new worker taking over can loop the page
      if (reloading) return
      reloading = true
      window.location.reload()
    })

    const register = () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const next = reg.installing
          if (!next) return
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              next.postMessage('skip-waiting')
            }
          })
        })
      }).catch(() => { /* registration failure is not worth breaking the page over */ })
    }

    // After load, so it never competes with the first paint
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}