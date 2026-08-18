'use client'

/* Procedural manager avatars — no uploads, no moderation, no cost per user.
   Every avatar is drawn from a short seed string like "b3-c07-d2-m4-f1", so
   nothing is stored but the seed and nothing is served but layers.

   The silhouettes are fixed black artwork. All colour lives in the backdrop,
   motif and frame — a black figure against a club-coloured field, which reads
   like proper sports iconography and keeps the artwork untouched.

   Layers: silhouette · colourway · backdrop · motif · frame
   5 x 10 x 8 x 5 x 4 = 8,000 combinations. */

export const SILHOUETTES = ['batter', 'pitcher', 'catcher', 'fielding', 'slide'] as const
export const COLOURWAYS: { fill: string; accent: string }[] = [
  { fill: '#C41E3A', accent: '#FF8FA3' },   // ramblers red
  { fill: '#2456E6', accent: '#8FB4FF' },   // marist blue
  { fill: '#2D9E4E', accent: '#8FE0A8' },   // pukekohe green
  { fill: '#5B2D8E', accent: '#B79BE0' },   // bandits purple
  { fill: '#8A1E41', accent: '#E58FAC' },   // howick maroon
  { fill: '#FFB81C', accent: '#FFE3A0' },   // waitakere gold
  { fill: '#E03A3E', accent: '#FF9B9D' },   // united red
  { fill: '#B49759', accent: '#E8D5A3' },   // patriots sand
  { fill: '#2B5C9E', accent: '#93BCEE' },   // otahuhu blue
  { fill: '#4A5568', accent: '#C9D2DE' },   // neutral slate
]
export const BACKDROPS = ['dirt', 'grass', 'lights', 'dugout', 'chalk', 'sunset', 'halo', 'bands'] as const
export const MOTIFS = ['seams', 'bats', 'glove', 'plate', 'ball'] as const
export const FRAMES = ['plain', 'elite', 'gold', 'twotone'] as const

const FRAME_COLOURS: Record<string, [string, string]> = {
  plain: ['#ffffff30', '#ffffff30'],
  elite: ['#1D3FBE', '#1D3FBE'],
  gold: ['#E8C15A', '#E8C15A'],
  twotone: ['#E8C15A', '#1D3FBE'],
}

export type AvatarSeed = { s: number; c: number; d: number; m: number; f: number }

export function parseSeed(seed: string | null | undefined): AvatarSeed {
  const m = /^b(\d+)-c(\d+)-d(\d+)-m(\d+)-f(\d+)$/.exec(seed ?? '')
  if (!m) return { s: 0, c: 9, d: 0, m: 0, f: 0 }
  return {
    s: Number(m[1]) % SILHOUETTES.length,
    c: Number(m[2]) % COLOURWAYS.length,
    d: Number(m[3]) % BACKDROPS.length,
    m: Number(m[4]) % MOTIFS.length,
    f: Number(m[5]) % FRAMES.length,
  }
}

export function formatSeed(a: AvatarSeed): string {
  return `b${a.s}-c${String(a.c).padStart(2, '0')}-d${a.d}-m${a.m}-f${a.f}`
}

/* Deterministic seed from an account id — everyone gets one at registration
   without choosing, and the same id always produces the same avatar. */
export function seedFromId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return formatSeed({
    s: h % SILHOUETTES.length,
    c: (h >> 3) % COLOURWAYS.length,
    d: (h >> 7) % BACKDROPS.length,
    m: (h >> 11) % MOTIFS.length,
    f: (h >> 15) % FRAMES.length,
  })
}

export function randomSeed(): string {
  const r = (n: number) => Math.floor(Math.random() * n)
  return formatSeed({
    s: r(SILHOUETTES.length), c: r(COLOURWAYS.length),
    d: r(BACKDROPS.length), m: r(MOTIFS.length), f: r(FRAMES.length),
  })
}

/* Backdrops carry all the colour, since the figure itself is fixed black.
   Each returns a CSS background stack. */
function backdropStyle(kind: string, fill: string, accent: string): string {
  switch (kind) {
    case 'dirt':
      return `radial-gradient(ellipse 120% 60% at 50% 108%, ${fill} 0%, ${fill}70 40%, transparent 72%), linear-gradient(180deg, ${accent}25 0%, #1A1512 70%)`
    case 'grass':
      return `linear-gradient(180deg, ${accent}30 0%, ${accent}18 52%, ${fill} 52%, ${fill}CC 100%)`
    case 'lights':
      return `radial-gradient(ellipse 90% 65% at 50% -8%, ${accent} 0%, ${fill}80 34%, #0C0F18 78%)`
    case 'dugout':
      return `linear-gradient(180deg, #000000 0%, #000000 32%, ${fill} 32%, ${fill}90 100%)`
    case 'chalk':
      return `linear-gradient(135deg, transparent 44%, ${accent}55 44%, ${accent}55 49%, transparent 49%), linear-gradient(225deg, transparent 44%, ${accent}55 44%, ${accent}55 49%, transparent 49%), linear-gradient(180deg, ${fill}CC 0%, ${fill}70 100%)`
    case 'sunset':
      return `linear-gradient(180deg, ${accent} 0%, ${fill} 46%, #1A0F14 100%)`
    case 'halo':
      return `radial-gradient(circle at 50% 44%, ${accent} 0%, ${fill} 38%, ${fill}50 62%, #0D0D12 88%)`
    default: // bands
      return `repeating-linear-gradient(180deg, ${fill} 0px, ${fill} 16px, ${fill}A0 16px, ${fill}A0 32px)`
  }
}

/* Motifs sit behind the figure, low opacity, in the accent colour */
function Motif({ kind, accent }: { kind: string; accent: string }) {
  const o = 0.22
  if (kind === 'seams') return <g opacity={o} stroke={accent} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeDasharray="4 5"><path d="M16 6 Q34 50 16 94" /><path d="M84 6 Q66 50 84 94" /></g>
  if (kind === 'bats') return <g opacity={o} stroke={accent} strokeWidth="5" strokeLinecap="round"><path d="M18 86 L78 18" /><path d="M82 86 L22 18" /></g>
  if (kind === 'glove') return <g opacity={o} fill={accent}><path d="M30 42 q0 -18 20 -18 q20 0 20 18 v20 q0 16 -20 16 q-20 0 -20 -16 Z" /></g>
  if (kind === 'plate') return <g opacity={o} fill={accent}><path d="M32 38 h36 v22 l-18 16 -18 -16 Z" /></g>
  return <g opacity={o} fill="none" stroke={accent} strokeWidth="3"><circle cx="50" cy="48" r="28" /><path d="M30 30 Q50 48 30 66" /><path d="M70 30 Q50 48 70 66" /></g>
}

export default function Avatar({ seed, size = 44 }: { seed: string | null | undefined; size?: number }) {
  const a = parseSeed(seed)
  const col = COLOURWAYS[a.c]
  const [f1, f2] = FRAME_COLOURS[FRAMES[a.f]]
  return (
    <span className="inline-block rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size, padding: '2px', background: `linear-gradient(150deg, ${f1} 0%, ${f2} 100%)` }}>
      <span className="relative block w-full h-full rounded-full overflow-hidden"
        style={{ background: backdropStyle(BACKDROPS[a.d], col.fill, col.accent) }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <Motif kind={MOTIFS[a.m]} accent={col.accent} />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/avatars/silhouette-${SILHOUETTES[a.s]}.png`} alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'contain', objectPosition: 'center bottom', filter: 'brightness(0) drop-shadow(0 1px 3px #00000060)' }} />
      </span>
    </span>
  )
}