import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import FactsTicker from '@/components/FactsTicker'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#C0C0C0'
const GREEN = '#2D9E4E'

export default function NFS() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ paddingTop: "90px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10 text-center" style={{ maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-6" style={{ color: GOLD }}>League One · Now Live</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            NFS Premier<br/>Softball League
          </h1>
          <p className="text-sm text-white/60 leading-relaxed" style={{ maxWidth: "480px", marginLeft: "auto", marginRight: "auto", marginBottom: "32px" }}>
            The Northern Fastpitch Series — Auckland's premier softball competition, running since 2005 on nearly ninety years of Auckland softball history. Now with a fantasy league of its own, endorsed by the Auckland Softball Association.
          </p>

          <div className="flex items-center justify-center gap-8 flex-wrap" style={{ marginBottom: "44px" }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
              <span className="text-xs text-white/60 uppercase tracking-wider font-bold">Men&apos;s — Live</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: COBALT }} />
              <span className="text-xs text-white/60 uppercase tracking-wider font-bold">Women&apos;s — Live</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="/register"
              className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]"
              style={{ color: '#0D0D0F', background: GOLD, padding: "18px 52px", boxShadow: `0 0 24px ${GOLD}40` }}>
              Register your team
            </a>
            <a href="/login"
              className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]"
              style={{ color: 'white', border: '1px solid #ffffff35', background: 'transparent', padding: "18px 52px" }}>
              Log in
            </a>
          </div>
        </div>
      </section>

      {/* Facts ticker */}
      <FactsTicker />

      {/* The competition */}
      <section className="px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "90px", paddingBottom: "90px" }}>
        <div className="grid gap-6 sm:grid-cols-3" style={{ maxWidth: "900px", marginLeft: "auto", marginRight: "auto" }}>
          {[
            { big: '2005', label: 'NFS founded', d: 'Twenty seasons of Northern Premier fastpitch softball.' },
            { big: '1939', label: 'Auckland softball begins', d: 'Nearly ninety years of history behind ASA every game.' },
            { big: '300+', label: 'Career games club', d: 'Only eight players have ever been recorded as reaching it. Their cards carry the badge.' },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl p-8 flex flex-col gap-2 items-center text-center" style={{ background: '#121215', border: `1px solid ${COBALT}30` }}>
              <span className="text-4xl font-black" style={{ color: COBALT, fontFamily: 'var(--font-heading)' }}>{s.big}</span>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: SILVER }}>{s.label}</span>
              <p className="text-xs text-white/50 leading-relaxed mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="px-6 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: "90px", paddingBottom: "90px" }}>
        <div style={{ maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "56px" }}>Your season, inside the season.</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { t: 'Starter Pack on signup', d: '12 cards land the moment you register — including the only two-way player cards dealt all season. Your lineup auto-assigns so you can score from day one.' },
              { t: 'Weekly rhythm', d: 'Results confirm Tuesday, lineups lock Friday 4pm, games play out on the weekend. A living league that moves with the real one.' },
              { t: 'Six ways to win', d: 'Season ladder, weekly head-to-head, Weekly High Score, Club Champion, and the Finals Challenge with its own packs and title.' },
              { t: 'Back your club', d: 'Register with your club\'s code and every point you score counts toward their Club Champion campaign.' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl p-7 flex flex-col gap-3 text-left" style={{ background: '#1A1A22', border: '1px solid #ffffff0a', borderLeft: `3px solid ${COBALT}` }}>
                <h3 className="text-base font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h3>
                <p className="text-xs text-white/55 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NFS card tiers */}
      <section className="px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "90px", paddingBottom: "90px" }}>
        <div className="flex flex-col items-center" style={{ maxWidth: "1000px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-5" style={{ fontFamily: 'var(--font-heading)' }}>The NFS card tiers.</h2>
          <p className="text-sm text-white/55 text-center leading-relaxed" style={{ maxWidth: "540px", marginBottom: "64px" }}>
            Softball is a sport where one player can dominate both sides of the game and affect outcomes heavily — so the NFS League carries two Rare tiers found nowhere else: the two-way players.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 w-full">
            {[
              { tier: 'RARE 2WP A', accent: '#FFD700', desc: 'The complete two-way players — they pitch AND hit at the top level. The rarest cards in the game, dealt only in Starter Packs...' },
              { tier: 'RARE 2WP B', accent: GOLD, desc: 'Pitchers whose value lives on the mound. Rare, specialist, and game-changing in the right matchup.' },
              { tier: 'ELITE', accent: SILVER, desc: 'The proven performers — season after season at the top of the stats. Silver treatment, serious points.' },
              { tier: 'COMMON', accent: GREEN, desc: 'The backbone of every Club and every fantasy squad. Smart Managers know: Championships are won with great Commons.' },
            ].map((c) => (
              <div key={c.tier} className="rounded-3xl p-7 flex flex-col gap-4 items-center text-center" style={{ background: '#121215', border: `1px solid ${c.accent}45`, paddingTop: "36px" }}>
                <span className="text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full" style={{ color: c.accent, background: c.accent + '18', lineHeight: "1.6" }}>{c.tier}</span>
                <div className="w-24 h-36 rounded-xl flex items-end justify-center" style={{ background: `linear-gradient(180deg, ${c.accent}45 0%, ${c.accent}10 55%, #0D0D0F 100%)`, border: `1px solid ${c.accent}50`, boxShadow: `0 0 20px ${c.accent}20` }}>
                  <svg width="56" height="76" viewBox="0 0 60 80" fill="none">
                    <circle cx="30" cy="22" r="12" fill={c.accent + '60'}/>
                    <path d="M8 80 C8 55 52 55 52 80 Z" fill={c.accent + '60'}/>
                  </svg>
                </div>
                <p className="text-[11px] text-white/55 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-12 italic">Real player card examples revealed at launch.</p>
        </div>
      </section>

      {/* Wellbeing / trust strip */}
      <section className="px-6 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: "56px", paddingBottom: "56px" }}>
        <div className="text-center" style={{ maxWidth: "680px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs leading-relaxed" style={{ color: SILVER, opacity: 0.7 }}>
            Grassroots Fantasy scoring is built entirely on on-field statistics from official game records — never fan voting or popularity. Players under 18 appear only with written parent or guardian consent, and any player can opt out at any time. Endorsed by the Auckland Softball Association.
          </p>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="relative px-6 sm:px-12 overflow-hidden text-center" style={{ background: '#0D0D0F', borderTop: `1px solid ${COBALT}60`, borderBottom: `1px solid ${COBALT}60`, paddingTop: "110px", paddingBottom: "120px" }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 55% 65% at 50% 50%, ${COBALT}28 0%, transparent 70%)` }} />
        <div className="relative z-10" style={{ maxWidth: "576px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: GOLD }}>Season One · Live Now</p>
          <h2 className="text-3xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Your Starter Pack is waiting.</h2>
          <p className="text-sm text-white/60 leading-relaxed" style={{ maxWidth: "460px", marginLeft: "auto", marginRight: "auto", marginBottom: "56px" }}>
            Register free and your Starter Pack lands instantly. Playing in the competition? Your access comes with your Association registration. Got a club code? It counts toward your club — and earns you a bonus pack.
          </p>
          <a href="/register"
            className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]"
            style={{ color: '#0D0D0F', background: GOLD, padding: "22px 64px", boxShadow: `0 0 28px ${GOLD}45` }}>
            Register your team
          </a>
          <p className="text-[11px] text-white/40 mt-7">Free to play. One account covers both Men&apos;s and Women&apos;s grades.</p>
        </div>
      </section>

{/* ── NFS League FAQ ── */}
      <section className="px-6 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: "80px", paddingBottom: "90px" }}>
        <div style={{ maxWidth: "700px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "16px" }}>NFS League questions.</h2>
          <div className="text-center" style={{ marginBottom: "48px" }}>
            <a href="/nfs/scoring" className="text-sm font-bold" style={{ color: '#4D7FFF' }}>
              Full point table on Scoring &amp; Leaderboards →
            </a>
          </div>
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
              <details key={item.q} className="group rounded-xl overflow-hidden" style={{ background: '#1A1A22', border: '1px solid #2456E630' }}>
                <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-white">{item.q}</span>
                  <span className="text-lg font-black shrink-0 transition-transform group-open:rotate-45" style={{ color: '#2456E6' }}>+</span>
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed text-white/60">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: "48px" }}>
            <a href="/register" className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]"
              style={{ color: '#0D0D0F', background: GOLD, padding: "18px 52px", boxShadow: `0 0 24px ${GOLD}40` }}>
              Register your team
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}