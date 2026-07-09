export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A14] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-4 bg-[#0A0A14]/90 backdrop-blur-md border-b border-white/5">
        <a href="/" className="flex items-center gap-3">
          <img src="/gf-logo.jpg" alt="Grassroots Fantasy" className="h-9 w-auto rounded" />
        </a>
        <div className="flex items-center gap-6 sm:gap-10">
          <a href="#how" className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors hidden sm:block">How it works</a>
          <a href="#cards" className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors hidden sm:block">Cards</a>
          <a href="#register" className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #2D9E4E, #1F7A3A)' }}>
            Register Interest
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 40%, #10241a 0%, #0A0A14 70%)' }} />

        {[
          { top: '22%', left: '15%', d: '0s' }, { top: '18%', left: '80%', d: '1.1s' },
          { top: '70%', left: '10%', d: '0.5s' }, { top: '65%', left: '85%', d: '1.7s' },
          { top: '38%', left: '92%', d: '0.3s' }, { top: '82%', left: '55%', d: '2.1s' },
        ].map((dot, i) => (
          <div key={i} className="absolute h-1 w-1 rounded-full animate-pulse-soft" style={{ top: dot.top, left: dot.left, backgroundColor: i % 2 ? '#2D9E4E' : '#A0C4FF', animationDelay: dot.d }} />
        ))}

        <div className="relative z-10 flex flex-col items-center max-w-3xl mx-auto pt-20">
          <div className="opacity-0 animate-fade-up">
            <img src="/gf-logo.jpg" alt="Grassroots Fantasy — NFS Edition" className="w-72 sm:w-96 rounded-2xl mb-10" />
          </div>

          <div className="opacity-0 animate-fade-up delay-1">
            <p className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>
              NFS Edition · Endorsed by the Auckland Softball Association
            </p>
          </div>

          <div className="opacity-0 animate-fade-up delay-2">
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-6">
              Built for the game <span className="shimmer-ice">you love.</span>
            </h1>
          </div>

          <div className="opacity-0 animate-fade-up delay-3">
            <p className="text-base text-white/45 leading-relaxed max-w-md mx-auto mb-10">
              The free fantasy league for the Northern Fastpitch Series. Collect player cards, build your squad, and score points from real game results — every week, all season.
            </p>
          </div>

          <div className="opacity-0 animate-fade-up delay-4 flex flex-col sm:flex-row items-center gap-4">
            <a href="#register" className="rounded-xl px-10 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #2D9E4E, #1F7A3A)' }}>
              Register Interest
            </a>
            <a href="#how" className="text-sm font-semibold text-white/40 hover:text-white transition-colors">
              How it works ↓
            </a>
          </div>

          <div className="opacity-0 animate-fade-up delay-4 mt-12 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: '#2D9E4E' }} />
              <span className="text-xs text-white/40 uppercase tracking-wider">Men's — Launching this season</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#A0C4FF' }} />
              <span className="text-xs text-white/40 uppercase tracking-wider">Women's — Pending</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 sm:px-12" style={{ background: '#0D0D1A', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3 text-center" style={{ color: '#2D9E4E' }}>How it works</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-16">Four steps. Zero cost.</h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', t: 'Register', d: 'Scan a QR code at the ground or sign up online. Free, always.' },
              { n: '02', t: 'Open your pack', d: '12 player cards land instantly — your starting squad, ready to go.' },
              { n: '03', t: 'Set your lineup', d: 'Pick your best 15 each week before Friday 4pm lock.' },
              { n: '04', t: 'Score points', d: 'Real NFS results drive your score. Climb the ladder all season.' },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-white/8 bg-white/[0.03] p-7 flex flex-col gap-4">
                <span className="text-xs font-black text-white/20">{step.n}</span>
                <div className="h-px w-8" style={{ backgroundColor: '#2D9E4E80' }} />
                <h3 className="text-base font-black text-white">{step.t}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cards teaser */}
      <section id="cards" className="py-24 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: '#2D9E4E' }}>The Cards</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">Every player. Every stat. <span className="shimmer-ice">Every card.</span></h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto mb-16">
            Every NFS Premier player has a digital card — club colours, career stats, longevity badges, and rarity tiers earned on the field. Rare two-way players. Elite performers. The backbone Commons. Collect them all through packs across the season.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            {[
              { tier: 'RARE · 2WP', border: '#FFD700', label: 'Two-Way Player', desc: 'Pitches AND hits. The rarest cards in the game.' },
              { tier: 'ELITE', border: '#C0C0C0', label: 'Elite Performer', desc: 'Top of the stats. Silver treatment.' },
              { tier: 'COMMON', border: '#2D9E4E', label: 'Club Backbone', desc: 'Every squad is built on them.' },
            ].map((card) => (
              <div key={card.tier} className="w-52 rounded-2xl p-6 flex flex-col items-center gap-3" style={{ background: '#12121F', border: `1px solid ${card.border}50` }}>
                <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full" style={{ color: card.border, background: card.border + '15' }}>{card.tier}</span>
                <div className="w-24 h-32 rounded-lg flex items-end justify-center" style={{ background: `linear-gradient(180deg, ${card.border}18, #0A0A14)` }}>
                  <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
                    <circle cx="30" cy="22" r="12" fill="#ffffff12"/>
                    <path d="M8 80 C8 55 52 55 52 80 Z" fill="#ffffff12"/>
                  </svg>
                </div>
                <h3 className="text-sm font-black text-white">{card.label}</h3>
                <p className="text-[11px] text-white/35 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Register interest */}
      <section id="register" className="py-24 px-6 sm:px-12" style={{ background: '#0D0D1A', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: '#2D9E4E' }}>Season launch</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">Be first in when packs drop.</h2>
          <p className="text-sm text-white/40 mb-10">
            Registration opens with the season. Leave your email and you'll get your Starter Pack link the moment we go live.
          </p>
          <a href="mailto:info@blackdiamondlabs.co.nz?subject=Grassroots%20Fantasy%20—%20Register%20my%20interest"
            className="inline-block rounded-xl px-12 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2D9E4E, #1F7A3A)' }}>
            Register Interest
          </a>
          <p className="text-[11px] text-white/25 mt-6">Free to play. No payment details, ever. Players under 18 appear only with parent/guardian consent.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-12 py-8" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/gf-logo.jpg" alt="Grassroots Fantasy" className="h-7 w-auto rounded" />
          <a href="https://blackdiamondlabs.co.nz" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            A Black Diamond Labs platform
          </a>
          <a href="mailto:info@blackdiamondlabs.co.nz" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            info@blackdiamondlabs.co.nz
          </a>
        </div>
      </footer>

    </main>
  )
}
