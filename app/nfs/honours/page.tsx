import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import FactsTicker from '@/components/FactsTicker'
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

function GradeHonours({ grade, awards, accent }: {
  grade: 'men' | 'women'
  awards: readonly string[]
  accent: string
}) {
  const label = grade === 'men' ? "Premier Men" : "Premier Women"
  return (
    <div style={{ marginBottom: '80px' }}>
      <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: '40px' }}>
        {label}
      </h2>
      <div className="flex flex-col gap-4">
        {awards.map(key => {
          const leaders = tally(grade, key)
          if (leaders.length === 0) return null
          const topWins = leaders[0][1]
          const winners = HONOURS
            .map(s => ({ season: s.season, name: s[grade][key] }))
            .filter(w => w.name)
            .reverse()
          return (
            <details key={key} className="group rounded-xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${accent}30` }}>
              <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                <span className="text-sm font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{AWARD_LABELS[key]}</span>
                <span className="flex items-center gap-3">
                  {topWins >= 2 && (
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                      Most: {leaders.filter(l => l[1] === topWins).map(l => l[0]).join(' & ')} ({topWins})
                    </span>
                  )}
                  <span className="text-lg font-black shrink-0 transition-transform group-open:rotate-45" style={{ color: accent }}>+</span>
                </span>
              </summary>
              <div style={{ borderTop: '1px solid #ffffff0a' }}>
                {winners.map(w => (
                  <div key={w.season} className="flex items-center justify-between px-6 py-2.5" style={{ borderBottom: '1px solid #ffffff06' }}>
                    <span className="text-xs font-bold" style={{ color: '#ffffff60' }}>{w.season}</span>
                    <span className="text-sm font-bold text-white/85">{w.name}</span>
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}

export default function Honours() {
  // Overall leaders for the header strip
  const menMvp = tally('men', 'mvp')
  const womenMvp = tally('women', 'mvp')
  const menTop = menMvp.filter(l => l[1] === menMvp[0][1])
  const womenTop = womenMvp.filter(l => l[1] === womenMvp[0][1])

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ paddingTop: '90px', paddingBottom: '70px' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10 text-center" style={{ maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>
          <a href="/nfs" className="inline-block text-xs font-black uppercase tracking-[0.2em]"
            style={{ color: SILVER, opacity: 0.75, marginBottom: '18px' }}>
            ← Back to the NFSPL
          </a>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-5" style={{ color: GOLD }}>NFS Premier League</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Honours Board
          </h1>
          <p className="text-sm text-white/60 leading-relaxed" style={{ maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            Every Premier award winner since 2004-05 — the batters, pitchers, and MVPs who have defined twenty-two seasons of Northern Fastpitch softball.
          </p>
        </div>
      </section>

      {/* MVP leaders strip */}
      <section className="px-6 sm:px-12 pinstripe" style={{ background: '#10192E', borderTop: `1px solid ${COBALT}40`, borderBottom: `1px solid ${COBALT}40`, padding: '32px 24px' }}>
        <div className="grid gap-6 sm:grid-cols-2 text-center" style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: GREEN }}>Most Premier Men&apos;s MVPs</p>
            <p className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              {menTop.map(l => l[0]).join(' & ')} <span style={{ color: GOLD }}>· {menMvp[0][1]}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: COBALT }}>Most Premier Women&apos;s MVPs</p>
            <p className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              {womenTop.map(l => l[0]).join(' & ')} <span style={{ color: GOLD }}>· {womenMvp[0][1]}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Honours rolls */}
      <section className="flex-1 px-6 sm:px-12" style={{ paddingTop: '80px', paddingBottom: '70px' }}>
        <div style={{ maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
          <GradeHonours grade="men" awards={MEN_AWARDS} accent={GREEN} />
          <GradeHonours grade="women" awards={WOMEN_AWARDS} accent={COBALT} />

          {/* History only — no promo lines on a heritage page */}
          <div style={{ marginBottom: '28px' }}>
            <FactsTicker compact historyOnly />
          </div>

          <p className="text-xs text-white/35 text-center italic">
            Records from the Auckland Softball Association. Seasons without a competition or award are omitted from each roll.
          </p>
        </div>
      </section>

      {/* More history */}
      <section className="px-6 sm:px-12 text-center" style={{ background: '#14141A', borderTop: `1px solid ${COBALT}40`, paddingTop: '44px', paddingBottom: '52px' }}>
        <p className="text-xs font-black uppercase tracking-[0.3em] mb-5" style={{ color: GOLD }}>More NFS History</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/nfs/officials" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
            style={{ color: '#0D0D0F', background: GOLD, padding: '16px 34px', boxShadow: `0 0 22px ${GOLD}40` }}>
            The Officials Wing
          </a>
          <a href="/nfs" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
            style={{ color: 'white', border: '1px solid #ffffff35', padding: '16px 34px' }}>
            Back to the NFSPL
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}