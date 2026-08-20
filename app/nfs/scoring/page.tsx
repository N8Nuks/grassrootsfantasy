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
  { event: 'Walk / HBP', pts: '+3' },
  { event: 'Stolen Base', pts: '+10' },
  { event: 'Caught Stealing', pts: '-2' },
  { event: 'Strikeout', pts: '-1' },
]

const pitching = [
  { event: 'Inning Pitched', pts: '+3' },
  { event: 'Strikeout', pts: '+2' },
  { event: 'Win', pts: '+10' },
  { event: 'Earned Run', pts: '-1' },
]

const slots = [
  { slot: 'P', rule: 'Your two-way ace — scores batting AND pitching.' },
  { slot: 'P(B)', rule: 'Pitching stats only.' },
  { slot: 'C · 1B · 2B · 3B · SS · LF · CF · RF', rule: 'Batting stats.' },
  { slot: 'DP', rule: 'Offence only — a bat in the lineup.' },
  { slot: 'DR', rule: 'Steals and caught stealing only. The speed gamble.' },
  { slot: 'Bench (4)', rule: 'Scores at 0.75×. Steps into your starting card at FULL points if a starter is ruled out prior to the game and the round is locked.' },
  { slot: 'Reserve (5)', rule: 'First cab off the rank. Steps into the bench should a bench player move to a starting spot, or is ruled out prior to the game and the round is locked.' },
  { slot: 'Squad', rule: 'Depth in your squad. Don\'t forget to check for your nuggets having great seasons, and factor in byes and double-header rounds. Two new players added every week!' },
]

const armbands = [
  { slot: 'Captain', rule: 'Scores 2×. Everything doubles — including the negatives, so a bad day hurts twice as much.' },
  { slot: 'Vice Captain', rule: 'Scores 1.5×. Runs alongside the Captain every round, not instead of them, so you have two picks that matter.' },
  { slot: 'On the bench', rule: 'An armband still works, but the bench multiplier applies on top — a Captain on your bench scores 1.5×, a Vice Captain 1.125×.' },
  { slot: 'In the reserves', rule: 'No score, so no bonus. An armband on a reserve is a wasted pick.' },
  ]

const boards = [
  { t: 'Season Ladder', c: '#E8C15A', d: 'Cumulative points across the whole season. The long game.' },
  { t: 'Head-to-Head', c: '#4DA6FF', d: 'A matchup every round with its own win-percentage standings. Anyone can beat anyone on the weekend.' },
  { t: 'Weekly High Score', c: '#FF8C42', d: 'The biggest single-round score in the league. One perfect weekend is all it takes.' },
  { t: 'Club Champion', c: '#3FBF63', d: 'Every point you score counts toward your Club\'s campaign. Back your people.' },
  { t: 'Finals Challenge', c: '#B57BFF', d: 'A separate competition across the finals series — fresh packs every round, its own champion.' },
]

