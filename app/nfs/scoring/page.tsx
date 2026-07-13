import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#C0C0C0'
const GREEN = '#3FBF63'
const RED = '#FF6B6B'

const batting = [
  { event: 'Single', pts: '+5' },
  { event: 'Double', pts: '+8' },
  { event: 'Triple', pts: '+10' },
  { event: 'Home Run', pts: '+15' },
  { event: 'RBI', pts: '+3' },
  { event: 'Run scored', pts: '+3' },
  { event: 'Walk / Hit by pitch', pts: '+2' },
  { event: 'Stolen Base', pts: '+10' },
  { event: 'Caught Stealing', pts: '-2' },
  { event: 'Strikeout (batting)', pts: '-1' },
]

const pitching = [
  { event: 'Inning Pitched', pts: '+3' },
  { event: 'Strikeout (pitching)', pts: '+2' },
  { event: 'Win', pts: '+10' },
  { event: 'Earned Run', pts: '-2' },
]

const slots = [
  { slot: 'P', rule: 'Your two-way ace — scores batting AND pitching.' },
  { slot: 'P(B)', rule: 'Pitching stats only.' },
  { slot: 'C · 1B · 2B · 3B · SS · LF · CF · RF', rule: 'Batting stats.' },
  { slot: 'DP', rule: 'Offence only — a bat in the lineup.' },
  { slot: 'DR', rule: 'Steals and caught stealing only. The speed gamble.' },
  { slot: 'Bench (4)', rule: 'Scores at 0.75×. Steps into your starting card at FULL points if a starter doesn\'t take the field.' },
  { slot: 'Reserve (5)', rule: 'No score — your depth, one tap from the action.' },
]

const boards = [
  { t: 'Season Ladder', d: 'Cumulative points across the whole season. The long game.' },
  { t: 'Head-to-Head', d: 'A matchup every round with its own win-percentage standings. Anyone can beat anyone on the weekend.' },
  { t: 'Weekly High Score', d: 'The biggest single-round score in the league. One perfect weekend is all it takes.' },
  { t: 'Club Champion', d: 'Every point you score counts toward your club\'s campaign. Back your people.' },
  { t: 'Finals Challenge', d: 'A separate competition across the finals series — fresh packs every round, its own champion.' },
]

export default function Scoring() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ paddingTop: "70px", paddingBottom: "70px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10 text-center" style={{ maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>NFS Premier Softball League</p>
          <div className="mx-auto mb-6 h-px w-24" style={{ background: COBALT }} />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Scoring &amp; Leaderboards
          </h1>
          <p className="text-sm text-white/50 leading-relaxed" style={{ maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
            Every point your card earns comes from a real event in a real game. Here&apos;s exactly what everything is worth.
          </p>
        </div>
      </section>

      {/* Point tables */}
      <section className="px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "22px", paddingBottom: "22px" }}>
        <div className="grid gap-8 sm:grid-cols-2" style={{ maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }}>
          {[{ title: 'Batting', rows: batting }, { title: 'Pitching', rows: pitching }].map(table => (
            <div key={table.title} className="rounded-2xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${COBALT}30` }}>
              <div className="px-6 py-4" style={{ background: '#10214D', borderBottom: '1px solid #ffffff0a' }}>
                <span className="text-xs font-black uppercase tracking-[0.25em] text-white">{table.title}</span>
              </div>
              {table.rows.map(r => (
                <div key={r.event} className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid #ffffff06' }}>
                  <span className="text-sm text-white/70">{r.event}</span>
                  <span className="text-sm font-black" style={{ color: r.pts.startsWith('-') ? RED : GREEN }}>{r.pts}</span>
                </div>
              ))}
              {table.title === 'Batting' && (
                <p className="px-6 pt-3 pb-5 text-[11px] leading-relaxed text-white/35">A batting week never scores below zero — strikeouts and caught stealing can cost points, not bury you.</p>
              )}
              {table.title === 'Pitching' && (
                <p className="px-6 pt-3 pb-5 text-[11px] leading-relaxed text-white/35">A pitching week never scores below zero — earned runs can cost points, not bury you.</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-center italic" style={{ color: SILVER, opacity: 0.6, maxWidth: "560px", margin: "48px auto 0" }}>
          Point values are provisional through the opening rounds of Season One and may be tuned before being locked for the season.
        </p>
      </section>

      {/* Slot rules */}
      <section className="px-6 sm:px-12" style={{ background: '#101013', borderTop: '1px solid #ffffff0a', paddingTop: "22px", paddingBottom: "22px" }}>
        <div style={{ maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "48px" }}>How your card scores.</h2>
          <div className="flex flex-col gap-3">
            {slots.map(s => (
              <div key={s.slot} className="rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6" style={{ background: '#121215', borderLeft: `3px solid ${COBALT}` }}>
                <span className="text-xs font-black uppercase tracking-wider text-white sm:w-56 shrink-0">{s.slot}</span>
                <span className="text-sm text-white/50">{s.rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboards */}
      <section className="px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "22px", paddingBottom: "22px" }}>
        <div style={{ maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "48px" }}>Five ways to win.</h2>
          <div className="flex flex-col gap-3">
            {boards.map(b => (
              <div key={b.t} className="rounded-xl px-6 py-5" style={{ background: '#121215', border: '1px solid #ffffff0a' }}>
                <h3 className="text-base font-black text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{b.t}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrity note */}
      <section className="px-6 sm:px-12" style={{ background: '#101013', borderTop: `1px solid ${COBALT}40`, paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="text-center" style={{ maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs leading-relaxed" style={{ color: SILVER, opacity: 0.6 }}>
            Fantasy scoring reflects what happens on the field — it must never influence it. Players play for their teams and their coaches make the calls. Grassroots Fantasy just keeps score. All points come from official game records; never fan voting, never popularity.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}