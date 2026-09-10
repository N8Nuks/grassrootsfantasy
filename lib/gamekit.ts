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