import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen w-full" style={{ background: '#141210' }}>
      <Nav />

      {/* HERO */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "url('/hero-grass.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 65%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #141210E6 0%, #14121080 40%, #141210B3 75%, #141210 100%)' }} />

        <div className="relative z-10 w-full flex flex-col items-center px-6 pt-24 pb-16 text-center" style={{ maxWidth: "880px", marginLeft: "auto", marginRight: "auto" }}>

          <div className="opacity-0 animate-fade-up flex items-center justify-center gap-4 sm:gap-6 mb-12">
            <img src="/gf-mark.png" alt="" className="w-20 sm:w-28" style={{ filter: 'drop-shadow(0 8px 24px #00000090)' }} />
            <div className="text-left">
              <span className="block text-3xl sm:text-5xl font-bold tracking-wide leading-none" style={{ color: '#3FBF63', fontFamily: 'var(--font-heading)', textShadow: '0 2px 12px #00000080' }}>GRASSROOTS</span>
              <span className="block text-3xl sm:text-5xl font-black tracking-wider leading-none" style={{ color: '#F5F1E8', fontFamily: 'var(--font-wordmark)', fontStretch: '125%', textShadow: '0 2px 12px #00000080', marginTop: '6px' }}>FANTASY</span>
            </div>
          </div>

          <h1 className="opacity-0 animate-fade-up delay-1 text-4xl sm:text-6xl font-black leading-tight mb-8 text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>
            Play along with your <span style={{ color: '#3FBF63' }}>favourite players.</span>
          </h1>

          <p className="opacity-0 animate-fade-up delay-2 text-base sm:text-lg text-[#F5F1E8]/55 leading-relaxed max-w-2xl mx-auto mb-12">
            Grassroots Fantasy turns real local competitions into fantasy leagues. Collect player cards, build your squad, and score points from real results — built for the players, clubs, and communities of grassroots sport.
          </p>

          <div className="opacity-0 animate-fade-up delay-3 flex items-center justify-center" style={{ marginTop: "72px" }}>
            <a href="/how" className="text-base font-bold tracking-wide transition-all hover:scale-[1.02]" style={{ color: '#E8D5A3', border: '1px solid #E8D5A3', background: 'transparent', padding: "22px 64px" }}>
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* PLATFORM VALUE */}
      <section className="w-full py-32 sm:py-40" style={{ background: '#181510', borderTop: '1px solid #ffffff08' }}>
        <div className="w-full flex flex-col items-center text-center px-6" style={{ maxWidth: "1000px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-3xl sm:text-5xl font-black text-[#F5F1E8] mb-8 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Any sport. Any league.<br />Any number of teams.
          </h2>
          <p className="text-sm sm:text-base text-[#F5F1E8]/45 max-w-2xl mx-auto mb-20 leading-relaxed">
            If a competition keeps score, Grassroots Fantasy can run a league on it. Softball, rugby, netball, cricket, football — the platform adapts to any sport&apos;s stats, any season format, and any number of teams or grades.
          </p>

          <div className="grid gap-8 sm:grid-cols-3" style={{ maxWidth: "960px", marginLeft: "auto", marginRight: "auto", width: "100%" }}>
            {[
              { t: 'Built on real games', d: 'Every point scored comes from real results in your competition — nothing invented, nothing simulated.' },
              { t: 'Made for communities', d: 'Clubs, supporters, families, and old teammates playing along together — everyone gets closer to the game.' },
              { t: 'Players celebrated', d: 'Every player gets a card. Careers, milestones, and big weeks are recognised — not just the stars.' },
            ].map((f) => (
              <div key={f.t} className="rounded-3xl p-10 flex flex-col gap-5 items-center text-center" style={{ background: '#1A2E1F40', border: '1px solid #2D9E4E25' }}>
                <div className="h-1.5 w-12 rounded-full" style={{ background: '#2D9E4E' }} />
                <h3 className="text-xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h3>
                <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOW LIVE */}
      <section className="w-full py-32 sm:py-40" style={{ borderTop: '1px solid #ffffff08', marginTop: '4rem' }}>
        <div className="w-full px-6" style={{ maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }}>
          <div className="relative overflow-hidden rounded-[2.5rem] px-8 sm:px-16 text-center" style={{ background: 'linear-gradient(160deg, #1A2E1F 0%, #141210 100%)', border: '1px solid #2D9E4E30', paddingTop: "88px", paddingBottom: "88px" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-40 rounded-b-full" style={{ background: '#2D9E4E' }} />
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: '#2D9E4E' }} />
              <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#E8D5A3' }}>Now Live</p>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[#F5F1E8] mb-8 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              NFS Premier Softball League
            </h2>
            <p className="text-sm sm:text-base text-[#F5F1E8]/45 leading-relaxed" style={{ maxWidth: "420px", marginLeft: "auto", marginRight: "auto", marginBottom: "56px", textAlign: "center" }}>
              Our first league — built for the Northern Fastpitch Series with the Auckland Softball Association. Men&apos;s competition launching this season.
            </p>
            <a href="/nfs" className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]" style={{ color: '#4D7FFF', border: '1px solid #4D7FFF', background: 'transparent', padding: "22px 64px" }}>
              Enter NFS League
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
