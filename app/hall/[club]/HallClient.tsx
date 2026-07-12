'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'

export type HallPlayer = {
  id: string
  name: string
  tier: string
  positions: string[]
  badges: string[]
  speedStar: boolean
  careerGames: number | null
  stats: Record<string, number>
}

const TIER_META: Record<string, { label: string; accent: string }> = {
  rare_2wp_a: { label: '2WP A', accent: '#FFD700' },
  rare_2wp_b: { label: '2WP B', accent: '#E8C15A' },
  elite: { label: 'ELITE', accent: '#C0C0C0' },
  common: { label: 'COMMON', accent: '#2D9E4E' },
}
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const posLabel = (p: string) => SLOT_LABELS[p] ?? p
const TIER_ORDER = ['rare_2wp_a', 'rare_2wp_b', 'elite', 'common']

export default function HallClient({ clubName, clubSlug, grade, grades, roster, ownedPlayerIds }: {
  clubName: string
  clubSlug: string
  grade: Grade
  grades: Grade[]
  roster: HallPlayer[]
  ownedPlayerIds: string[]
}) {
  const T = theme(grade)
  const owned = new Set(ownedPlayerIds)
  const [detail, setDetail] = useState<HallPlayer | null>(null)

  const sorted = [...roster].sort((a, b) => {
    const t = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
    if (t !== 0) return t
    return a.name.localeCompare(b.name)
  })
  const ownedCount = roster.filter(p => owned.has(p.id)).length

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '70px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <a href="/hall" className="text-[11px] font-bold uppercase tracking-widest" style={{ color: T.textDim }}>← Back to the Hall</a>
            <h1 className="text-3xl sm:text-4xl font-black mt-4 mb-2" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{clubName}</h1>
            <p className="text-sm mb-5" style={{ color: T.textDim }}>
              {roster.length} players · {ownedCount} in your squad
            </p>
            {grades.length > 1 ? (
              <div className="flex justify-center">
                <GradeSwitch grade={grade} mensHref={`/hall/${clubSlug}?grade=mens`} womensHref={`/hall/${clubSlug}?grade=womens`} />
              </div>
            ) : (
              <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: T.accent }}>
                {grade === 'mens' ? "Men's" : "Women's"}
              </p>
            )}
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map(p => {
              const meta = TIER_META[p.tier] ?? TIER_META.common
              const isOwned = owned.has(p.id)
              return (
                <button key={p.id} onClick={() => setDetail(p)}
                  className="rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.03]"
                  style={{
                    background: T.surface,
                    border: `1px solid ${isOwned ? meta.accent + '60' : '#ffffff12'}`,
                  }}>
                  {/* Card face — photo slot; silhouette until owned / photos land */}
                  <div className="relative flex items-end justify-center"
                    style={{
                      height: '120px',
                      background: isOwned
                        ? `linear-gradient(180deg, ${meta.accent}30 0%, ${T.surface} 100%)`
                        : `linear-gradient(180deg, #ffffff08 0%, ${T.surface} 100%)`,
                    }}>
                    <svg width="64" height="86" viewBox="0 0 60 80" fill="none"
                      style={{ filter: isOwned ? 'none' : 'grayscale(1) brightness(0.55)' }}>
                      <circle cx="30" cy="22" r="12" fill={isOwned ? meta.accent + '70' : '#ffffff20'} />
                      <path d="M8 80 C8 55 52 55 52 80 Z" fill={isOwned ? meta.accent + '70' : '#ffffff20'} />
                    </svg>
                    {!isOwned && (
                      <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ color: T.textDim, background: '#00000060' }}>
                        Unowned
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px 14px' }}>
                    <span className="text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full" style={{ color: meta.accent, background: meta.accent + '15' }}>
                      {meta.label}
                    </span>
                    <p className="text-sm font-black mt-2 truncate" style={{ fontFamily: 'var(--font-heading)', color: isOwned ? T.text : T.textDim }}>
                      {p.name}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: T.textDim }}>
                      {p.positions.map(posLabel).join(' ')}{p.speedStar ? ' · ★' : ''}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {detail && (() => {
        const p = detail
        const meta = TIER_META[p.tier] ?? TIER_META.common
        const isOwned = owned.has(p.id)
        const st = p.stats
        const rows = [
          st.career_ba != null ? ['BA', Number(st.career_ba).toFixed(3)] : null,
          st.career_hr != null ? ['HR', st.career_hr] : null,
          st.career_rbi != null ? ['RBI', st.career_rbi] : null,
          st.career_sb != null ? ['SB', st.career_sb] : null,
          st.career_ip != null ? ['IP', st.career_ip] : null,
          st.career_era != null ? ['ERA', Number(st.career_era).toFixed(2)] : null,
          st.career_wins != null ? ['W', st.career_wins] : null,
        ].filter(Boolean) as [string, string | number][]
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: '#000000B3' }} onClick={() => setDetail(null)}>
            <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: '420px', background: T.surface, border: `1px solid ${meta.accent}50` }} onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 pinstripe" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full" style={{ color: meta.accent, background: meta.accent + '20' }}>{meta.label}</span>
                  <button onClick={() => setDetail(null)} className="text-xl font-black" style={{ color: T.textDim }}>×</button>
                </div>
                <h3 className="text-xl font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{p.name}</h3>
                <p className="text-xs" style={{ color: T.textDim }}>
                  {clubName} · {p.positions.map(posLabel).join(' · ')}{p.speedStar ? ' · ★ Speed' : ''}
                </p>
              </div>
              <div className="px-6 py-5">
                {p.badges.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {p.badges.map(b => (
                      <span key={b} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ color: '#E8D5A3', background: '#E8D5A315' }}>{b}</span>
                    ))}
                  </div>
                )}
                {rows.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: T.textDim }}>Last 2 Seasons</p>
                    <div className="flex gap-5 text-sm flex-wrap" style={{ color: T.text }}>
                      {rows.map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)}
                    </div>
                  </div>
                )}
                {p.careerGames != null && (
                  <p className="text-[11px] mb-4" style={{ color: T.textDim }}>{p.careerGames} career games</p>
                )}
                <p className="text-[11px] font-bold" style={{ color: isOwned ? T.accent : T.textDim }}>
                  {isOwned ? '✓ In your collection' : 'Not in your collection yet — packs drop weekly.'}
                </p>
              </div>
            </div>
          </div>
        )
      })()}
      <Footer />
    </main>
  )
}