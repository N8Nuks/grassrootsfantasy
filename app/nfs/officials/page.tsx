import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { OFFICIALS, OFFICIAL_MILESTONES } from '@/lib/nfsOfficials'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#4DA6FF'
const PLATINUM = '#E8E4DC'

// An umpire works far more games than a scorer in the same era, so the bars
// differ to land at a similar level of rarity.
const UMP_BAR = 300
const SCORER_BAR = 150

type Card = {
  name: string
  games: number
  role: 'umpire' | 'scorer'
  retired: boolean
  since: string | null
  featured: boolean
  strap: string | null
}

function build() {
  const seasonOf = (name: string, role: string, tier: number) =>
    OFFICIAL_MILESTONES.find(m => m.name === name && m.role === role && m.tier === tier)?.season ?? null

  const cards: Card[] = OFFICIALS
    .filter(o => o.games >= (o.role === 'umpire' ? UMP_BAR : SCORER_BAR))
    .map(o => {
      // Two records stand apart: the only official past 400, and the only scorer past 300
      const isTama = o.role === 'umpire' && o.games >= 400
      const isLyn = o.role === 'scorer' && o.games >= 300
      const tier = isTama ? 400 : isLyn ? 300 : o.role === 'umpire' ? 300 : o.games >= 200 ? 200 : 100
      return {
        name: o.name,
        games: o.games,
        role: o.role,
        retired: o.retired,
        since: seasonOf(o.name, o.role, tier),
        featured: isTama || isLyn,
        strap: isTama ? 'First to 400 games' : isLyn ? 'First scorer to 300' : null,
      }
    })

  const by = (a: Card, b: Card) => b.games - a.games
  return {
    featured: cards.filter(c => c.featured).sort(by),
    umpires: cards.filter(c => !c.featured && c.role === 'umpire').sort(by),
    scorers: cards.filter(c => !c.featured && c.role === 'scorer').sort(by),
    total: cards.reduce((a, c) => a + c.games, 0),
    count: cards.length,
  }
}

const verb = (r: string) => (r === 'umpire' ? 'umpired' : 'scored')

