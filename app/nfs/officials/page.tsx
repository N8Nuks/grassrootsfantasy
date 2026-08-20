import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { OFFICIALS, OFFICIAL_MILESTONES } from '@/lib/nfsOfficials'
import OfficialCard from '@/components/OfficialCard'
import { createClient } from '@/lib/supabase/server'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#7FC4FF'
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
  level?: number
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
        strap: isTama ? 'First umpire to 400 games' : isLyn ? 'First scorer to 300 games' : null,
        // Officiating level, where it's on record — the gem shows # otherwise
        level: o.level,
      }
    })

  // Everyone below the card threshold still worked the games — they get a roll
  // rather than a card, so nobody who has done the job goes unlisted.
  const below = OFFICIALS
    .filter(o => o.games < (o.role === 'umpire' ? UMP_BAR : SCORER_BAR))
    .sort((a, b) => b.games - a.games)

  const by = (a: Card, b: Card) => b.games - a.games
  return {
    featured: cards.filter(c => c.featured).sort(by),
    umpires: cards.filter(c => !c.featured && c.role === 'umpire').sort(by),
    scorers: cards.filter(c => !c.featured && c.role === 'scorer').sort(by),
    moreUmpires: below.filter(o => o.role === 'umpire'),
    moreScorers: below.filter(o => o.role === 'scorer'),
    total: cards.reduce((a, c) => a + c.games, 0),
    count: cards.length,
  }
}

/* A plain roll of names and games, folded away behind a summary. Kept simple
   on purpose — the cards carry the ceremony, this carries the completeness. */
function MoreRoll({ label, accent, rows }: {
  label: string
  accent: string
  rows: { name: string; games: number; retired: boolean }[]
}) {
  if (rows.length === 0) return null
  return (
    <details className="group rounded-xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${accent}30`, marginTop: '24px' }}>
      <summary className="cursor-pointer list-none flex items-center justify-between gap-4" style={{ padding: '16px 20px' }}>
        <span className="text-sm font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          {label} <span className="text-white/45">· {rows.length}</span>
        </span>
        <span className="text-lg font-black shrink-0 leading-none transition-transform group-open:rotate-45" style={{ color: accent }}>+</span>
      </summary>
      <div style={{ borderTop: '1px solid #ffffff0a' }}>
        {rows.map(o => (
          <div key={o.name} className="flex items-baseline justify-between gap-4"
            style={{ borderBottom: '1px solid #ffffff06', padding: '10px 20px' }}>
            <span className="text-sm font-bold text-white/85">
              {o.name}
              {o.retired && <span className="text-[9px] uppercase tracking-widest ml-2" style={{ color: '#ffffff40' }}>Retired</span>}
            </span>
            <span className="text-sm font-black shrink-0" style={{ fontFamily: 'var(--font-heading)', color: accent }}>{o.games}</span>
          </div>
        ))}
      </div>
    </details>
  )
}

/* Featured — the same card as the wing, turned up: crackling rim, shimmering
   name, diamond career figure, bigger Level gem */
function FeatureCard({ c, cardStyle }: { c: Card; cardStyle: 'standard' | 'premium' }) {
  return <OfficialCard cardStyle={cardStyle} o={{
    name: c.name, games: c.games, role: c.role, retired: c.retired,
    since: c.since, strap: c.strap, featured: true, level: c.level,
  }} />
}

/* Wing — everyone else past the bar */
function WingCard({ c, cardStyle }: { c: Card; cardStyle: 'standard' | 'premium' }) {
  return <OfficialCard cardStyle={cardStyle} o={{
    name: c.name, games: c.games, role: c.role, retired: c.retired,
    since: c.since, level: c.level,
  }} />
}

export default async function Officials() {
  const { featured, umpires, scorers, moreUmpires, moreScorers, total, count } = build()

  // Officials cards follow the same Command setting as the player cards
  const supabase = await createClient()
  const { data: styleRow } = await supabase.from('site_settings')
    .select('value').eq('key', 'card_style').maybeSingle()
  const cardStyle = (styleRow?.value === 'premium' ? 'premium' : 'standard') as 'standard' | 'premium'

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ paddingTop: '70px', paddingBottom: '40px' }}>
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
            worked {total.toLocaleString()}{' '}of them between&nbsp;2005 and&nbsp;2026 — in some cases more games
            than any player has ever taken the field for.
          </p>
        </div>
      </section>

      {/* The two records */}
      <section className="px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: '36px', paddingBottom: '40px' }}>
        <div className="text-center" style={{ marginBottom: '26px' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.35em]" style={{ color: PLATINUM }}>The Records</p>
        </div>
        <div className="grid gap-5 sm:gap-6 grid-cols-2" style={{ maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>
          {featured.map(c => <FeatureCard key={`${c.role}-${c.name}`} c={c} cardStyle={cardStyle} />)}
        </div>
      </section>

      {/* Umpires */}
      <section className="px-6 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: '44px', paddingBottom: '40px' }}>
        <div style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '26px' }}>
            <h2 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>Umpires</h2>
            <p className="text-xs text-white/55" style={{ marginTop: '8px' }}>300 or more Premier games</p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {umpires.map(c => <WingCard key={c.name} c={c} cardStyle={cardStyle} />)}
          </div>
          <MoreRoll label="Every other umpire on record" accent={SILVER} rows={moreUmpires} />
        </div>
      </section>

      {/* Scorers */}
      <section className="px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: '44px', paddingBottom: '40px' }}>
        <div style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '26px' }}>
            <h2 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>Scorers</h2>
            <p className="text-xs text-white/55" style={{ marginTop: '8px' }}>150 or more Premier games</p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {scorers.map(c => <WingCard key={c.name} c={c} cardStyle={cardStyle} />)}
          </div>
          <MoreRoll label="Every other scorer on record" accent={GOLD} rows={moreScorers} />
        </div>
      </section>

      {/* Why the bars differ */}
      <section className="px-6 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: '36px', paddingBottom: '36px' }}>
        <div className="text-center" style={{ maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p className="text-xs leading-relaxed text-white/65">
            The thresholds differ because the roles do. Every game needs two to four umpires but only
            one official scorer, so there are far more umpiring appointments to go around in a season.
            300 games on the field and 150 in the book represent a similar commitment over a similar
            span. Figures cover NFC, AFC and NFS from 2005 to 2026, and are supplied by the Auckland
            Softball Association.
          </p>
        </div>
      </section>

      {/* CTA back */}
      <section className="px-6 sm:px-12 text-center" style={{ background: '#0D0D0F', borderTop: `1px solid ${COBALT}40`, paddingTop: '44px', paddingBottom: '52px' }}>
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