import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function How() {
  return (
    <main className="min-h-screen" style={{ background: '#141210' }}>
      <Nav />

      {/* Hero */}
      <section className="relative px-6 sm:px-12 overflow-hidden grain" style={{ paddingTop: "140px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />

        {/* Field-line motif */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 600" fill="none">
          <g stroke="#3FBF63" strokeWidth="2">
            <path d="M100 520 L400 220 L700 520" />
            <path d="M400 220 L400 520" strokeDasharray="8 8" />
            <circle cx="400" cy="400" r="50" />
          </g>
          <g stroke="#E8D5A3" strokeWidth="2">
            <path d="M850 480 L1050 280 L1250 480" />
            <circle cx="1050" cy="420" r="34" strokeDasharray="6 6" />
          </g>
          <g stroke="#F5F1E8" strokeWidth="1.5">
            <path d="M60 120 h180 M60 150 h140 M60 180 h160" />
          </g>
        </svg>

        <div className="relative z-10" style={{ maxWidth: "720px", marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>How it works</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Your squad. Your calls.<br/>Real results.
          </h1>
          <p className="text-sm text-[#F5F1E8]/45 leading-relaxed" style={{ maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
            Grassroots Fantasy is simple to start and rewarding to master. Here's the full journey — from signup to the top of the ladder.
          </p>
        </div>
      </section>

      {/* Step 1 — Register */}
      <section className="py-20 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="grid sm:grid-cols-[90px_1fr] gap-8 items-start px-6" style={{ maxWidth: "860px", marginLeft: "auto", marginRight: "auto" }}>
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
        <div className="grid sm:grid-cols-[90px_1fr] gap-8 items-start px-6" style={{ maxWidth: "860px", marginLeft: "auto", marginRight: "auto" }}>
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
        <div className="grid sm:grid-cols-[90px_1fr] gap-8 items-start px-6" style={{ maxWidth: "860px", marginLeft: "auto", marginRight: "auto" }}>
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
        <div className="grid sm:grid-cols-[90px_1fr] gap-8 items-start px-6" style={{ maxWidth: "860px", marginLeft: "auto", marginRight: "auto" }}>
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
        <div className="grid sm:grid-cols-[90px_1fr] gap-8 items-start px-6" style={{ maxWidth: "860px", marginLeft: "auto", marginRight: "auto" }}>
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
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ background: 'linear-gradient(180deg, #16261C 0%, #1A2E1F 100%)', borderTop: '1px solid #ffffff08', paddingTop: "130px", paddingBottom: "120px", textAlign: "center" }}>
        {/* Grass blade strip along the top */}
        <svg className="absolute top-0 left-0 w-full" height="60" preserveAspectRatio="none" viewBox="0 0 1200 60" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0 L0 12 Q10 4 14 22 Q22 6 28 26 Q34 2 42 20 Q50 8 56 28 Q64 4 70 18 Q78 10 86 30 Q92 2 100 22 Q108 8 114 26 Q122 4 130 20 Q138 12 144 32 Q152 6 160 24 Q168 10 174 28 Q182 2 190 18 Q198 8 206 26 Q214 4 222 22 Q230 12 236 30 Q244 6 252 20 Q260 10 266 28 Q274 2 282 24 Q290 8 298 18 Q306 4 314 26 Q322 12 330 22 Q338 6 346 30 Q354 10 360 20 Q368 2 376 28 Q384 8 392 24 Q400 4 408 18 Q416 12 424 26 Q432 6 440 22 Q448 10 456 30 Q464 2 472 20 Q480 8 488 28 Q496 4 504 24 Q512 12 520 18 Q528 6 536 26 Q544 10 552 22 Q560 2 568 30 Q576 8 584 20 Q592 4 600 28 Q608 12 616 24 Q624 6 632 18 Q640 10 648 26 Q656 2 664 22 Q672 8 680 30 Q688 4 696 20 Q704 12 712 28 Q720 6 728 24 Q736 10 744 18 Q752 2 760 26 Q768 8 776 22 Q784 4 792 30 Q800 12 808 20 Q816 6 824 28 Q832 10 840 24 Q848 2 856 18 Q864 8 872 26 Q880 4 888 22 Q896 12 904 30 Q912 6 920 20 Q928 10 936 28 Q944 2 952 24 Q960 8 968 18 Q976 4 984 26 Q992 12 1000 22 Q1008 6 1016 30 Q1024 10 1032 20 Q1040 2 1048 28 Q1056 8 1064 24 Q1072 4 1080 18 Q1088 12 1096 26 Q1104 6 1112 22 Q1120 10 1128 30 Q1136 2 1144 20 Q1152 8 1160 28 Q1168 4 1176 24 Q1184 12 1192 18 L1200 26 L1200 0 Z" fill="#141210" />
        </svg>

        <div className="relative z-10" style={{ maxWidth: "576px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-3xl font-black text-[#F5F1E8] mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Ready to play along?</h2>
          <a href="/leagues" className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]" style={{ color: '#39FF6A', border: '1px solid #39FF6A', background: 'transparent', padding: "22px 64px", textShadow: '0 0 12px #39FF6A80', boxShadow: '0 0 16px #39FF6A30, inset 0 0 16px #39FF6A15' }}>
            Enter Leagues Now
          </a>  
        </div>
      </section>

      <Footer />
    </main>
  )
}
