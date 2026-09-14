'use client'

export type AvatarFrame = 'gold' | 'crystal' | 'diamond'

const FRAMES: Record<AvatarFrame, { label: string; bg: string; ring: string; shine: string }> = {
  gold: {
    label: 'Gold metallic',
    bg: 'conic-gradient(from 210deg, #7A5A12, #F6E27A 18%, #B8860B 32%, #FFF3B0 48%, #8A6914 62%, #E6C55A 78%, #7A5A12)',
    ring: '0 0 0 1px #3A2C08, 0 6px 16px #00000080, 0 0 20px #FFD70030',
    shine: 'inset 0 2px 3px #FFFFFF80, inset 0 -3px 5px #00000070',
  },
  crystal: {
    label: 'Blue crystal',
    bg: 'conic-gradient(from 30deg, #1D3FBE, #9FD0FF 12%, #2456E6 24%, #DFF2FF 36%, #1436A8 50%, #7FB8FF 62%, #1D3FBE 75%, #BFE3FF 88%, #1D3FBE)',
    ring: '0 0 0 1px #0B1A55, 0 6px 16px #00000080, 0 0 20px #4C8DFF40',
    shine: 'inset 0 2px 3px #FFFFFF66, inset 0 -3px 5px #00000060',
  },
  diamond: {
    label: 'Black diamond',
    bg: 'conic-gradient(from 300deg, #0A0A0A, #3A3A3A 14%, #111 26%, #5A5A5A 40%, #0D0D0D 54%, #444 68%, #0A0A0A 82%, #333 92%, #0A0A0A)',
    ring: '0 0 0 1px #000, 0 0 0 2px #C9A227AA, 0 6px 16px #000000A0, 0 0 18px #FFFFFF14',
    shine: 'inset 0 2px 3px #FFFFFF40, inset 0 -3px 5px #00000080',
  },
}

export const AVATAR_FRAMES = (Object.keys(FRAMES) as AvatarFrame[]).map(k => ({ key: k, label: FRAMES[k].label }))

const clubSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

/* Club crest inside one of three frames. Same crest image and crop as the
   card banner, so a club looks the same everywhere. size is the outer
   diameter; the frame ring scales with it. A club with no crest file
   (e.g. Generic) shows the GF mark instead of an empty disc. */
export default function ClubAvatar({ club, frame = 'gold', size = 44 }: {
  club: string
  frame?: AvatarFrame | string
  size?: number
}) {
  const f = FRAMES[(frame as AvatarFrame)] ?? FRAMES.gold
  const pad = Math.max(2, Math.round(size * 0.07))
  return (
    <span className="relative inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, padding: pad, background: f.bg, boxShadow: f.ring, boxSizing: 'border-box' }}>
      <span className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: f.shine }} />
      <span className="block w-full h-full rounded-full overflow-hidden" style={{ background: '#141210' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/clubs/${clubSlug(club)}.jpg`} alt={club} className="w-full h-full object-cover"
          onError={e => { e.currentTarget.src = '/gf-mark.png'; e.currentTarget.onerror = null }} />
      </span>
    </span>
  )
}