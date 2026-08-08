'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import PlayerCard from '@/components/PlayerCard'
import PlayerCardFull from '@/components/PlayerCardFull'
import PageGuide, { GuideStep } from '@/components/PageGuide'

const HALL_GUIDE: GuideStep[] = [
  {
    title: 'Every player, every club',
    body: 'This is the full roster — cards you own glow in full colour, the rest wait greyed out. Collect them through weekly packs, bonus codes, and the season drops.',
  },
  {
    title: 'Tap any card',
    body: "Tap a player to see their full card — then tap the card again to flip it over for their round-by-round scoring.",
  },
]

export type HallPlayer = {
  id: string
  name: string
  tier: string
  positions: string[]
  badges: string[]
  speedStar: boolean
  careerGames: number | null
  stats: Record<string, number>
  photoUrl?: string | null
  playingNumber?: number | null
}

const TIER_ORDER = ['rare_2wp_a', 'rare_2wp_b', 'elite', 'common']

export default function HallClient({ clubName, clubSlug, grade, grades, roster, ownedPlayerIds, siteTheme, cardStyle }: {
  clubName: string
  clubSlug: string
  grade: Grade
  grades: Grade[]
  roster: HallPlayer[]
  ownedPlayerIds: string[]
  siteTheme: string
  cardStyle: 'standard' | 'premium'
}) {
  const T = theme(grade, siteTheme)
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
      {/* Club crest atmosphere — oversized, faint */}
      <div className="fixed pointer-events-none gf-crest-bg" style={{
        borderRadius: '9999px',
        overflow: 'hidden',
        opacity: 0.05,
        filter: 'saturate(0.6)',
        maskImage: 'radial-gradient(circle, black 55%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 78%)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/clubs/${clubSlug}.jpg`} alt="" className="w-full h-full object-cover" />
      </div>
      <section className="relative flex-1 px-6" style={{ paddingTop: '90px', paddingBottom: '100px' }}>
        <a href="/hall"
          className="fixed z-40 text-[11px] font-bold uppercase tracking-widest transition-all hover:tracking-[0.2em]"
          style={{ top: '84px', left: '24px', color: T.textDim }}>
          ← Hall
        </a>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <div className="flex items-center justify-center gap-4 mt-2 mb-2">
              <div className="rounded-full overflow-hidden shrink-0"
                style={{ width: '56px', height: '56px', background: '#141210', border: '1.5px solid #ffffff25' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/clubs/${clubSlug}.jpg`} alt={clubName} className="w-full h-full object-cover" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{clubName}</h1>
            </div>
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
                player={{ id: p.id, name: p.name, tier: p.tier, positions: p.positions, speedStar: p.speedStar, club: clubName, stats: p.stats, photoUrl: p.photoUrl, playingNumber: p.playingNumber }}
                grade={grade}
                owned={owned.has(p.id)}
                siteTheme={siteTheme}
                cardStyle={cardStyle}
                onClick={() => setDetail(p)}
              />
            ))}
          </div>
        </div>
      </section>

      <PageGuide pageKey="hall" steps={HALL_GUIDE} accent={T.accent} textColor={T.text} />
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#000000CC' }} onClick={() => setDetail(null)}>
          <div className="w-full" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <PlayerCardFull
              player={{ id: detail.id, name: detail.name, tier: detail.tier, positions: detail.positions, club: clubName, speedStar: detail.speedStar, badges: detail.badges, stats: detail.stats, photoUrl: detail.photoUrl, playingNumber: detail.playingNumber }}
              grade={grade}
              owned={owned.has(detail.id)}
              siteTheme={siteTheme}
              cardStyle={cardStyle}
              flippable={true}
            />
            <button onClick={() => setDetail(null)} className="w-full text-center text-xs font-bold uppercase tracking-widest mt-4" style={{ color: T.textDim }}>Close</button>
          </div>
        </div>
      )}
      <Footer />
    </main>
  )
}