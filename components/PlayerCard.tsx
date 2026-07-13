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

export type PlayerCardData = {
  id: string
  name: string
  tier: string
  positions: string[]
  speedStar?: boolean
  club?: string
  stats?: Record<string, number>
}

export default function PlayerCard({ player, grade, owned, chip, onClick }: {
  player: PlayerCardData
  grade: Grade
  owned: boolean            // owned = lit face; unowned = greyed silhouette
  chip?: string             // optional corner chip, e.g. "IN P(B)"
  onClick?: () => void
}) {
  const T = theme(grade)
  const meta = TIER_META[player.tier] ?? TIER_META.common
  const st = player.stats ?? {}

  return (
    <button onClick={onClick}
      className="rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.03]"
      style={{
        background: T.surface,
        border: `1px solid ${owned ? meta.accent + '60' : '#ffffff12'}`,
      }}>
      {/* Card face — photo slot; silhouette until photos land */}
      <div className="relative flex items-end justify-center"
        style={{
          height: '120px',
          background: owned
            ? `linear-gradient(180deg, ${meta.accent}30 0%, ${T.surface} 100%)`
            : `linear-gradient(180deg, #ffffff08 0%, ${T.surface} 100%)`,
        }}>
        <svg width="64" height="86" viewBox="0 0 60 80" fill="none"
          style={{ filter: owned ? 'none' : 'grayscale(1) brightness(0.55)' }}>
          <circle cx="30" cy="22" r="12" fill={owned ? meta.accent + '70' : '#ffffff20'} />
          <path d="M8 80 C8 55 52 55 52 80 Z" fill={owned ? meta.accent + '70' : '#ffffff20'} />
        </svg>
        {!owned && (
          <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: T.textDim, background: '#00000060' }}>
            Unowned
          </span>
        )}
        {owned && chip && (
          <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest"
            style={{ color: T.accent, textShadow: `0 0 8px ${T.accent}90` }}>
            {chip}
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <span className="text-[9px] font-black tracking-widest" style={{ color: meta.accent, textShadow: `0 0 8px ${meta.accent}80` }}>
          {meta.label}
        </span>
        <p className="text-sm font-black mt-2 truncate" style={{ fontFamily: 'var(--font-heading)', color: owned ? T.text : T.textDim }}>
          {player.name}
        </p>
        <p className="text-[10px] truncate" style={{ color: T.textDim }}>
          {player.club ? `${player.club} · ` : ''}{player.positions.map(posLabel).join(' ')}{player.speedStar ? ' · ★' : ''}
        </p>
        {(st.career_ba != null || st.career_hr != null || st.career_sb != null) && (
          <div className="flex gap-3 text-[10px] mt-1.5" style={{ color: T.textDim }}>
            {st.career_ba != null && <span>BA <b>{Number(st.career_ba).toFixed(3)}</b></span>}
            {st.career_hr != null && <span>HR <b>{st.career_hr}</b></span>}
            {st.career_sb != null && <span>SB <b>{st.career_sb}</b></span>}
          </div>
        )}
      </div>
    </button>
  )
}