export default function Scoring() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ paddingTop: "70px", paddingBottom: "40px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10 text-center" style={{ maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>
          <a href="/nfs" className="inline-block text-xs font-black uppercase tracking-[0.2em] transition-all hover:opacity-100"
            style={{ color: SILVER, opacity: 0.75, marginBottom: '18px' }}>
            ← Back to the NFSPL
          </a>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>NFS Premier League</p>
          <div className="mx-auto mb-6 h-px w-24" style={{ background: COBALT }} />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Scoring &amp; Competitions
          </h1>
          <p className="text-sm text-white/70 leading-relaxed" style={{ maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
            Every point your card earns comes from a real event in a real game. Here&apos;s exactly what everything is worth.
          </p>
        </div>
      </section>

      {/* Point tables — scoreboard grid */}
      <section className="px-5 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "36px", paddingBottom: "36px" }}>
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2" style={{ maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }}>
          {[{ title: 'Batting', rows: batting, accent: GOLD }, { title: 'Pitching', rows: pitching, accent: COBALT }].map(table => (
            <div key={table.title} className="rounded-2xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${table.accent}45`, boxShadow: `0 0 24px ${table.accent}15` }}>
              <div className="text-center" style={{ background: `linear-gradient(180deg, ${table.accent}25 0%, transparent 100%)`, borderBottom: `1px solid ${table.accent}40`, padding: '18px 20px 14px' }}>
                <span className="text-sm font-black uppercase tracking-[0.35em]" style={{ color: table.accent, textShadow: `0 0 14px ${table.accent}60` }}>{table.title}</span>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1px', background: '#ffffff0a' }}>
                {table.rows.map(r => {
                  const neg = r.pts.startsWith('-')
                  return (
                    <div key={r.event} className="flex flex-col items-center justify-center text-center" style={{ background: '#121215', padding: '18px 10px' }}>
                      <span className="text-2xl font-black leading-none" style={{ fontFamily: 'var(--font-heading)', color: neg ? RED : GREEN, textShadow: `0 0 12px ${neg ? RED : GREEN}40` }}>{r.pts}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 mt-2 leading-tight">{r.event}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Slot rules */}
      <section className="px-5 sm:px-12" style={{ background: '#101013', borderTop: '1px solid #ffffff0a', paddingTop: "36px", paddingBottom: "36px" }}>
        <div style={{ maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "32px" }}>How your card scores.</h2>
          <div className="flex flex-col gap-4">
            {slots.map(s => (
              <div key={s.slot} className="rounded-xl px-6 py-5 text-center" style={{ background: '#121215', border: `2px solid ${COBALT}70` }}>
                <span className="block text-sm font-black uppercase tracking-[0.2em] mb-2 text-white">{s.slot}</span>
                <span className="block text-sm text-white/70 leading-relaxed" style={{ maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>{s.rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Captain and Vice Captain */}
      <section className="px-5 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "36px", paddingBottom: "36px" }}>
        <div style={{ maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "12px" }}>Captain &amp; Vice Captain.</h2>
          <p className="text-sm text-white/70 text-center leading-relaxed" style={{ maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '32px' }}>
            Two armbands, every round. Get them right and they win you the weekend.
          </p>
          <div className="flex flex-col gap-4">
            {armbands.map(a => (
              <div key={a.slot} className="rounded-xl px-6 py-5 text-center" style={{ background: '#121215', border: `2px solid ${GOLD}55` }}>
                <span className="block text-sm font-black uppercase tracking-[0.2em] mb-2" style={{ color: GOLD }}>{a.slot}</span>
                <span className="block text-sm text-white/70 leading-relaxed" style={{ maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>{a.rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Competitions */}
      <section className="px-5 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "36px", paddingBottom: "36px" }}>
        <div style={{ maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "32px" }}>The competitions.</h2>
          <div className="flex flex-col gap-4">
            {boards.map(b => (
              <div key={b.t} className="rounded-xl px-6 py-6 text-center" style={{ background: '#121215', border: `1px solid ${b.c}40`, boxShadow: `0 0 20px ${b.c}12` }}>
                <h3 className="text-base font-black mb-2" style={{ fontFamily: 'var(--font-heading)', color: b.c, textShadow: `0 0 12px ${b.c}50` }}>{b.t}</h3>
                <p className="text-sm text-white/70 leading-relaxed" style={{ maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>{b.d}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ marginTop: '36px' }}>
            <a href="/register" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
              style={{ color: '#0D0D0F', background: GOLD, padding: '18px 44px', boxShadow: `0 0 24px ${GOLD}40` }}>
              Register your team
            </a>
            <a href="/nfs" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
              style={{ color: 'white', border: '1px solid #ffffff35', padding: '18px 44px' }}>
              Back to the NFSPL
            </a>
          </div>
        </div>
      </section>

      {/* Integrity note */}
      <section className="px-6 sm:px-12" style={{ background: '#101013', borderTop: `1px solid ${COBALT}40`, paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="text-center" style={{ maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs leading-relaxed" style={{ color: SILVER, opacity: 0.8 }}>
            Fantasy scoring reflects what happens on the field — it must never influence it. Players play for their teams and their coaches make the calls. Grassroots Fantasy just keeps score. All points come from official game records; never fan voting, never popularity.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}