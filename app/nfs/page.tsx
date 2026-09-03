import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import FactsTicker from '@/components/FactsTicker'
import SandboxBanner from '@/components/SandboxBanner'
import NfsBackdrop from '@/components/NfsBackdrop'
import ViewTicker from '@/components/ViewTicker'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#4DA6FF'
const GREEN = '#2D9E4E'
const ELITE = '#1D3FBE'   // matches the Elite tier on the cards

// Sections that sit over the logo backdrop are translucent so it shows through
const OVER_BACKDROP = 'rgba(20,20,26,0.72)'

export default function NFS() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav /><SandboxBanner />

      {/* ══ Everything from the hero down to The History runs over one backdrop ══ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 40% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <NfsBackdrop />

        {/* Hero */}
        <section className="relative z-10 px-5 sm:px-12" style={{ paddingTop: "56px", paddingBottom: "48px" }}>
          <div className="text-center" style={{ maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-5" style={{ color: GOLD }}>League One · Now Live</p>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              NFS Premier League
            </h1>
            <p className="text-sm text-white/70 leading-relaxed" style={{ maxWidth: "480px", marginLeft: "auto", marginRight: "auto", marginBottom: "28px" }}>
              The Northern Fastpitch Series — Auckland&apos;s Premier Fastpitch competition, running since 2005 on nearly ninety years of Auckland Softball history. Now with a Fantasy League of its own, endorsed by the Auckland Softball Association.
            </p>
            <div className="flex items-center justify-center gap-8 flex-wrap" style={{ marginBottom: "32px" }}>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
                <span className="text-xs text-white/70 uppercase tracking-wider font-bold">Men&apos;s — Live</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: COBALT }} />
                <span className="text-xs text-white/70 uppercase tracking-wider font-bold">Women&apos;s — Live</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/register"
                className="w-full sm:w-auto text-center text-base font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
                style={{ color: '#0D0D0F', background: GOLD, padding: "18px 44px", maxWidth: '360px', boxShadow: `0 0 24px ${GOLD}40` }}>
                Register your team
              </a>
              <a href="/login"
                className="w-full sm:w-auto text-center text-base font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
                style={{ color: 'white', border: '1px solid #ffffff35', background: 'transparent', padding: "18px 44px", maxWidth: '360px' }}>
                Log in
              </a>
            </div>
            <p className="text-[11px] text-white/60 mt-5">Free to play. One account covers both Men&apos;s and Women&apos;s grades.</p>
          </div>
        </section>

        {/* Facts ticker */}
        <div className="relative z-10">
          <FactsTicker />
        </div>

        {/* Scoring & Competitions */}
        <section className="relative z-10 px-5 sm:px-12"
          style={{ background: OVER_BACKDROP, borderTop: `2px solid ${GOLD}35`, borderBottom: '1px solid #ffffff0a', paddingTop: "36px", paddingBottom: "36px" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5" style={{ maxWidth: "900px", marginLeft: "auto", marginRight: "auto" }}>
            <div className="text-center sm:text-left">
              <p className="text-xs font-black uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>How it all scores</p>
              <p className="text-lg sm:text-xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                Every event, every point, every competition.
              </p>
              <p className="text-xs text-white/70 mt-1">
                The full point table, how each lineup slot scores, and the five ways to win.
              </p>
            </div>
            <a href="/nfs/scoring"
              className="w-full sm:w-auto text-center text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.03] shrink-0 rounded-full"
              style={{ color: '#0D0D0F', background: GOLD, padding: '16px 34px', maxWidth: '360px', boxShadow: `0 0 22px ${GOLD}40` }}>
              Scoring &amp; Competitions
            </a>
          </div>
        </section>

        {/* The Competition — three across on a phone so it stays one band deep */}
        <section className="relative z-10 px-5 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "32px", paddingBottom: "32px" }}>
          <div className="grid grid-cols-3 gap-2 sm:gap-6" style={{ maxWidth: "900px", marginLeft: "auto", marginRight: "auto" }}>
            {[
              { big: '2005', label: 'NFS founded', d: 'Twenty-one seasons of Northern Premier fastpitch.' },
              { big: '1939', label: 'Auckland softball begins', d: 'Nearly ninety years of history behind ASA every game.' },
              { big: '300+', label: 'Career games club', d: 'Only eight players have ever been recorded as reaching it. Their cards carry the badge.' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl flex flex-col gap-1 sm:gap-2 items-center text-center justify-center"
                style={{ background: 'rgba(18,18,21,0.78)', border: `1px solid ${COBALT}30`, padding: '16px 8px' }}>
                <span className="text-2xl sm:text-4xl font-black leading-none" style={{ color: COBALT, fontFamily: 'var(--font-heading)' }}>{s.big}</span>
                <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest leading-tight" style={{ color: SILVER }}>{s.label}</span>
                {/* Detail is desktop only — on a phone the number and label carry it */}
                <p className="hidden sm:block text-xs text-white/70 leading-relaxed mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The History ── */}
        <section className="relative z-10 px-5 sm:px-12"
          style={{ background: OVER_BACKDROP, borderTop: '1px solid #ffffff0a', paddingTop: "28px", paddingBottom: "28px" }}>
          <div style={{ maxWidth: "900px", marginLeft: "auto", marginRight: "auto" }}>

            <div className="text-center" style={{ marginBottom: '28px' }}>
              <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>The History</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Twenty-two seasons.<br className="sm:hidden" /> And everyone who made them.
              </h2>
            </div>

            {/* Honours Board — the feature. Engraved plaque treatment, full width. */}
            <a href="/nfs/honours" className="block rounded-3xl overflow-hidden transition-all hover:scale-[1.008]"
              style={{
                background: `linear-gradient(168deg, ${GOLD}22 0%, #1A1710 42%, #0E0D0B 100%)`,
                border: `1px solid ${GOLD}70`,
                boxShadow: `0 0 46px ${GOLD}1F`,
                padding: '5px',
                marginBottom: '16px',
              }}>
              {/* Inner frame — the engraved edge of a trophy plaque */}
              <div className="relative rounded-[1.3rem] pinstripe-fine text-center overflow-hidden"
                style={{ border: `1px solid ${GOLD}38`, padding: '40px 24px 36px' }}>
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${GOLD}18 0%, transparent 70%)` }} />

                <div className="relative">
                  <p className="text-base sm:text-lg font-black uppercase tracking-[0.3em]"
                    style={{ color: GOLD, textShadow: `0 0 16px ${GOLD}70` }}>
                    Honours Board
                  </p>
                  <div className="mx-auto" style={{ width: '52px', height: '2px', background: GOLD, boxShadow: `0 0 10px ${GOLD}`, margin: '14px auto 22px', borderRadius: '2px' }} />

                  <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight"
                    style={{ fontFamily: 'var(--font-heading)' }}>
                    Every winner. Every season.
                  </h3>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed"
                    style={{ maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto', marginTop: '14px', marginBottom: '30px' }}>
                    Every Premier award since 2004-05 — batters, pitchers and MVPs, season by season.
                  </p>

                  <span className="inline-flex items-center gap-2 rounded-full text-sm font-black uppercase tracking-widest"
                    style={{ color: '#0D0D0F', background: GOLD, padding: '15px 32px', boxShadow: `0 0 22px ${GOLD}50` }}>
                    See the Honours Board
                  </span>
                </div>
              </div>
            </a>

            {/* Officials Wing — photograph carries it */}
            <a href="/nfs/officials" className="block rounded-3xl overflow-hidden transition-all hover:scale-[1.008]"
              style={{ border: `1px solid ${SILVER}50`, background: '#111319', boxShadow: `0 0 26px ${SILVER}12` }}>
              <div className="grid sm:grid-cols-2">
                <div className="relative" style={{ minHeight: '210px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/officials-umpire.jpg" alt="An umpire calls the play at second"
                    className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 40%' }} />
                  <div className="absolute inset-0"
                    style={{ background: `linear-gradient(180deg, #0D0D0F10 0%, #0D0D0F55 60%, #111319E6 100%)` }} />
                  <div className="absolute inset-0 sm:block hidden"
                    style={{ background: `linear-gradient(90deg, transparent 40%, #111319 100%)` }} />
                </div>

                <div className="text-center sm:text-left" style={{ padding: '28px 24px 30px' }}>
                  <p className="text-base sm:text-lg font-black uppercase tracking-[0.3em]"
                    style={{ color: SILVER, textShadow: `0 0 16px ${SILVER}70` }}>The Officials Wing</p>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight" style={{ fontFamily: 'var(--font-heading)', marginTop: '12px' }}>
                    No game happens without them.
                  </h3>
                  <p className="text-xs text-white/65 leading-relaxed" style={{ marginTop: '12px' }}>
                    The umpires and scorers who have worked hundreds of Premier games — including the
                    only official ever to reach 400.
                  </p>
                  <span className="inline-flex items-center gap-2 rounded-full text-sm font-black uppercase tracking-widest"
                    style={{ color: '#0D0D0F', background: SILVER, padding: '14px 28px', boxShadow: `0 0 20px ${SILVER}45`, marginTop: '22px' }}>
                    Enter the Wing
                  </span>
                </div>
              </div>
            </a>
          </div>
        </section>
      </div>
      {/* ══ backdrop ends ══ */}

      {/* What you get */}
      <section className="px-5 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "48px", paddingBottom: "48px" }}>
        <div style={{ maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "32px" }}>Your season, inside the season.</h2>
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            {[
              { t: 'Starter Pack on signup', d: '12 cards land the moment you register — including the only two-way player cards dealt all season. Your lineup auto-assigns so you can score from day one.' },
              { t: 'Weekly rhythm', d: 'Results confirm Tuesday, lineups lock Friday night, games play out on the weekend. A living league that moves with the real one.' },
              { t: 'Five ways to win', d: 'Season ladder, weekly head-to-head, Weekly High Score, Club Champion, and the Finals Challenge with its own packs and title — and one account can chase them in both grades.', href: '/nfs/scoring', link: 'See how each competition works →' },
              { t: 'Back your club', d: 'Playing in the competition? Your access comes with your Association registration. Got a club code? Register with it and every point you score counts toward their Club Champion campaign.' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl p-6 flex flex-col gap-3 text-left" style={{ background: '#1A1A22', border: '1px solid #ffffff0a', borderLeft: `3px solid ${COBALT}` }}>
                <h3 className="text-base font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h3>
                <p className="text-xs text-white/70 leading-relaxed">{f.d}</p>
                {'href' in f && <a href={(f as { href: string }).href} className="text-xs font-bold" style={{ color: SILVER }}>{(f as { link: string }).link}</a>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NFS card tiers */}
      <section className="px-5 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: "48px", paddingBottom: "48px" }}>
        <div className="flex flex-col items-center" style={{ maxWidth: "1000px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-4" style={{ fontFamily: 'var(--font-heading)' }}>The NFS card tiers.</h2>
          <p className="text-sm text-white/70 text-center leading-relaxed" style={{ maxWidth: "540px", marginBottom: "32px" }}>
            Softball is a sport where one player can dominate both sides of the game and affect outcomes heavily — so the NFS League carries two Rare tiers found nowhere else: the two-way players.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 w-full">
            {[
              { tier: 'RARE 2WP A', accent: '#FFD700', desc: 'The complete two-way players — they pitch AND hit at the top level. The rarest cards in the game, dealt only in Starter Packs.' },
              { tier: 'RARE 2WP B', accent: GOLD, desc: 'Pitchers whose value lives on the mound. Rare, specialist, and game-changing in the right matchup.' },
              { tier: 'ELITE', accent: ELITE, desc: 'The proven performers — season after season at the top of the stats. Serious points.' },
              { tier: 'COMMON', accent: GREEN, desc: 'The backbone of every Club and every fantasy squad. Smart Managers know: Championships are won with great Commons.' },
            ].map((c) => (
              <div key={c.tier} className="rounded-2xl flex flex-col gap-3 items-center text-center" style={{ background: '#121215', border: `1px solid ${c.accent}45`, padding: '20px 14px' }}>
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: c.accent, background: c.accent + '18', lineHeight: "1.6" }}>{c.tier}</span>
                <div className="rounded-lg flex items-end justify-center" style={{ width: '64px', height: '92px', background: `linear-gradient(180deg, ${c.accent}45 0%, ${c.accent}10 55%, #0D0D0F 100%)`, border: `1px solid ${c.accent}50`, boxShadow: `0 0 16px ${c.accent}20` }}>
                  <svg width="40" height="54" viewBox="0 0 60 80" fill="none">
                    <circle cx="30" cy="22" r="12" fill={c.accent + '60'}/>
                    <path d="M8 80 C8 55 52 55 52 80 Z" fill={c.accent + '60'}/>
                  </svg>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/60 mt-8 italic text-center">Real player card examples revealed at launch.</p>
        </div>
      </section>

      {/* Wellbeing / trust strip */}
      <section className="px-5 sm:px-12" style={{ borderTop: '1px solid #ffffff0a', paddingTop: "36px", paddingBottom: "36px" }}>
        <div className="text-center" style={{ maxWidth: "680px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs leading-relaxed text-white/70">
            Grassroots Fantasy scoring is built entirely on on-field statistics from official game records — never fan voting or popularity. Players under 18 appear only with written parent or guardian consent. Endorsed by the Auckland Softball Association.
          </p>
          <p className="text-xs leading-relaxed text-white/70" style={{ marginTop: '14px' }}>
            Any player can opt out at any time. Email{' '}
            <a href="mailto:info@grassrootsfantasy.co.nz?subject=Opt%20out%20of%20Grassroots%20Fantasy"
              style={{ color: SILVER, fontWeight: 700 }}>info@grassrootsfantasy.co.nz</a>
            {' '}and your card comes down within 48 hours. No reason needed, and nothing is asked of you.
          </p>
        </div>
      </section>

      {/* ── NFS League FAQ ── */}
      <section id="register" className="px-5 sm:px-12" style={{ background: '#0D0D0F', borderTop: `1px solid ${COBALT}40`, paddingTop: "48px", paddingBottom: "56px" }}>
        <div style={{ maxWidth: "700px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center" style={{ fontFamily: 'var(--font-heading)', marginBottom: "12px" }}>NFS League questions.</h2>
          <div className="text-center" style={{ marginBottom: "28px" }}>
            <a href="/nfs/scoring" className="text-sm font-bold" style={{ color: '#4D7FFF' }}>
              Full point table on Scoring &amp; Competitions →
            </a>
          </div>
          <div className="flex flex-col gap-3">
            {[
              {
                q: 'What is the Sandbox Season?',
                a: 'A practice run before the real thing. Sandbox rounds use last season\u2019s team lists, and the game stats are simulated \u2014 nothing you see reflects a real 2026/27 result. It exists so you can open packs, set lineups, and learn the weekly rhythm before it counts. Everything resets in September.',
              },
              {
                q: 'So when do the real teams arrive?',
                a: 'The real 2026/27 team lists are patched in for the proper competition, along with player photos and the additional card details \u2014 career badges, positions, and full stat lines. Sandbox squads and scores are wiped at that point; everyone starts the real season level.',
              },
              {
                q: 'What\u2019s in my Starter Pack?',
                a: 'Twelve cards when you register: two two-way players (one full 2WP who scores batting and pitching, one pitching-only), a spread of Elite and Common players, and always enough position coverage to field a legal lineup from day one. This is the only place the rarest cards are dealt\u2026 or is it?',
              },
              {
                q: 'How big is my squad?',
                a: 'Twenty-one cards once your Pre-Season Pack lands: 12 starters, 4 bench (scoring at 0.75\u00d7, stepping in at full value when a starter misses), and 5 reserves. Free packs each week grow your collection from there.',
              },
              {
                q: 'When do lineups lock?',
                a: 'Lineups open each Tuesday once the previous round\u2019s stats are confirmed, and lock Friday night ahead of the weekend\u2019s games. Your head-to-head matchup is drawn at lock \u2014 that\u2019s when you find out who you\u2019re playing. Provisional scores land over the weekend; confirmed scores follow official stats on Tuesday.',
              },
                            {
                q: 'How do Captain and Vice Captain work?',
                a: 'Name a Captain and a Vice Captain each round. Your Captain scores 2\u00d7 and your Vice Captain 1.5\u00d7 \u2014 both apply every round, so you get two picks that matter. The multiplier hits everything, including the negatives, and anyone sitting in your reserves earns nothing regardless of the armband. Your picks carry over until you change them.',
              },
              {
                q: 'What are the card tiers?',
                a: 'Rare two-way players, Elite, and Common \u2014 rarity reflects on-field production and honours across recent seasons. Every tier scores from the same point table; a Common having a big Saturday outscores a quiet Elite.',
              },
              {
                q: 'Where\u2019s the full point table?',
                a: 'On the Scoring & Competitions page \u2014 every batting and pitching event and exactly what it\u2019s worth, plus how each lineup slot scores.',
              },
              {
                q: 'I don\u2019t want a card. How do I opt out?',
                a: 'Email info@grassrootsfantasy.co.nz and say so \u2014 that\u2019s the whole process. Your card is removed within 48 hours, you don\u2019t need to give a reason, and nobody will ask you to reconsider. If you change your mind later, email again.',
              },
              {
                q: 'Men\u2019s and Women\u2019s \u2014 can I play both?',
                a: 'Yes. One account can hold a team in each grade, with separate squads, separate packs, and separate ladders all season.',
              },
            ].map(item => (
              <details key={item.q} className="group rounded-xl overflow-hidden" style={{ background: '#1A1A22', border: '1px solid #2456E630' }}>
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-white">{item.q}</span>
                  <span className="text-lg font-black shrink-0 transition-transform group-open:rotate-45" style={{ color: '#2456E6' }}>+</span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-white/70">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: "36px" }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: GOLD }}>Season One · Live Now</p>
            <a href="/register" className="inline-block w-full text-center text-base font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
              style={{ color: '#0D0D0F', background: GOLD, padding: "20px 44px", maxWidth: '360px', boxShadow: `0 0 28px ${GOLD}45` }}>
              Register your team
            </a>
            <p className="text-[11px] text-white/60 mt-4">Your Starter Pack lands instantly.</p>
            <ViewTicker page="nfs" accent={GOLD} />
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}