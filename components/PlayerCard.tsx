'use client'
import { theme, type Grade } from '@/lib/clubhouse'

export const TIER_META: Record<string, { label: string; accent: string }> = {
  rare_2wp_a: { label: '2WP A', accent: '#FFD700' },
  rare_2wp_b: { label: '2WP B', accent: '#E8C15A' },
  elite: { label: 'ELITE', accent: '#4DA6FF' },
  common: { label: 'COMMON', accent: '#2D9E4E' },
}
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const posLabel = (p: string) => SLOT_LABELS[p] ?? p

const CLUB_TINTS: Record<string, string> = {
  'Bandits': '#5B2D8E', 'Howick': '#8A1E41', 'Marist': '#2456E6',
  'Otahuhu': '#2B5C9E', 'Patriots': '#B49759', 'Pukekohe': '#2D9E4E',
  'Ramblers': '#C41E3A', 'Roosters': '#C8102E', 'United': '#E03A3E',
  'United-Marist': '#C8102E', 'Waitakere': '#FFB81C',
}
const clubSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

export type PlayerCardData = {
  id: string
  name: string
  tier: string
  positions: string[]
  speedStar?: boolean
  club?: string
  stats?: Record<string, number>
  photoUrl?: string | null
  playingNumber?: number | null
}

export default function PlayerCard({ player, grade, owned, chip, onClick, siteTheme, cardStyle = 'premium' }: {
  player: PlayerCardData
  grade: Grade
  owned: boolean            // owned = lit face; unowned = greyed
  chip?: string             // optional corner chip, e.g. "IN P(B)"
  onClick?: () => void
  siteTheme?: string
  cardStyle?: 'standard' | 'premium'
}) {
  const T = theme(grade, siteTheme)
  const meta = TIER_META[player.tier] ?? TIER_META.common
  const tint = player.club ? (CLUB_TINTS[player.club] ?? '#E8D5A3') : '#E8D5A3'
  const st = player.stats ?? {}

  return (
    <button onClick={onClick}
      className="rounded-xl text-left transition-all hover:scale-[1.03] flex flex-col"
      style={{
        padding: '4px',
        background: owned
          ? `linear-gradient(165deg, ${meta.accent} 0%, ${meta.accent}50 40%, ${meta.accent}20 100%)`
          : `linear-gradient(165deg, #ffffff20 0%, #ffffff10 100%)`,
        boxShadow: owned ? `0 0 18px ${meta.accent}25` : 'none',
      }}>
      {/* Inner card */}
      <div className="flex-1 rounded-lg overflow-hidden flex flex-col min-h-0 w-full"
        style={{ background: T.surface, border: '1px solid #F5F1E820' }}>

        {/* Mini banner — crest + name */}
        <div className="flex items-center gap-2 pinstripe-fine"
          style={{ background: T.headerBg, borderBottom: `1px solid ${meta.accent}35`, padding: '7px 10px' }}>
          <div className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{ width: '24px', height: '24px', background: '#141210', border: `1px solid ${tint}70` }}>
            {player.club ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/clubs/${clubSlug(player.club)}.jpg`} alt={player.club}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget
                  el.style.display = 'none'
                  if (el.parentElement) {
                    el.parentElement.style.background = `${tint}25`
                    el.parentElement.innerHTML = `<span style="color:${tint};font-weight:900;font-size:10px">${player.club![0]}</span>`
                  }
                }} />
            ) : (
              <span className="text-[10px] font-black" style={{ color: tint }}>·</span>
            )}
          </div>
          <p className="flex-1 min-w-0 text-xs font-black truncate"
            style={{ fontFamily: 'var(--font-heading)', color: owned ? T.text : T.textDim }}>
            {player.name}
          </p>
        </div>

        {/* Photo area — energy slashes backdrop, cut-out standing on base */}
        <div className="relative flex items-end justify-center overflow-hidden" style={{ height: '110px' }}>
          {cardStyle === 'premium' && owned ? (
            <>
              <div className="absolute inset-0" style={{
                backgroundImage: `url(/card-bg-${player.tier === 'rare_2wp_a' ? 'rare2wpa' : player.tier === 'rare_2wp_b' ? 'rare2wpb' : player.tier === 'elite' ? 'elite' : 'common'}.webp)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }} />
              {/* Base fade so the stat band transition stays clean at mini size */}
              <div className="absolute inset-0" style={{
                background: `linear-gradient(180deg, transparent 55%, ${T.surface}E6 100%)`,
              }} />
            </>
          ) : (
            <div className="absolute inset-0" style={{
              background: owned
                ? `linear-gradient(115deg, transparent 0%, transparent 44%, ${meta.accent}28 44%, ${meta.accent}28 54%, transparent 54%, transparent 62%, ${tint}22 62%, ${tint}22 68%, transparent 68%),
                   linear-gradient(180deg, ${meta.accent}18 0%, ${T.surface} 88%)`
                : `linear-gradient(180deg, #ffffff06 0%, ${T.surface} 88%)`,
            }} />
          )}
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photoUrl} alt={player.name} className="relative"
              style={{
                height: '96%',
                width: 'auto',
                maxWidth: '92%',
                objectFit: 'contain',
                objectPosition: 'bottom',
                filter: owned ? 'drop-shadow(0 3px 10px #00000060)' : 'grayscale(1) brightness(0.5)',
              }} />
          ) : (
            <svg width="54" height="74" viewBox="0 0 60 80" fill="none" className="relative"
              style={{ filter: owned ? 'none' : 'grayscale(1) brightness(0.5)' }}>
              <circle cx="30" cy="22" r="12" fill={owned ? meta.accent + '70' : '#ffffff20'} />
              <path d="M8 80 C8 55 52 55 52 80 Z" fill={owned ? meta.accent + '70' : '#ffffff20'} />
            </svg>
          )}
          <span className="absolute top-1.5 left-2 text-[8px] font-black tracking-widest"
            style={{ color: meta.accent, textShadow: `0 0 6px ${meta.accent}80` }}>
            {meta.label}
          </span>
          {!owned && (
            <span className="absolute top-1.5 right-2 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ color: T.textDim, background: '#00000060' }}>
              Unowned
            </span>
          )}
          {owned && chip && (
            <span className="absolute top-1.5 right-2 text-[8px] font-black uppercase tracking-widest"
              style={{ color: T.accent, textShadow: `0 0 6px ${T.accent}90` }}>
              {chip}
            </span>
          )}
        </div>

        {/* Mini stat band */}
        <div style={{ background: T.headerBg, borderTop: `1px solid ${meta.accent}35`, padding: '7px 10px 9px' }}>
          <p className="text-[9px] truncate" style={{ color: T.textDim, marginBottom: '3px' }}>
            {player.positions.map(posLabel).join(' ')}{player.speedStar ? ' · ★' : ''}
          </p>
          <p className="text-xs font-black" style={{ color: meta.accent, marginBottom: '3px' }}>{st.season_points ?? 0} pts</p>
          <div className="flex justify-between text-[10px] items-center" style={{ color: T.textDim }}>
            {st.season_ba != null && <span>BA <b>{Number(st.season_ba).toFixed(3)}</b></span>}
            <span>HR <b>{st.season_hr ?? 0}</b></span>
            <span>RBI <b>{st.season_rbi ?? 0}</b></span>
            <span>SB <b>{st.season_sb ?? 0}</b></span>
            {(st.season_wins ?? 0) > 0 && <span>W <b>{st.season_wins}</b></span>}
          </div>
        </div>
      </div>
    </button>
  )
}