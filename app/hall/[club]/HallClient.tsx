'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import PlayerCard from '@/components/PlayerCard'
import PlayerCardFull from '@/components/PlayerCardFull'

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
      <section className="flex-1 px-6" style={{ paddingTop: '90px', paddingBottom: '100px' }}>
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
            {sorted.map(p => (
              <PlayerCard key={p.id}
                player={{ id: p.id, name: p.name, tier: p.tier, positions: p.positions, speedStar: p.speedStar, stats: p.stats }}
                grade={grade}
                owned={owned.has(p.id)}
                onClick={() => setDetail(p)}
              />
            ))}
          </div>
        </div>
      </section>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#000000CC' }} onClick={() => setDetail(null)}>
          <div className="w-full" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <PlayerCardFull
              player={{ id: detail.id, name: detail.name, tier: detail.tier, positions: detail.positions, club: clubName, speedStar: detail.speedStar, badges: detail.badges, stats: detail.stats }}
              grade={grade}
              owned={owned.has(detail.id)}
            />
            <button onClick={() => setDetail(null)} className="w-full text-center text-xs font-bold uppercase tracking-widest mt-4" style={{ color: T.textDim }}>Close</button>
          </div>
        </div>
      )}
      <Footer />
    </main>
  )
}