import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const CREAM = '#F5F1E8'
const GREEN = '#3FBF63'
const GREEN_DEEP = '#2D9E4E'
const SAND = '#E8D5A3'
const BLUE = '#4D7FFF'

// The weekly loop — each stage carries the trigger that moves it to the next.
// Stage 05 closes back to 01, which is the point of the section.
const ROUND_CYCLE = [
  { n: '01', t: 'Round opens', d: 'Your free Weekly Pack drops.', trigger: 'You make your calls', accent: SAND },
  { n: '02', t: 'Set your lineup', d: 'Starters, bench, reserves — your call.', trigger: 'Lineups lock', accent: BLUE },
  { n: '03', t: 'Matchup revealed', d: 'Your squad against theirs, side by side.', trigger: 'The games are played', accent: BLUE },
  { n: '04', t: 'Scores land', d: 'Every hit, run, steal and strikeout counts.', trigger: 'Official stats reviewed', accent: GREEN },
  { n: '05', t: 'Standings update', d: 'Ladder, head-to-head, weekly high score, clubs.', trigger: 'Back to the top', accent: SAND },
]

const PILLARS = [
  { t: 'Built on real games', d: 'Every point comes from a real result in your competition — nothing invented, nothing simulated.' },
  { t: 'Made for communities', d: 'Clubs, supporters, families and old teammates playing along together.' },
  { t: 'Players celebrated', d: 'Every player gets a card. Careers, milestones and big weeks recognised — not just the stars.' },
]

