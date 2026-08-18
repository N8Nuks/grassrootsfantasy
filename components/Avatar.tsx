'use client'

/* Procedural manager avatars — no uploads, no moderation, no cost per user.
   Every avatar is drawn from a short seed string like "b3-c07-d2-m4-f1", so
   nothing is stored but the seed and nothing is served but SVG.

   Layers: silhouette · colourway · backdrop · motif · frame
   5 x 10 x 5 x 5 x 4 = 5,000 combinations.

   The silhouettes here are placeholders — rough shapes standing in until proper
   artwork is commissioned. Everything else is final. */

export const SILHOUETTES = ['batter', 'pitcher', 'catcher', 'fielder', 'runner'] as const
export const COLOURWAYS: { fill: string; accent: string }[] = [
  { fill: '#C41E3A', accent: '#F5F1E8' },   // ramblers red
  { fill: '#2456E6', accent: '#E8F0FF' },   // marist blue
  { fill: '#2D9E4E', accent: '#E9FBEF' },   // pukekohe green
  { fill: '#5B2D8E', accent: '#EFE6FA' },   // bandits purple
  { fill: '#8A1E41', accent: '#FBE9EF' },   // howick maroon
  { fill: '#FFB81C', accent: '#2A2100' },   // waitakere gold
  { fill: '#E03A3E', accent: '#FFF0F0' },   // united red
  { fill: '#B49759', accent: '#241E10' },   // patriots sand
  { fill: '#2B5C9E', accent: '#EAF2FF' },   // otahuhu blue
  { fill: '#C9D2DE', accent: '#141821' },   // neutral silver
]
export const BACKDROPS = ['dirt', 'grass', 'lights', 'dugout', 'chalk'] as const
export const MOTIFS = ['seams', 'bats', 'glove', 'plate', 'ball'] as const
export const FRAMES = ['plain', 'elite', 'gold', 'twotone'] as const

const FRAME_COLOURS: Record<string, [string, string]> = {
  plain: ['#ffffff28', '#ffffff28'],
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

/* ── Placeholder silhouettes ──
   Rough single-path shapes on a 100x100 box. These are deliberately crude —
   they stand in so the system can be judged before artwork is commissioned. */
function Silhouette({ kind, fill }: { kind: string; fill: string }) {
  const paths: Record<string, string> = {
    batter: 'M50 22 a9 9 0 1 1 0.1 0 Z M44 34 h12 l6 22 -4 3 -6 -16 v20 l6 24 h-7 l-6 -20 -5 20 h-7 l6 -24 v-29 Z M60 30 l22 -12 3 5 -22 12 Z',
    pitcher: 'M52 20 a9 9 0 1 1 0.1 0 Z M46 32 h12 l4 20 -5 2 -4 -12 v18 l7 26 h-7 l-6 -21 -6 21 h-7 l7 -26 v-28 Z M44 34 l-16 -14 4 -4 16 14 Z',
    catcher: 'M50 26 a10 10 0 1 1 0.1 0 Z M40 40 h20 l6 16 -6 4 -4 -8 v10 h-12 v-10 l-4 8 -6 -4 Z M38 62 h24 l4 22 h-9 l-2 -14 h-10 l-2 14 h-9 Z',
    fielder: 'M50 20 a9 9 0 1 1 0.1 0 Z M44 32 h12 v24 l8 26 h-7 l-7 -20 -7 20 h-7 l8 -26 Z M44 34 l-20 8 -2 -6 20 -8 Z M56 34 l18 -16 4 5 -18 16 Z',
    runner: 'M56 20 a9 9 0 1 1 0.1 0 Z M48 32 h12 l2 18 -6 3 v6 l12 18 -6 4 -12 -18 -14 12 -5 -5 14 -14 Z M46 36 l-18 -6 2 -6 18 6 Z',
  }
  return <path d={paths[kind] ?? paths.batter} fill={fill} />
}

function Backdrop({ kind, fill, accent }: { kind: string; fill: string; accent: string }) {
  if (kind === 'dirt') return <><rect width="100" height="100" fill="#1A1512" /><path d="M0 74 Q50 52 100 74 V100 H0 Z" fill={fill} opacity="0.28" /></>
  if (kind === 'grass') return <><rect width="100" height="100" fill="#0E1A10" /><rect y="58" width="100" height="42" fill={fill} opacity="0.22" /><rect y="58" width="100" height="3" fill={accent} opacity="0.3" /></>
  if (kind === 'lights') return <><rect width="100" height="100" fill="#0C0F18" /><ellipse cx="50" cy="14" rx="52" ry="34" fill={accent} opacity="0.18" /></>
  if (kind === 'dugout') return <><rect width="100" height="100" fill="#101014" /><rect y="0" width="100" height="34" fill="#000000" opacity="0.5" /><rect y="33" width="100" height="2" fill={fill} opacity="0.5" /></>
  return <><rect width="100" height="100" fill="#12140F" /><path d="M-10 88 L60 18" stroke={accent} strokeWidth="4" opacity="0.25" /><path d="M110 88 L40 18" stroke={accent} strokeWidth="4" opacity="0.25" /></>
}

function Motif({ kind, accent }: { kind: string; accent: string }) {
  const o = 0.14
  if (kind === 'seams') return <g opacity={o} stroke={accent} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeDasharray="4 5"><path d="M18 8 Q34 50 18 92" /><path d="M82 8 Q66 50 82 92" /></g>
  if (kind === 'bats') return <g opacity={o} stroke={accent} strokeWidth="5" strokeLinecap="round"><path d="M20 84 L76 20" /><path d="M80 84 L24 20" /></g>
  if (kind === 'glove') return <g opacity={o} fill={accent}><path d="M32 44 q0 -16 18 -16 q18 0 18 16 v18 q0 14 -18 14 q-18 0 -18 -14 Z" /></g>
  if (kind === 'plate') return <g opacity={o} fill={accent}><path d="M34 40 h32 v20 l-16 14 -16 -14 Z" /></g>
  return <g opacity={o} fill="none" stroke={accent} strokeWidth="3"><circle cx="50" cy="50" r="26" /><path d="M32 32 Q50 50 32 68" /><path d="M68 32 Q50 50 68 68" /></g>
}

export default function Avatar({ seed, size = 44 }: { seed: string | null | undefined; size?: number }) {
  const a = parseSeed(seed)
  const col = COLOURWAYS[a.c]
  const [f1, f2] = FRAME_COLOURS[FRAMES[a.f]]
  return (
    <span className="inline-block rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size, padding: '2px', background: `linear-gradient(150deg, ${f1} 0%, ${f2} 100%)` }}>
      <svg viewBox="0 0 100 100" className="w-full h-full rounded-full" style={{ display: 'block' }}>
        <Backdrop kind={BACKDROPS[a.d]} fill={col.fill} accent={col.accent} />
        <Motif kind={MOTIFS[a.m]} accent={col.accent} />
        <Silhouette kind={SILHOUETTES[a.s]} fill={col.fill} />
      </svg>
    </span>
  )
}