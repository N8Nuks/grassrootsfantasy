/* Confetti for a game being finished.

   Each cabinet fires in its own --neon, so the celebration belongs to the game
   rather than to the arcade. A single flat colour reads cheap, so the burst
   mixes the neon at full strength, a dimmed version of it, and bone white. */

const BONE = '#F5F1E8'

/* --neon is a CSS variable, and canvas-confetti wants real colours, so it has
   to be resolved off the element the game is inside. */
function palette(el?: HTMLElement | null) {
  const root = el ?? document.documentElement
  const neon = getComputedStyle(root).getPropertyValue('--neon').trim() || BONE
  return [neon, neon, BONE, dim(neon)]
}

/* A darker sibling of the neon, so the burst has depth without introducing a
   colour that isn't the game's. Falls back to the neon itself if it isn't hex. */
function dim(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.round(((n >> 16) & 255) * 0.55)
  const g = Math.round(((n >> 8) & 255) * 0.55)
  const b = Math.round((n & 255) * 0.55)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/* Two cannons firing inward from the lower corners, then a wider fall a beat
   later. Reads as a stadium moment rather than a page effect.

   The library is pulled in dynamically rather than imported at the top of the
   file: it resolves to a UMD source that checks for `window` when the module
   first evaluates, and on the server that check fails and leaves a no-op
   behind. Importing it here guarantees a browser. */
export async function celebrate(el?: HTMLElement | null) {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let confetti
  try {
    confetti = (await import('canvas-confetti')).default
  } catch (err) {
    console.warn('confetti failed to load', err)
    return
  }
  if (typeof confetti !== 'function') {
    console.warn('confetti did not resolve to a function')
    return
  }

  const colors = palette(el)
  // High enough to clear the game overlay and the nav without guessing
  const base = { colors, disableForReducedMotion: true, zIndex: 9999 }

  confetti({ ...base, particleCount: 70, spread: 55, angle: 60, origin: { x: 0, y: 0.75 }, startVelocity: 48 })
  confetti({ ...base, particleCount: 70, spread: 55, angle: 120, origin: { x: 1, y: 0.75 }, startVelocity: 48 })

  setTimeout(() => {
    confetti({ ...base, particleCount: 110, spread: 100, origin: { x: 0.5, y: 0.4 }, startVelocity: 34, gravity: 0.9, scalar: 1.1 })
  }, 260)

  setTimeout(() => {
    confetti({ ...base, particleCount: 60, spread: 120, origin: { x: 0.5, y: 0.3 }, startVelocity: 22, gravity: 0.7, scalar: 0.8, ticks: 260 })
  }, 700)
}