/* Featured — the two records that sit above the wing */
function FeatureCard({ c }: { c: Card }) {
  return (
    <div className="relative rounded-3xl overflow-hidden text-center"
      style={{
        background: `linear-gradient(170deg, ${PLATINUM}16 0%, #121215 45%, #0D0D0F 100%)`,
        border: `2px solid ${PLATINUM}70`,
        boxShadow: `0 0 46px ${PLATINUM}20`,
        padding: '38px 26px 32px',
      }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${PLATINUM}12 0%, transparent 70%)` }} />
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: PLATINUM, marginBottom: '20px' }}>
          {c.strap}
        </p>

        {/* Portrait slot — an in-game shot lands here for the real season */}
        <div className="mx-auto rounded-full overflow-hidden flex items-center justify-center"
          style={{
            width: '128px', height: '128px',
            background: 'linear-gradient(180deg, #16161B 0%, #0D0D0F 100%)',
            border: `2px solid ${PLATINUM}55`,
            boxShadow: `0 0 26px ${PLATINUM}22`,
            marginBottom: '20px',
          }}>
          <svg width="62" height="62" viewBox="0 0 60 80" fill="none">
            <circle cx="30" cy="22" r="13" fill={`${PLATINUM}55`} />
            <path d="M6 80 C6 52 54 52 54 80 Z" fill={`${PLATINUM}55`} />
          </svg>
        </div>

        <p className="text-7xl sm:text-8xl font-black leading-none gf-diamond-text"
          style={{ fontFamily: 'var(--font-heading)' }}>
          {c.games}
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: `${PLATINUM}90`, marginTop: '8px' }}>
          Games {verb(c.role)}
        </p>
        <p className="text-3xl sm:text-4xl font-black" style={{ fontFamily: 'var(--font-heading)', color: 'white', marginTop: '20px' }}>
          {c.name}
        </p>
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.55)', marginTop: '8px' }}>
          {c.role === 'umpire' ? 'Umpire' : 'Scorer'}{c.since ? ` · reached ${c.since}` : ''}{c.retired ? ' · retired' : ''}
        </p>
      </div>
    </div>
  )
}

/* Wing — everyone else past the bar */
function WingCard({ c }: { c: Card }) {
  const accent = c.role === 'umpire' ? SILVER : GOLD
  return (
    <div className="rounded-2xl overflow-hidden text-center"
      style={{ background: '#121215', border: `1px solid ${accent}45`, boxShadow: `0 0 20px ${accent}10`, padding: '26px 18px 22px' }}>
      <div className="mx-auto rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: '84px', height: '84px',
          background: 'linear-gradient(180deg, #16161B 0%, #0D0D0F 100%)',
          border: `1px solid ${accent}50`, marginBottom: '16px',
        }}>
        <svg width="42" height="42" viewBox="0 0 60 80" fill="none">
          <circle cx="30" cy="22" r="13" fill={`${accent}55`} />
          <path d="M6 80 C6 52 54 52 54 80 Z" fill={`${accent}55`} />
        </svg>
      </div>
      <p className="text-5xl font-black leading-none"
        style={{ fontFamily: 'var(--font-heading)', color: accent, textShadow: `0 0 20px ${accent}45` }}>
        {c.games}
      </p>
      <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: `${accent}A0`, marginTop: '6px' }}>
        Games {verb(c.role)}
      </p>
      <p className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: 'white', marginTop: '14px' }}>
        {c.name}
      </p>
      <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
        {c.since ? `Reached ${c.since}` : c.role === 'umpire' ? 'Umpire' : 'Scorer'}{c.retired ? ' · retired' : ''}
      </p>
    </div>
  )
}

export default function Officials() {
  const { featured, umpires, scorers, total, count } = build()

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-5 sm:px-12 overflow-hidden" style={{ paddingTop: '70px', paddingBottom: '44px' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10 text-center" style={{ maxWidth: '740px', marginLeft: 'auto', marginRight: 'auto' }}>
          <a href="/nfs" className="inline-block text-xs font-black uppercase tracking-[0.2em]"
            style={{ color: SILVER, opacity: 0.75, marginBottom: '18px' }}>
            ← Back to the NFSPL
          </a>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>The Officials Wing</p>
          <div className="mx-auto mb-6 h-px w-24" style={{ background: COBALT }} />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            No game happens without them.
          </h1>
          <p className="text-sm text-white/70 leading-relaxed" style={{ maxWidth: '540px', marginLeft: 'auto', marginRight: 'auto' }}>
            Umpires and scorers work every game the Premier grade plays. These {count} have
            worked {total.toLocaleString()} of them between&nbsp;2005 and&nbsp;2026 — in some cases more games
            than any player has ever taken the field for.
          </p>
        </div>
      </section>

      {/* The two records */}
      <section className="px-5 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: '44px', paddingBottom: '44px' }}>
        <div className="text-center" style={{ marginBottom: '30px' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.35em]" style={{ color: PLATINUM }}>The Records</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2" style={{ maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto' }}>
          {featured.map(c => <FeatureCard key={`${c.role}-${c.name}`} c={c} />)}
        </div>
      </section>

      {/* Umpires */}
      <section className="px-5 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: '48px', paddingBottom: '44px' }}>
        <div style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '30px' }}>
            <h2 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>Umpires</h2>
            <p className="text-xs text-white/55" style={{ marginTop: '8px' }}>300 or more Premier games</p>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {umpires.map(c => <WingCard key={c.name} c={c} />)}
          </div>
        </div>
      </section>

      {/* Scorers */}
      <section className="px-5 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: '48px', paddingBottom: '44px' }}>
        <div style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '30px' }}>
            <h2 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>Scorers</h2>
            <p className="text-xs text-white/55" style={{ marginTop: '8px' }}>150 or more Premier games</p>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {scorers.map(c => <WingCard key={c.name} c={c} />)}
          </div>
        </div>
      </section>

      {/* Why the bars differ */}
      <section className="px-5 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: '36px', paddingBottom: '36px' }}>
        <div className="text-center" style={{ maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p className="text-xs leading-relaxed text-white/65">
            The thresholds differ because the roles do. Far more umpires than scorers work a Premier
            season, so 300 games behind the plate and 150 in the book represent a similar commitment
            over a similar span. Figures cover NFC, AFC and NFS from 2005 to 2026, and are supplied by
            the Auckland Softball Association.
          </p>
        </div>
      </section>

      {/* CTA back */}
      <section className="px-5 sm:px-12 text-center" style={{ background: '#0D0D0F', borderTop: `1px solid ${COBALT}40`, paddingTop: '44px', paddingBottom: '52px' }}>
        <p className="text-xs font-black uppercase tracking-[0.3em] mb-5" style={{ color: GOLD }}>More NFS History</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/nfs/honours" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
            style={{ color: '#0D0D0F', background: GOLD, padding: '16px 34px', boxShadow: `0 0 22px ${GOLD}40` }}>
            Honours Board
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