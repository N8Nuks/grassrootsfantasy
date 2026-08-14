import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import FactsTicker from '@/components/FactsTicker'
import GradeSwitch from '@/components/GradeSwitch'
import HonoursTicker from '@/components/HonoursTicker'
import { HONOURS, AWARD_LABELS, MEN_AWARDS, WOMEN_AWARDS } from '@/lib/nfsHonours'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#4DA6FF'
const GREEN = '#2D9E4E'

function tally(grade: 'men' | 'women', key: string): [string, number][] {
  const counts = new Map<string, number>()
  for (const s of HONOURS) {
    const w = s[grade][key]
    if (!w) continue
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function AwardRoll({ grade, awardKey, accent }: {
  grade: 'men' | 'women'
  awardKey: string
  accent: string
}) {
  const leaders = tally(grade, awardKey)
  if (leaders.length === 0) return null

  const winners = HONOURS
    .map(s => ({ season: s.season, name: s[grade][awardKey] }))
    .filter(w => w.name)
    .reverse()

  const topWins = leaders[0][1]
  // Awards nobody has won twice still deserve a line — show the latest winner
  // rather than leaving the row looking empty.
  const strap = topWins >= 2
    ? `Most: ${leaders.filter(l => l[1] === topWins).map(l => l[0]).join(' & ')} (${topWins})`
    : winners[0] ? `Latest: ${winners[0].name}` : null

  return (
    <details className="group rounded-xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${accent}30` }}>
      {/* Name and strap stack vertically so long multi-winner lines never push the toggle out of the row */}
      <summary className="cursor-pointer list-none flex items-start justify-between gap-3" style={{ padding: '16px 18px' }}>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            {AWARD_LABELS[awardKey]}
          </span>
          {strap && (
            <span className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD, marginTop: '5px' }}>
              {strap}
            </span>
          )}
        </span>
        <span className="text-lg font-black shrink-0 leading-none transition-transform group-open:rotate-45"
          style={{ color: accent, marginTop: '2px' }}>+</span>
      </summary>
      <div style={{ borderTop: '1px solid #ffffff0a' }}>
        {winners.map(w => (
          <div key={w.season} className="flex items-baseline justify-between gap-4"
            style={{ borderBottom: '1px solid #ffffff06', padding: '9px 18px' }}>
            <span className="text-xs font-bold shrink-0" style={{ color: '#ffffff55' }}>{w.season}</span>
            <span className="text-sm font-bold text-white/85 text-right min-w-0">{w.name}</span>
          </div>
        ))}
      </div>
    </details>
  )
}

export default async function Honours({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const isWomen = params.grade === 'womens'
  const grade: 'men' | 'women' = isWomen ? 'women' : 'men'
  const awards = isWomen ? WOMEN_AWARDS : MEN_AWARDS
  const accent = isWomen ? COBALT : GREEN

  const mvp = tally(grade, 'mvp')
  const mvpTop = mvp.length ? mvp.filter(l => l[1] === mvp[0][1]) : []

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-5 sm:px-12 overflow-hidden" style={{ paddingTop: '76px', paddingBottom: '32px' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10 text-center" style={{ maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>
          <a href="/nfs" className="inline-block text-xs font-black uppercase tracking-[0.2em]"
            style={{ color: SILVER, opacity: 0.75, marginBottom: '16px' }}>
            ← Back to the NFSPL
          </a>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>NFS Premier League</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Honours Board
          </h1>
          <p className="text-sm text-white/60 leading-relaxed" style={{ maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '26px' }}>
            Every Premier award winner since 2004-05 — the batters, pitchers and MVPs who have defined
            twenty-two seasons of Northern Fastpitch softball.
          </p>
          <div className="flex justify-center">
            <GradeSwitch grade={isWomen ? 'womens' : 'mens'}
              mensHref="/nfs/honours?grade=mens" womensHref="/nfs/honours?grade=womens" />
          </div>
        </div>
      </section>

      {/* Every winner, every category, for the grade on screen */}
      <HonoursTicker key={grade} grade={grade} accent={accent} />

      {/* Honours roll */}
      <section className="flex-1 px-5 sm:px-12" style={{ paddingTop: '44px', paddingBottom: '48px' }}>
        <div style={{ maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center"
            style={{ fontFamily: 'var(--font-heading)', marginBottom: '28px' }}>
            Premier {isWomen ? 'Women' : 'Men'}
          </h2>
          <div className="flex flex-col gap-3">
            {awards.map(key => (
              <AwardRoll key={key} grade={grade} awardKey={key} accent={accent} />
            ))}
          </div>

          {/* History only — no promo lines on a heritage page */}
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <FactsTicker compact historyOnly />
          </div>

          <p className="text-xs text-white/35 text-center italic">
            Records from the Auckland Softball Association. Seasons without a competition or award are
            omitted from each roll.
          </p>
        </div>
      </section>

      {/* More history */}
      <section className="px-5 sm:px-12 text-center"
        style={{ background: '#14141A', borderTop: `1px solid ${COBALT}40`, paddingTop: '40px', paddingBottom: '48px' }}>
        <p className="text-xs font-black uppercase tracking-[0.3em] mb-5" style={{ color: GOLD }}>More NFS History</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a href="/nfs/officials" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
            style={{ color: '#0D0D0F', background: GOLD, padding: '15px 30px', boxShadow: `0 0 22px ${GOLD}40` }}>
            The Officials Wing
          </a>
          <a href="/nfs" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
            style={{ color: 'white', border: '1px solid #ffffff35', padding: '15px 30px' }}>
            Back to the NFSPL
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}