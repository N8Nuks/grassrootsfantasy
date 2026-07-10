import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function How() {
  return (
    <main className="min-h-screen" style={{ background: '#141210' }}>
      <Nav />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 sm:px-12 overflow-hidden grain">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>How it works</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Your squad. Your calls.<br/>Real results.
          </h1>
          <p className="text-sm text-[#F5F1E8]/45 max-w-lg mx-auto leading-relaxed">
            Grassroots Fantasy is simple to start and rewarding to master. Here's the full journey — from signup to the top of the ladder.
          </p>
        </div>
      </section>

      {/* Step 1 — Register */}
      <section className="py-20 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-[80px_1fr] gap-8 items-start">
          <div className="text-5xl font-black" style={{ color: '#2D9E4E', fontFamily: 'var(--font-heading)' }}>01</div>
          <div>
            <h2 className="text-2xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Register your team</h2>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed mb-4">
              Sign up online with your email and a team name. If you play in the competition, your access comes bundled with your Association registration. Everyone else — supporters, family, mates — registers free on the spot.
            </p>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">
              Got a club code from your Team Manager or Club? Enter it at signup — it locks in your club allegiance for the Club Champion race and earns you a bonus pack.
            </p>
          </div>
        </div>
      </section>

      {/* Step 2 — First Tranche */}
      <section className="py-20 px-6 sm:px-12" style={{ background: '#181510', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-[80px_1fr] gap-8 items-start">
          <div className="text-5xl font-black" style={{ color: '#2D9E4E', fontFamily: 'var(--font-heading)' }}>02</div>
          <div>
            <h2 className="text-2xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Open your Starter Pack</h2>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed mb-4">
              The moment you register, your first tranche lands — 12 player cards, including your two-way players, elites, and the backbone of your squad. This is the only place the rarest cards are dealt, so every Starter Pack matters.
            </p>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">
              <span className="font-bold text-[#F5F1E8]/70">And here's the good part:</span> your starting lineup is auto-assigned instantly. You could register on Friday and score points that weekend without touching a thing. The squad is yours to fine-tune whenever you're ready.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3 — Set your team */}
      <section className="py-20 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-[80px_1fr] gap-8 items-start">
          <div className="text-5xl font-black" style={{ color: '#2D9E4E', fontFamily: 'var(--font-heading)' }}>03</div>
          <div>
            <h2 className="text-2xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Set your lineup, your way</h2>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed mb-4">
              Your squad has starters, bench, and reserves. Starters score full points. Bench players score at a reduced rate and step up automatically if a starter doesn't take the field. Reserves wait in the wings.
            </p>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed mb-4">
              Every position matters — pitchers, catchers, infield, outfield, and the specialist slots that reward smart selections. Chase steals with a designated runner. Stack your batting order. Back a two-way star to dominate both sides of the game.
            </p>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">
              Lineups open after each round's results and lock before the weekend's games. Make your calls, then watch them play out for real.
            </p>
          </div>
        </div>
      </section>

      {/* Step 4 — Packs keep coming */}
      <section className="py-20 px-6 sm:px-12" style={{ background: '#181510', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-[80px_1fr] gap-8 items-start">
          <div className="text-5xl font-black" style={{ color: '#2D9E4E', fontFamily: 'var(--font-heading)' }}>04</div>
          <div>
            <h2 className="text-2xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>New cards, all season</h2>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed mb-4">
              Packs keep dropping throughout the season — a free pack every week, a pre-season tranche to complete your squad, club code bonuses, a mid-season drop, and a Finals Challenge with its own packs and its own champion.
            </p>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">
              Unopened packs stack. Miss a week? Your cards wait for you.
            </p>
          </div>
        </div>
      </section>

      {/* Step 5 — Score & compete */}
      <section className="py-20 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-[80px_1fr] gap-8 items-start">
          <div className="text-5xl font-black" style={{ color: '#2D9E4E', fontFamily: 'var(--font-heading)' }}>05</div>
          <div>
            <h2 className="text-2xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Score points. Chase titles.</h2>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed mb-4">
              Every hit, run, steal, strikeout, and win in the real competition drives your fantasy score. Provisional scores land after the games; confirmed scores follow once the official stats are reviewed.
            </p>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">
              There's more than one way to win: the season-long ladder, weekly head-to-head matchups, the Weekly High Score, your club's Club Champion campaign, and the Finals Challenge. Late joiners always have something to play for.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 sm:px-12 text-center" style={{ background: '#1A2E1F', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Ready to play along?</h2>
          <a href="/nfs" className="inline-block rounded-full px-10 py-4 text-sm font-black uppercase tracking-widest text-[#141210] transition-all hover:opacity-90" style={{ background: '#E8D5A3' }}>
            Enter NFS Edition
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}