'use client'
import { useState } from 'react'
import { theme, type Grade } from '@/lib/clubhouse'
import PlayerCardFull, { type FullCardPlayer } from '@/components/PlayerCardFull'
import { type CardMilestone } from '@/components/PlayerCard'
import { splitName } from '@/lib/names'

export type LeaderCat = { key: string; label: string; format?: 'ba'; empty: [string, string] }
export type LeaderPlayer = FullCardPlayer & { photoUrl: string | null }

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

  const leadersFor = (key: string) =>
    players.filter(p => (p.stats[key] ?? 0) > 0)
      .sort((a, b) => (b.stats[key] ?? 0) - (a.stats[key] ?? 0))
      .slice(0, 5)

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map(cat => {
          const rows = leadersFor(cat.key)
          return (
            <div key={cat.key} className="rounded-2xl overflow-hidden pinstripe" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
              <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.accent}30`, padding: '14px 22px' }}>
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: T.accent }}>{cat.label}</p>
              </div>
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
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-end justify-center shrink-0" style={{ background: `${T.accent}18` }}>
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.name} className="h-full w-auto object-contain" />
                    ) : (
                      <span className="text-xs font-black" style={{ color: T.textDim }}>{p.name[0]}</span>
                    )}
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