'use client'
import { theme, type Grade } from '@/lib/clubhouse'

const TIER_META: Record<string, { label: string; accent: string }> = {
  rare_2wp_a: { label: '2WP A', accent: '#FFD700' },
  rare_2wp_b: { label: '2WP B', accent: '#E8C15A' },
  elite: { label: 'ELITE', accent: '#C0C0C0' },
  common: { label: 'COMMON', accent: '#2D9E4E' },
}
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const posLabel = (p: string) => SLOT_LABELS[p] ?? p

// Placeholder crest tints until club logos land — same map as the Hall corridor
const CLUB_TINTS: Record<string, string> = {
  'Bandits': '#D64545', 'Howick': '#3FBF63', 'Marist': '#4D7FFF',
  'Otahuhu': '#E8983A', 'Patriots': '#B04DFF', 'Pukekohe': '#45C8D6',
  'Ramblers': '#FFC425', 'Roosters': '#FF6B6B', 'United': '#6BCB77',
  'United-Marist': '#7F9CF5', 'Waitakere': '#F08FC0',
}

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
}

export default function PlayerCardFull({ player, grade, owned }: {
  player: FullCardPlayer
  grade: Grade
  owned: boolean
}) {
  const T = theme(grade)
  const meta = TIER_META[player.tier] ?? TIER_META.common
  const tint = CLUB_TINTS[player.club] ?? '#E8D5A3'
  const st = player.stats ?? {}

  const seasonRow: [string, string | number][] = [
    ['BA', st.season_ba != null ? Number(st.season_ba).toFixed(3) : '.000'],
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

  return (
    <div className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{ aspectRatio: '5 / 7.2', background: T.surface, border: `2px solid ${meta.accent}70`, boxShadow: `0 0 32px ${meta.accent}25` }}>

      {/* Banner — top ~1/5: crest / club / number */}
      <div className="flex items-center gap-3 pinstripe-fine" style={{ flex: '0 0 19%', background: T.headerBg, borderBottom: `1px solid ${meta.accent}30`, padding: '0 16px' }}>
        {/* Crest placeholder until club logos land */}
        <div className="rounded-full flex items-center justify-center shrink-0"
          style={{ width: '42px', height: '42px', background: `${tint}25`, border: `1.5px solid ${tint}70` }}>
          <span className="text-base font-black" style={{ color: tint }}>{player.club[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] truncate" style={{ color: T.textDim }}>{player.club}</p>
          <p className="text-sm font-black truncate" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{player.name}</p>
        </div>
        {player.playingNumber != null && (
          <span className="text-2xl font-black shrink-0" style={{ fontFamily: 'var(--font-heading)', color: meta.accent }}>#{player.playingNumber}</span>
        )}
      </div>

      {/* Photo / artwork area — the middle */}
      <div className="relative flex items-end justify-center" style={{ flex: '1 1 auto', background: owned
        ? `linear-gradient(180deg, ${meta.accent}28 0%, ${T.surface} 90%)`
        : `linear-gradient(180deg, #ffffff08 0%, ${T.surface} 90%)` }}>
        {/* PHOTO SLOT — player photo/artwork replaces this silhouette when assets land */}
        <svg width="46%" viewBox="0 0 60 80" fill="none" style={{ filter: owned ? 'none' : 'grayscale(1) brightness(0.5)', maxHeight: '88%' }}>
          <circle cx="30" cy="22" r="13" fill={owned ? meta.accent + '75' : '#ffffff20'} />
          <path d="M6 80 C6 52 54 52 54 80 Z" fill={owned ? meta.accent + '75' : '#ffffff20'} />
        </svg>
        <span className="absolute top-2.5 left-3 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full"
          style={{ color: meta.accent, background: '#000000AA' }}>{meta.label}</span>
        <span className="absolute top-2.5 right-3 text-[9px] font-bold px-2.5 py-1 rounded-full"
          style={{ color: T.text, background: '#000000AA' }}>
          {player.positions.map(posLabel).join(' · ')}{player.speedStar ? ' · ★' : ''}
        </span>
        {!owned && (
          <span className="absolute bottom-2.5 right-3 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: T.textDim, background: '#000000AA' }}>Unowned</span>
        )}
      </div>

      {/* Stats — bottom ~1/4 */}
      <div style={{ flex: '0 0 25%', background: T.headerBg, borderTop: `1px solid ${meta.accent}30`, padding: '10px 16px' }}>
        <p className="text-[8px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: meta.accent }}>2025/26 Season</p>
        <div className="flex gap-3 text-[11px] flex-wrap mb-2" style={{ color: T.text }}>
          {seasonRow.map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)}
        </div>
        <p className="text-[8px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: T.textDim }}>Last 2 Seasons</p>
        <div className="flex gap-3 text-[11px] flex-wrap" style={{ color: T.text }}>
          {careerRow.length ? careerRow.map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)
            : <span style={{ color: T.textDim }}>No prior stats</span>}
        </div>
      </div>
    </div>
  )
}