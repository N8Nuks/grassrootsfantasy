import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: '#141210' }}>
      <Nav />

      {/* Hero — the brand */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center overflow-hidden grain">
        <div className="absolute inset-0" style={{ backgroundImage: "url('/hero-grass.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 65%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #141210E6 0%, #14121080 40%, #141210B3 75%, #141210 100%)' }} />

        {/* Drifting motes */}
        {[
          { left: '12%', size: 3, delay: '0s' },
          { left: '28%', size: 2, delay: '3.5s' },
          { left: '47%', size: 3, delay: '7s' },
          { left: '63%', size: 2, delay: '1.8s' },
          { left: '78%', size: 3, delay: '5.2s' },
          { left: '90%', size: 2, delay: '8.6s' },
        ].map((m, i) => (
          <span key={i} className="mote" style={{ left: m.left, width: m.size, height: m.size, animationDelay: m.delay }} />
        ))}

        <div className="relative z-10 flex flex-col items-center max-w-3xl mx-auto pt-24 pb-16">
          <div className="opacity-0 animate-fade-up">
            <img src="/gf-logo.jpg" alt="Grassroots Fantasy" className="w-64 sm:w-80 rounded-2xl mb-10 shadow-2xl" />
          </div>

          <div className="opacity-0 animate-fade-up delay-1">
            <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-6 text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>
              Play along with your <span style={{ color: '#2D9E4E' }}>favourite players.</span>
            </h1>
          </div>

          <div className="opacity-0 animate-fade-up delay-2">
            <p className="text-base sm:text-lg text-[#F5F1E8]/50 leading-relaxed max-w-xl mx-auto mb-10">
              Grassroots Fantasy turns real local competitions into fantasy leagues. Collect player cards, build your squad, and score points from real results — built for the players, clubs, and communities of grassroots sport.
            </p>
          </div>

          <div className="opacity-0 animate-fade-up delay-3 flex flex-col sm:flex-row items-center gap-4">
            <a href="/nfs" className="rounded-full px-10 py-4 text-sm font-black uppercase tracking-widest text-[#141210] transition-all hover:opacity-90" style={{ background: '#E8D5A3' }}>
              Explore NFS Edition
            </a>
            <a href="/how" className="text-sm font-semibold text-[#F5F1E8]/40 hover:text-[#F5F1E8] transition-colors">
              How it works →
            </a>
          </div>
        </div>
      </section>

      {/* Any sport, any league */}
      <section className="py-28 px-6 sm:px-12" style={{ background: '#181510', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>The Platform</p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Any sport. Any league.<br/>Any number of teams.
          </h2>
          <p className="text-sm text-[#F5F1E8]/45 max-w-xl mx-auto mb-16 leading-relaxed">
            If a competition keeps score, Grassroots Fantasy can run a league on it. Softball, rugby, netball, cricket, football — the platform adapts to any sport's stats, any season format, and any number of teams or grades.
          </p>

          <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {[
              { t: 'Built on real games', d: 'Every point scored comes from real results in your competition — nothing invented, nothing simulated.' },
              { t: 'Made for communities', d: 'Clubs, supporters, families, and old teammates playing along together — everyone gets closer to the game.' },
              { t: 'Players celebrated', d: 'Every player gets a card. Careers, milestones, and big weeks are recognised — not just the stars.' },
            ].map((f) => (
              <div key={f.t} className="rounded-3xl p-8 flex flex-col gap-4 items-center text-center" style={{ background: '#1A2E1F40', border: '1px solid #2D9E4E25' }}>
                <div className="h-1.5 w-10 rounded-full" style={{ background: '#2D9E4E' }} />
                <h3 className="text-lg font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h3>
                <p className="text-xs text-[#F5F1E8]/40 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live edition strip */}
      <section className="py-28 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#E8D5A3' }}>Now Live</p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            NFS Premier Softball Edition
          </h2>
          <p className="text-sm text-[#F5F1E8]/45 max-w-lg mx-auto mb-10 leading-relaxed">
            Our first edition — built for the Northern Fastpitch Series with the Auckland Softball Association. Men's competition launching this season.
          </p>
          <a href="/nfs" className="inline-block rounded-full px-10 py-4 text-sm font-black uppercase tracking-widest transition-all hover:opacity-90" style={{ background: '#2D9E4E', color: '#F5F1E8' }}>
            Enter NFS Edition
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}
