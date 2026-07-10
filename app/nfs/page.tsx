import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function NFS() {
  return (
    <main className="min-h-screen" style={{ background: '#141210' }}>
      <Nav />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 sm:px-12 overflow-hidden grain">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #16261C 0%, #141210 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#E8D5A3' }}>Edition One · Now Live</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            NFS Premier<br/>Softball Edition
          </h1>
          <p className="text-sm text-[#F5F1E8]/45 max-w-lg mx-auto leading-relaxed mb-8">
            The Northern Fastpitch Series — Auckland's premier softball competition, running since 2005 on nearly ninety years of Auckland softball history. Now with a fantasy league of its own, endorsed by the Auckland Softball Association.
          </p>

          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#2D9E4E' }} />
              <span className="text-xs text-[#F5F1E8]/50 uppercase tracking-wider font-bold">Men's — Launching this season</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#A0C4FF' }} />
              <span className="text-xs text-[#F5F1E8]/50 uppercase tracking-wider font-bold">Women's — Decision pending</span>
            </div>
          </div>
        </div>
      </section>

      {/* The competition */}
      <section className="py-24 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {[
              { big: '2005', label: 'NFS founded', d: 'Twenty seasons of premier fastpitch softball.' },
              { big: '1939', label: 'Auckland softball begins', d: 'Nearly ninety years of history behind every game.' },
              { big: '300+', label: 'Career games club', d: 'Only eight players have ever reached it. Their cards carry the badge.' },
            ].map((s) => (
              <div key={s.label} className="rounded-3xl p-8 flex flex-col gap-2 items-center text-center" style={{ background: '#181510', border: '1px solid #ffffff0a' }}>
                <span className="text-4xl font-black" style={{ color: '#2D9E4E', fontFamily: 'var(--font-heading)' }}>{s.big}</span>
                <span className="text-xs font-black uppercase tracking-widest text-[#F5F1E8]/70">{s.label}</span>
                <p className="text-xs text-[#F5F1E8]/35 leading-relaxed mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-24 px-6 sm:px-12" style={{ background: '#181510', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] mb-14" style={{ fontFamily: 'var(--font-heading)' }}>Your season, inside the season.</h2>
          <div className="grid gap-5 sm:grid-cols-2 max-w-3xl mx-auto">
            {[
              { t: 'Starter Pack on signup', d: '12 cards land the moment you register — including the only two-way player cards dealt all season. Your lineup auto-assigns so you can score from day one.' },
              { t: 'Weekly rhythm', d: 'Results confirm Tuesday, lineups lock Friday 4pm, games play out on the weekend. A living league that moves with the real one.' },
              { t: 'Six ways to win', d: 'Season ladder, weekly head-to-head, Weekly High Score, Club Champion, and the Finals Challenge with its own packs and title.' },
              { t: 'Back your club', d: 'Register with your club\'s code and every point you score counts toward their Club Champion campaign.' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl p-7 flex flex-col gap-3 text-left" style={{ background: '#1A2E1F40', border: '1px solid #2D9E4E20' }}>
                <h3 className="text-base font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h3>
                <p className="text-xs text-[#F5F1E8]/40 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wellbeing / trust strip */}
      <section className="py-16 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-[#F5F1E8]/35 leading-relaxed">
            Grassroots Fantasy scoring is built entirely on on-field statistics from official game records — never fan voting or popularity. Players under 18 appear only with written parent or guardian consent, and any player can opt out at any time. Endorsed by the Auckland Softball Association.
          </p>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="py-24 px-6 sm:px-12 text-center" style={{ background: '#1A2E1F', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#E8D5A3' }}>Season One</p>
          <h2 className="text-3xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Registration opens with the season.</h2>
          <p className="text-sm text-[#F5F1E8]/45 mb-10 leading-relaxed">
            Register free and your Starter Pack lands instantly. Playing in the competition? Your access comes with your Association registration. Got a club code? It counts toward your club — and earns you a bonus pack.
          </p>
          <a href="mailto:info@blackdiamondlabs.co.nz?subject=Grassroots%20Fantasy%20NFS%20—%20Keep%20me%20posted"
            className="inline-block rounded-full px-12 py-4 text-sm font-black uppercase tracking-widest text-[#141210] transition-all hover:opacity-90"
            style={{ background: '#E8D5A3' }}>
            Keep me posted
          </a>
          <p className="text-[11px] text-[#F5F1E8]/25 mt-6">Launch date announced soon. Be first in when packs drop.</p>
        </div>
      </section>

      <Footer />
    </main>
  )
}