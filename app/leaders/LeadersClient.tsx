'use client'
import { useState } from 'react'
import { theme, type Grade } from '@/lib/clubhouse'
import PlayerCardFull, { type FullCardPlayer } from '@/components/PlayerCardFull'
import { type CardMilestone, silhouetteFor } from '@/components/PlayerCard'
import { splitName } from '@/lib/names'

export type LeaderCat = {
  key: string; label: string; format?: 'ba'; kind?: 'pitching'; empty: [string, string]
  // Qualifier: only players with at least `value` of stat `key` (e.g. min. at-bats)
  min?: { key: string; value: number }
  note?: string
}
export type LeaderPlayer = FullCardPlayer & { photoUrl: string | null }

// Pitching boards wear steel rather than the grade colour — the defensive pair
const STEEL = '#B4BEC9'

export default function LeadersClient({ cats, players, grade, siteTheme, seasonStarted, ownedPlayerIds, cardStyle, milestones = {} }: {
  cats: LeaderCat[]
  players: LeaderPlayer[]
  grade: Grade
  siteTheme: string
  seasonStarted: boolean
  ownedPlayerIds: string[]
  cardStyle: 'standard' | 'premium'
  milestones?: Record<string, CardMilestone[]>
}) {
  const T = theme(grade, siteTheme)
  const owned = new Set(ownedPlayerIds)
  const [detail, setDetail] = useState<LeaderPlayer | null>(null)

  // The Fantasy Points board can open out to everyone who has scored
  const [everyone, setEveryone] = useState(false)
  const isPoints = (cat: LeaderCat) => cat.key === 'season_points' || cat.key === 'r_points'

  // Everyone on a board, best first. Nobody on zero.
  const rankedFor = (cat: LeaderCat) =>
    players.filter(p => (p.stats[cat.key] ?? 0) > 0 && (!cat.min || (p.stats[cat.min.key] ?? 0) >= cat.min.value))
      .sort((a, b) => (b.stats[cat.key] ?? 0) - (a.stats[cat.key] ?? 0))

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map(cat => {
          const ranked = rankedFor(cat)
          const open = everyone && isPoints(cat)
          const rows = open ? ranked : ranked.slice(0, 5)
          const pitching = cat.kind === 'pitching'
          const accent = pitching ? STEEL : T.accent
          return (
            <div key={cat.key} className="rounded-2xl overflow-hidden pinstripe" style={{ background: T.surface, border: `1px solid ${pitching ? STEEL + '30' : '#ffffff12'}` }}>
              <div className="flex items-center justify-between gap-3" style={{ background: T.headerBg, borderBottom: `1px solid ${accent}30`, padding: '14px 22px' }}>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: accent }}>{cat.label}</p>
                  {cat.note && <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: T.textDim, marginTop: '3px' }}>{cat.note}</p>}
                </div>
                {pitching && (
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] shrink-0 rounded-full"
                    style={{ color: STEEL, border: `1px solid ${STEEL}60`, padding: '3px 9px' }}>
                    Pitching
                  </span>
                )}
              </div>
              <div style={open ? { maxHeight: '560px', overflowY: 'auto' } : undefined}>
              {rows.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDetail(p)}
                  className="w-full flex items-center gap-3 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                  style={{ borderBottom: '1px solid #ffffff08', padding: '10px 22px' }}
                  aria-label={`Open ${p.name}'s player card`}
                >
                  <span className="w-6 text-sm font-black shrink-0" style={{ color: i === 0 ? '#FFD700' : T.textDim }}>{i + 1}</span>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-end justify-center shrink-0" style={{ background: `${accent}18` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.photoUrl ?? silhouetteFor(p.revealPos, grade)} alt={p.name} className="h-full w-auto object-contain" style={p.photoUrl ? undefined : { opacity: 0.6 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: T.text }}>
                      {splitName(p.name).first} <span className="uppercase">{splitName(p.name).last}</span>
                    </p>
                    <p className="text-[10px] truncate" style={{ color: T.textDim }}>{p.club}</p>
                  </div>
                  <span className="text-base font-black shrink-0" style={{ fontFamily: 'var(--font-heading)', color: i === 0 ? '#FFD700' : T.text }}>
                    {cat.format === 'ba' ? Number(p.stats[cat.key]).toFixed(3) : p.stats[cat.key]}
                  </span>
                </button>
              ))}
              </div>
              {isPoints(cat) && ranked.length > 5 && (
                <button type="button" onClick={() => setEveryone(!everyone)} aria-expanded={open}
                  className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:bg-white/5"
                  style={{ color: accent, padding: '0 22px', minHeight: '44px', borderTop: `1px solid ${accent}30` }}>
                  {open ? 'Show top 5' : `See everyone · ${ranked.length} players`}
                </button>
              )}
              {rows.length === 0 && (
                seasonStarted ? (
                  <div className="text-center" style={{ padding: '26px 22px' }}>
                    <p className="text-sm font-bold" style={{ color: T.text, marginBottom: '6px' }}>{cat.empty[0]}</p>
                    <p className="text-xs" style={{ color: T.textDim }}>{cat.empty[1]}</p>
                  </div>
                ) : (
                  <p className="text-sm text-center" style={{ color: T.textDim, padding: '28px' }}>Season not started</p>
                )
              )}
            </div>
          )
        })}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#000000CC' }} onClick={() => setDetail(null)}>
          <div className="w-full" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <PlayerCardFull
              player={detail}
              grade={grade}
              owned={owned.has(detail.id)}
              siteTheme={siteTheme}
              cardStyle={cardStyle}
              flippable={true}
              milestones={milestones[detail.id]}
            />
            <button onClick={() => setDetail(null)} className="w-full text-center text-xs font-bold uppercase tracking-widest mt-4" style={{ color: T.textDim }}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}