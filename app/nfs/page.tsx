import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#C0C0C0'

export default function NFS() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ paddingTop: "140px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10 text-center" style={{ maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>League One · Now Live</p>
          <div className="mx-auto mb-6 h-px w-24" style={{ background: COBALT }} />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            NFS Premier<br/>Softball League
          </h1>
          <p className="text-sm text-white/50 leading-relaxed" style={{ maxWidth: "480px", marginLeft: "auto", marginRight: "auto", marginBottom: "36px" }}>
            The Northern Fastpitch Series — Auckland's premier softball competition, running since 2005 on nearly ninety years of Auckland softball history. Now with a fantasy league of its own, endorsed by the Auckland Softball Association.
          </p>

          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: COBALT }} />
              <span className="text-xs text-white/50 uppercase tracking-wider font-bold">Men's — Launching this season</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SILVER }} />
              <span className="text-xs text-white/50 uppercase tracking-wider font-bold">Women's — Decision pending</span>
            </div>
          </div>
        </div>
      </section>

      {/* The competition */}
      <section className="px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "90px", paddingBottom: "90px" }}>
        <div className="grid gap-6 sm:grid-cols-3" style={{ maxWidth: "900px", marginLeft: "auto", marginRight: "auto" }}>
          {[
            { big: '2005', label: 'NFS founded', d: 'Twenty seasons of premier fastpitch softball.' },
            { big: '1939', label: 'Auckland softball begins', d: 'Nearly ninety years of history behind every game.' },
            { big: '300+', label: 'Career games club', d: 'Only eight players have ever reached it. Their cards carry the badge.' },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl p-8 flex flex-col gap-2 items-center text-center" style={{ background: '#121215', border: `1px solid ${COBALT}30` }}>
              <span className="text-4xl font-black" style={{ color: COBALT, fontFamily: 'var(--font-heading)' }}>{s.big}</span>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: SILVER }}>{s.label}</span>
              <p className="text-xs text-white/35 leading-relaxed mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="px-6 sm:px-12" style={{ background: '#101013', borderTop: '1px solid #ffffff0a', paddingTop: "90px", paddingBottom: "90px" }}>
        <div style={{ maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "56px" }}>Your season, inside the season.</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { t: 'Starter Pack on signup', d: '12 cards land the moment you register — including the only two-way player cards dealt all season. Your lineup auto-assigns so you can score from day one.' },
              { t: 'Weekly rhythm', d: 'Results confirm Tuesday, lineups lock Friday 4pm, games play out on the weekend. A living league that moves with the real one.' },
              { t: 'Six ways to win', d: 'Season ladder, weekly head-to-head, Weekly High Score, Club Champion, and the Finals Challenge with its own packs and title.' },
              { t: 'Back your club', d: 'Register with your club\'s code and every point you score counts toward their Club Champion campaign.' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl p-7 flex flex-col gap-3 text-left" style={{ background: '#121215', borderLeft: `3px solid ${COBALT}`, border: '1px solid #ffffff0a', borderLeftWidth: '3px', borderLeftColor: COBALT }}>
                <h3 className="text-base font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NFS card tiers */}
      <section className="px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "90px", paddingBottom: "90px" }}>
        <div className="flex flex-col items-center" style={{ maxWidth: "1000px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-5" style={{ fontFamily: 'var(--font-heading)' }}>The NFS card tiers.</h2>
          <p className="text-sm text-white/45 text-center leading-relaxed" style={{ maxWidth: "540px", marginBottom: "64px" }}>
            Softball is the only sport where one player can dominate both sides of the game — so the NFS League carries two Rare tiers found nowhere else: the two-way players.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 w-full">
            {[
              { tier: 'RARE 2WP A', accent: '#FFD700', desc: 'The complete two-way players — they pitch AND hit at the top level. The rarest cards in the game, dealt only in Starter Packs.' },
              { tier: 'RARE 2WP B', accent: GOLD, desc: 'Two-way pitchers whose value lives on the mound. Rare, specialist, and game-changing in the right matchup.' },
              { tier: 'ELITE', accent: SILVER, desc: 'The proven performers — season after season at the top of the stats. Silver treatment, serious points.' },
              { tier: 'COMMON', accent: COBALT, desc: 'The backbone of every club and every fantasy squad. Smart managers know: championships are won with great Commons.' },
            ].map((c) => (
              <div key={c.tier} className="rounded-3xl p-7 flex flex-col gap-4 items-center text-center" style={{ background: '#121215', border: `1px solid ${c.accent}35`, paddingTop: "36px" }}>
                <span className="text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full" style={{ color: c.accent, background: c.accent + '15', lineHeight: "1.6" }}>{c.tier}</span>
                <div className="w-24 h-36 rounded-xl flex items-end justify-center" style={{ background: `linear-gradient(180deg, ${c.accent}20, #0D0D0F)`, border: `1px solid ${c.accent}20` }}>
                  <svg width="56" height="76" viewBox="0 0 60 80" fill="none">
                    <circle cx="30" cy="22" r="12" fill="#ffffff14"/>
                    <path d="M8 80 C8 55 52 55 52 80 Z" fill="#ffffff14"/>
                  </svg>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-12 italic">Real player card examples revealed at launch.</p>
        </div>
      </section>

      {/* Wellbeing / trust strip */}
      <section className="px-6 sm:px-12" style={{ background: '#101013', borderTop: '1px solid #ffffff0a', paddingTop: "56px", paddingBottom: "56px" }}>
        <div className="text-center" style={{ maxWidth: "680px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs leading-relaxed" style={{ color: SILVER, opacity: 0.55 }}>
            Grassroots Fantasy scoring is built entirely on on-field statistics from official game records — never fan voting or popularity. Players under 18 appear only with written parent or guardian consent, and any player can opt out at any time. Endorsed by the Auckland Softball Association.
          </p>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="relative px-6 sm:px-12 overflow-hidden text-center" style={{ background: '#0D0D0F', borderTop: `1px solid ${COBALT}60`, borderBottom: `1px solid ${COBALT}60`, paddingTop: "110px", paddingBottom: "120px" }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 55% 65% at 50% 50%, ${COBALT}28 0%, transparent 70%)` }} />
        <div className="relative z-10" style={{ maxWidth: "576px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: GOLD }}>Season One</p>
          <h2 className="text-3xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Registration opens with the season.</h2>
          <p className="text-sm text-white/55 leading-relaxed" style={{ maxWidth: "460px", marginLeft: "auto", marginRight: "auto", marginBottom: "56px" }}>
            Register free and your Starter Pack lands instantly. Playing in the competition? Your access comes with your Association registration. Got a club code? It counts toward your club — and earns you a bonus pack.
          </p>
          <a href="mailto:info@grassrootsfantasy.co.nz?subject=Grassroots%20Fantasy%20NFS%20—%20Keep%20me%20posted"
            className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]"
            style={{ color: GOLD, border: `1px solid ${GOLD}`, background: 'transparent', padding: "22px 64px" }}>
            Keep me posted
          </a>
          <p className="text-[11px] text-white/35 mt-7">Launch date announced soon. Be first in when packs drop.</p>
        </div>
      </section>
      
{/* ── NFS League FAQ ── */}
      <section className="px-6 sm:px-12" style={{ background: '#101013', borderTop: '1px solid #ffffff0a', paddingTop: "80px", paddingBottom: "90px" }}>
        <div style={{ maxWidth: "700px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "48px" }}>NFS League questions.</h2>
          <div className="flex flex-col gap-3">
            {[
              {
                q: 'What\u2019s in my Starter Pack?',
                a: 'Twelve cards when you register: two two-way players (one full 2WP who scores batting and pitching, one pitching-only), a spread of Elite and Common players, and always enough position coverage to field a legal lineup from day one.',
              },
              {
                q: 'How big is my squad?',
                a: 'Twenty-one cards once your Pre-Season Pack lands: 12 starters, 4 bench (scoring at 0.75\u00d7, stepping in at full value when a starter misses), and 5 reserves. Free packs each week grow your collection from there.',
              },
              {
                q: 'When do lineups lock?',
                a: 'Lineups open each Tuesday once the previous round\u2019s stats are confirmed, and lock Friday at 4pm ahead of Saturday\u2019s games. Provisional scores land over the weekend; confirmed scores follow official stats on Tuesday.',
              },
              {
                q: 'What are the card tiers?',
                a: 'Rare two-way players, Elite, and Common \u2014 rarity reflects on-field production and honours across recent seasons. Every tier scores from the same point table; a Common having a big Saturday outscores a quiet Elite.',
              },
              {
                q: 'Where\u2019s the full point table?',
                a: 'On the Scoring & Leaderboards page \u2014 every batting and pitching event and exactly what it\u2019s worth, plus how each lineup slot scores.',
              },
              {
                q: 'Men\u2019s and Women\u2019s \u2014 can I play both?',
                a: 'Yes. One account can hold a team in each grade, with separate squads, separate packs, and separate ladders all season.',
              },
            ].map(item => (
              <details key={item.q} className="group rounded-xl overflow-hidden" style={{ background: '#121215', border: '1px solid #2456E630' }}>
                <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-white">{item.q}</span>
                  <span className="text-lg font-black shrink-0 transition-transform group-open:rotate-45" style={{ color: '#2456E6' }}>+</span>
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed text-white/50">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: "40px" }}>
            <a href="/nfs/scoring" className="inline-block text-sm font-bold tracking-wide transition-all hover:scale-[1.02]"
              style={{ color: '#4D7FFF', border: '1px solid #4D7FFF', background: 'transparent', padding: "16px 48px" }}>
              Scoring &amp; Leaderboards →
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
