/* Shared canvas helpers for the arcade.
   Every game draws in CSS pixels and lets this module handle the device. */

/* ── Resolution ──
   A canvas has two sizes: the backing store (width/height attributes) and the
   displayed size (CSS). Our games hardcode the first and stretch it with
   width:100%, so on any retina screen the browser upscales and every line
   softens. This sizes the store to the real device pixels, then scales the
   context so all drawing code can keep working in CSS pixels.

   Call it at the top of draw() and use the W and H it returns. */
export function fitCanvas(cv: HTMLCanvasElement, aspect: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const cssW = cv.clientWidth || cv.width
  const cssH = Math.round(cssW / aspect)
  const wantW = Math.round(cssW * dpr)
  const wantH = Math.round(cssH * dpr)

  if (cv.width !== wantW || cv.height !== wantH) {
    cv.width = wantW
    cv.height = wantH
  }

  // Setting width resets the transform, and save/restore pairs can leave it
  // dirty, so it goes back every frame. It's cheap.
  const ctx = cv.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  return { W: cssW, H: cssH, dpr }
}

/* ── Fonts ──
   ctx.font can't resolve CSS variables, so `var(--font-heading)` silently falls
   back to plain sans-serif on every canvas in the arcade. This reads the
   variable off the document and hands back a string canvas will accept. */
let cachedHeading = ''
export function headingFont(size: number, weight = 900) {
  if (!cachedHeading) {
    cachedHeading =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--font-heading')
        .trim() || 'sans-serif'
  }
  return `${weight} ${Math.round(size)}px ${cachedHeading}, sans-serif`
}

/* ── Palette ──
   These are the values already in use across the games, gathered in one place.
   Per-game accent stays as --neon; this is everything that shouldn't vary. */
export const P = {
  ball: '#E8FF3D',
  seam: '#C41E3A',

  bone: '#F5F1E8',
  panel: '#07080D',
  mute: '#8FA0B4',
  dim: '#4E5A6A',

  good: '#5CFF6B',
  safe: '#39FF9E',
  warn: '#FFB800',
  fail: '#FF4D4D',

  dirt: '#6B4630',
  dirtLit: '#8A5C3D',
  grass: '#164429',
  grassLit: '#1B5232',
  night: '#0B1119',

  shadow: '#00000070',
} as const
/* ── Screen shake ──
   A hit that doesn't move the world reads as a picture changing rather than
   something happening. This is the cheapest way to make contact feel physical.

   Usage: call shake(state, strength) at the moment of impact, then wrap the
   frame's drawing in applyShake(ctx, state, dt) / ctx.restore().

   Strength is in CSS pixels of initial displacement. 6 is a solid contact,
   14 is a home run, 3 is a tap. It decays on its own. */
export type Shake = { power: number; x: number; y: number }

export const newShake = (): Shake => ({ power: 0, x: 0, y: 0 })

export function shake(s: Shake, strength: number) {
  // Never reduce an ongoing shake — a second hit while the first decays should
  // read as harder, not as a reset to something softer.
  s.power = Math.max(s.power, strength)
}

/* Wrap drawing in this. Returns true if it pushed a transform, so the caller
   knows whether to restore. Decay is time-based, so it feels identical on a
   60Hz laptop and a 120Hz phone. */
export function applyShake(ctx: CanvasRenderingContext2D, s: Shake, dt: number) {
  if (s.power <= 0.15) { s.power = 0; return false }
  // Random direction each frame, magnitude falling away — reads as an impact
  // rather than a wobble
  s.x = (Math.random() * 2 - 1) * s.power
  s.y = (Math.random() * 2 - 1) * s.power
  s.power *= Math.pow(0.0035, dt / 1000)   // ~94% gone in 350ms
  ctx.save()
  ctx.translate(s.x, s.y)
  return true
}