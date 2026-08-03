'use client'
import { theme, type Grade } from '@/lib/clubhouse'

const TIER_META: Record<string, { label: string; accent: string }> = {
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

export type FullCardPlayer = {
  id: string
  name: string
  tier: string
  positions: string[]
  club: string
  playingNumber?: number | null
  speedStar?: boolean
  badges?: string[]
  stats: Record<string, number>
  photoUrl?: string | null
}

export default function PlayerCardFull({ player, grade, owned, siteTheme }: {
  player: FullCardPlayer
  grade: Grade
  owned: boolean
  siteTheme?: string
}) {
  const T = theme(grade, siteTheme)
  const meta = TIER_META[player.tier] ?? TIER_META.common
  const tint = CLUB_TINTS[player.club] ?? '#E8D5A3'
  const st = player.stats ?? {}

  const seasonRow: [string, string | number][] = [
    ['BA', st.season_ba != null ? Number(st.season_ba).toFixed(3) : '—'],
    ['HR', st.season_hr ?? 0],
    ['RBI', st.season_rbi ?? 0],
    ['SB', st.season_sb ?? 0],
  ]
  const careerRow = [
    st.career_ba != null ? ['BA', Number(st.career_ba).toFixed(3)] : null,
    st.career_hr != null ? ['HR', st.career_hr] : null,
    st.career_rbi != null ? ['RBI', st.career_rbi] : null,
    st.career_sb != null ? ['SB', st.career_sb] : null,
    st.career_ip != null ? ['IP', st.career_ip] : null,
    st.career_wins != null ? ['W', st.career_wins] : null,
  ].filter(Boolean) as [string, string | number][]

  function StatRow({ label, row, bright }: { label: string; row: [string, string | number][]; bright: boolean }) {
    return (
      <div className="text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-1.5"
          style={{ color: bright ? meta.accent : T.textDim }}>{label}</p>
        <div className="flex justify-center gap-5 flex-wrap" style={{ color: T.text }}>
          {row.length ? row.map(([k, v]) => (
            <span key={k} className="text-center">
              <span className="block text-[9px] font-black uppercase tracking-widest" style={{ color: T.textDim }}>{k}</span>
              <span className="block text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: bright ? T.text : T.textDim }}>{v}</span>
            </span>
          )) : <span className="text-xs" style={{ color: T.textDim }}>No prior stats</span>}
        </div>
      </div>
    )
  }

  return (
    // Outer tier frame
    <div className="w-full rounded-2xl flex flex-col"
      style={{
        aspectRatio: '5 / 7.2', maxHeight: '78vh', margin: '0 auto',
        padding: '7px',
        background: `linear-gradient(165deg, ${meta.accent} 0%, ${meta.accent}55 40%, ${meta.accent}25 100%)`,
        boxShadow: `0 0 36px ${meta.accent}30`,
      }}>
      {/* Inner card */}
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
        style={{ background: T.surface, border: '1px solid #F5F1E825' }}>

        {/* Banner — crest / club + name / gem */}
        <div className="flex items-center gap-3 pinstripe-fine" style={{ flex: '0 0 19%', background: T.headerBg, borderBottom: `1px solid ${meta.accent}40`, padding: '0 14px' }}>
          <div className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{ width: '44px', height: '44px', background: '#141210', border: `1.5px solid ${tint}70` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/clubs/${clubSlug(player.club)}.jpg`} alt={player.club}
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.currentTarget
                el.style.display = 'none'
                if (el.parentElement) {
                  el.parentElement.style.background = `${tint}25`
                  el.parentElement.innerHTML = `<span style="color:${tint};font-weight:900;font-size:16px">${player.club[0]}</span>`
                }
              }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] truncate" style={{ color: T.textDim }}>{player.club}</p>
            <p className="text-sm font-black truncate" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{player.name}</p>
          </div>
          {player.playingNumber != null && (
            // Gem corner
            <div className="shrink-0 flex items-center justify-center"
              style={{
                width: '40px', height: '40px',
                background: `linear-gradient(150deg, ${meta.accent} 0%, ${meta.accent}60 100%)`,
                clipPath: 'polygon(50% 0%, 100% 28%, 100% 72%, 50% 100%, 0% 72%, 0% 28%)',
                boxShadow: `0 0 14px ${meta.accent}60`,
              }}>
              <span className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: '#141210' }}>{player.playingNumber}</span>
            </div>
          )}
        </div>

        {/* Photo / artwork area */}
        <div className="relative flex items-end justify-center overflow-hidden" style={{ flex: '1 1 auto', minHeight: 0, background: T.surface }}>
          {/* Diagonal energy slashes */}
          <div className="absolute inset-0" style={{
            background: owned
              ? `linear-gradient(115deg, transparent 0%, transparent 42%, ${meta.accent}30 42%, ${meta.accent}30 52%, transparent 52%, transparent 60%, ${tint}28 60%, ${tint}28 66%, transparent 66%),
                 linear-gradient(180deg, ${meta.accent}20 0%, ${T.surface} 85%)`
              : `linear-gradient(180deg, #ffffff08 0%, ${T.surface} 85%)`,
          }} />
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photoUrl} alt={player.name} className="relative"
              style={{
                height: '92%',
                width: 'auto',
                maxWidth: '94%',
                objectFit: 'contain',
                objectPosition: 'bottom',
                filter: owned ? 'drop-shadow(0 6px 18px #00000070)' : 'grayscale(1) brightness(0.5)',
              }} />
          ) : (
            // PHOTO SLOT — silhouette until this player's photo lands
            <svg width="46%" viewBox="0 0 60 80" fill="none" className="relative"
              style={{ filter: owned ? 'none' : 'grayscale(1) brightness(0.5)', maxHeight: '88%' }}>
              <circle cx="30" cy="22" r="13" fill={owned ? meta.accent + '75' : '#ffffff20'} />
              <path d="M6 80 C6 52 54 52 54 80 Z" fill={owned ? meta.accent + '75' : '#ffffff20'} />
            </svg>
          )}
          <span className="absolute top-3 left-3.5 text-[10px] font-black tracking-widest"
            style={{ color: meta.accent, textShadow: `0 0 8px ${meta.accent}90, 0 0 16px ${meta.accent}50` }}>{meta.label}</span>
          {!owned && (
            <span className="absolute top-3 right-3.5 text-[9px] font-black uppercase tracking-widest"
              style={{ color: T.textDim, textShadow: '0 0 8px #00000090' }}>Unowned</span>
          )}
        </div>

        {/* Stats band — centred, enlarged */}
        <div style={{ flex: '0 0 auto', background: T.headerBg, borderTop: `1px solid ${meta.accent}40`, padding: '12px 14px 14px' }}>
          <p className="text-[10px] font-black tracking-widest mb-3 text-center" style={{ color: meta.accent, textShadow: `0 0 8px ${meta.accent}70` }}>
            {player.positions.map(posLabel).join(' · ')}{player.speedStar ? ' · ★' : ''}
          </p>
          <div className="flex flex-col gap-3">
            <StatRow label="2026/27 Season" row={seasonRow} bright={true} />
            <StatRow label="Last 3 Seasons" row={careerRow} bright={false} />
          </div>
        </div>
      </div>
    </div>
  )
}