export default function Home() {
  return (
    <main className="min-h-screen w-full" style={{ background: '#141210' }}>
      <Nav />

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "url('/hero-grass.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 65%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #141210E6 0%, #14121080 40%, #141210B3 75%, #141210 100%)' }} />

        <div className="relative z-10 w-full flex flex-col items-center px-6 text-center"
          style={{ maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto', paddingTop: '96px', paddingBottom: '72px' }}>

          <div className="opacity-0 animate-fade-up flex items-center justify-center gap-4 sm:gap-6" style={{ marginBottom: '40px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gf-mark.png" alt="" className="w-16 sm:w-24" style={{ filter: 'drop-shadow(0 8px 24px #00000090)' }} />
            <div className="text-left">
              <span className="block text-2xl sm:text-4xl font-bold tracking-wide leading-none"
                style={{ color: GREEN, fontFamily: 'var(--font-heading)', textShadow: '0 2px 12px #00000080' }}>GRASSROOTS</span>
              <span className="block text-2xl sm:text-4xl font-black tracking-wider leading-none"
                style={{ color: CREAM, fontFamily: 'var(--font-wordmark)', fontStretch: '125%', textShadow: '0 2px 12px #00000080', marginTop: '5px' }}>FANTASY</span>
            </div>
          </div>

          <h1 className="opacity-0 animate-fade-up delay-1 text-4xl sm:text-6xl font-black leading-[1.1]"
            style={{ fontFamily: 'var(--font-heading)', color: CREAM, marginBottom: '24px' }}>
            Play along with your <span style={{ color: GREEN }}>favourite players.</span>
          </h1>

          <p className="opacity-0 animate-fade-up delay-2 text-sm sm:text-lg leading-relaxed"
            style={{ color: `${CREAM}8C`, maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '40px' }}>
            Grassroots Fantasy turns real local competitions into fantasy leagues. Collect player cards,
            build your squad, and score points from real results.
          </p>

          <div className="opacity-0 animate-fade-up delay-3 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <a href="/nfs"
              className="w-full sm:w-auto text-center text-base font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
              style={{ color: '#141210', background: GREEN, padding: '18px 40px', maxWidth: '340px', boxShadow: `0 0 26px ${GREEN}50` }}>
              Start playing
            </a>
            <a href="/how"
              className="w-full sm:w-auto text-center text-base font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
              style={{ color: SAND, border: `1px solid ${SAND}`, background: 'transparent', padding: '18px 40px', maxWidth: '340px' }}>
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* ── PLATFORM VALUE ── */}
      <section className="w-full px-6" style={{ background: '#181510', borderTop: '1px solid #ffffff08', paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="w-full flex flex-col items-center text-center" style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-3xl sm:text-5xl font-black leading-tight"
            style={{ fontFamily: 'var(--font-heading)', color: CREAM, marginBottom: '20px' }}>
            Any sport. Any league.<br />Any number of teams.
          </h2>
          <p className="text-sm sm:text-base leading-relaxed"
            style={{ color: `${CREAM}73`, maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '48px' }}>
            If a competition keeps score, Grassroots Fantasy can run a league on it. Softball, rugby,
            netball, cricket, football — the platform adapts to any sport&apos;s stats and any season format.
          </p>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-3 w-full">
            {PILLARS.map((f) => (
              <div key={f.t} className="rounded-2xl flex flex-col gap-3 items-center text-center"
                style={{ background: '#1A2E1F40', border: `1px solid ${GREEN_DEEP}30`, padding: '28px 22px 26px' }}>
                <div className="h-1 w-10 rounded-full" style={{ background: GREEN_DEEP }} />
                <h3 className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: CREAM }}>{f.t}</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: `${CREAM}73` }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW A ROUND WORKS — the five-stage loop ── */}
      <section className="w-full px-6" style={{ borderTop: '1px solid #ffffff08', paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="w-full" style={{ maxWidth: '1060px', marginLeft: 'auto', marginRight: 'auto' }}>

          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: GREEN_DEEP, marginBottom: '14px' }}>How a round works</p>
            <h2 className="text-3xl sm:text-5xl font-black leading-tight" style={{ fontFamily: 'var(--font-heading)', color: CREAM }}>
              Five stages. Every round of the season.
            </h2>
          </div>

          {/* Number sits inline with the title so a card stays short on a phone */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {ROUND_CYCLE.map((s, i) => (
              <div key={s.n} className="rounded-2xl flex flex-col text-left"
                style={{
                  background: `linear-gradient(170deg, ${s.accent}12 0%, #1A1A1F 55%, #141210 100%)`,
                  border: `1px solid ${s.accent}40`,
                  padding: '18px 18px 14px',
                }}>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl font-black leading-none shrink-0"
                    style={{ fontFamily: 'var(--font-heading)', color: s.accent, textShadow: `0 0 14px ${s.accent}45` }}>
                    {s.n}
                  </span>
                  <h3 className="text-base font-black leading-tight" style={{ fontFamily: 'var(--font-heading)', color: CREAM }}>
                    {s.t}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: `${CREAM}73`, marginTop: '8px', flex: 1 }}>
                  {s.d}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5"
                  style={{ color: `${s.accent}C0`, marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #ffffff10' }}>
                  <span>{i === ROUND_CYCLE.length - 1 ? '↻' : '→'}</span>
                  {s.trigger}
                </p>
              </div>
            ))}
          </div>

          {/* The loop closes */}
          <div className="text-center rounded-2xl"
            style={{ marginTop: '16px', padding: '20px 22px', border: `1px solid ${SAND}40`, background: `${SAND}0A` }}>
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.28em]" style={{ color: SAND }}>
              Stats confirmed — the next round opens
            </p>
            <p className="text-xs leading-relaxed"
              style={{ color: `${CREAM}73`, marginTop: '10px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
              A weekly rhythm all season, so there&apos;s always a lineup to set and a result coming.
              Miss a week and your cards still land — you just miss the reveal.
            </p>
          </div>
        </div>
      </section>

      {/* ── NOW LIVE ── */}
      <section className="w-full px-6" style={{ borderTop: '1px solid #ffffff08', paddingTop: '80px', paddingBottom: '96px' }}>
        <div className="w-full" style={{ maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="relative rounded-[2rem] text-center overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1A2E1F 0%, #141210 100%)',
              border: `1px solid ${GREEN_DEEP}45`,
              boxShadow: `0 0 40px ${GREEN_DEEP}18`,
              padding: '56px 28px 52px',
            }}>
            {/* Lit rule across the top edge — inside the rounded box, so it can't escape the corner */}
            <div className="absolute top-0 left-0 right-0 pointer-events-none"
              style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)`, boxShadow: `0 0 14px ${GREEN}` }} />

            <div className="flex items-center justify-center gap-2" style={{ marginBottom: '18px' }}>
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: GREEN }} />
              <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: SAND }}>Now Live</p>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black leading-tight"
              style={{ fontFamily: 'var(--font-heading)', color: CREAM, marginBottom: '18px' }}>
              NFS Premier League
            </h2>
            <p className="text-sm leading-relaxed"
              style={{ color: `${CREAM}73`, maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '36px' }}>
              Our first fantasy league — built for the Northern Fastpitch Series, endorsed by the
              Auckland Softball Association.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="/register"
                className="w-full sm:w-auto text-center text-base font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
                style={{ color: '#141210', background: SAND, padding: '18px 40px', maxWidth: '320px', boxShadow: `0 0 24px ${SAND}40` }}>
                Register your team
              </a>
              <a href="/nfs"
                className="w-full sm:w-auto text-center text-base font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
                style={{ color: BLUE, border: `1px solid ${BLUE}`, background: 'transparent', padding: '18px 40px', maxWidth: '320px' }}>
                Enter the league
              </a>
            </div>
            <p className="text-[11px]" style={{ color: `${CREAM}66`, marginTop: '20px' }}>
              Free to play. One account covers both Men&apos;s and Women&apos;s grades.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}