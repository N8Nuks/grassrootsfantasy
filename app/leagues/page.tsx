import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Leagues() {
  return (
    <main className="min-h-screen w-full" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 overflow-hidden" style={{ paddingTop: "220px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10 w-full flex flex-col items-center text-center" style={{ maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>Leagues</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Every competition.<br/>Its own league.
          </h1>
          <p className="text-sm sm:text-base text-[#F5F1E8]/45 max-w-lg mx-auto leading-relaxed">
            Each Grassroots Fantasy league is built for a real competition — its players, its clubs, its season. Pick your league, or bring your competition on board.
          </p>
        </div>
      </section>

      <section className="w-full pb-32 px-6">
        <div className="w-full grid gap-8 sm:grid-cols-2" style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>

          {/* NFS League — live */}
          <a href="/nfs" className="group relative overflow-hidden rounded-[2rem] p-10 flex flex-col gap-5 transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(160deg, #1A2E1F 0%, #141210 100%)', border: '1px solid #2D9E4E40' }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: '#2D9E4E' }} />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#E8D5A3' }}>Now Live</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              NFS Premier<br/>Softball League
            </h2>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">
              The Northern Fastpitch Series — Auckland premier softball, endorsed by the Auckland Softball Association. Men&apos;s launching this season.
            </p>
            <span className="mt-auto text-sm font-black uppercase tracking-widest transition-colors" style={{ color: '#3FBF63' }}>
              Enter league →
            </span>
          </a>

          {/* Your competition — invitation */}
          <div className="relative overflow-hidden rounded-[2rem] p-10 flex flex-col gap-5" style={{ background: '#18151080', border: '1px dashed #F5F1E830' }}>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#F5F1E8]/40">Coming Soon</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8]/70 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Your competition<br/>here
            </h2>
            <p className="text-sm text-[#F5F1E8]/35 leading-relaxed">
              Run a league or association? Any sport, any format, any number of teams — Grassroots Fantasy can build a fantasy league around your competition.
            </p>
            <a href="mailto:info@blackdiamondlabs.co.nz?subject=Grassroots%20Fantasy%20—%20Our%20competition" className="mt-auto text-sm font-black uppercase tracking-widest text-[#E8D5A3] hover:opacity-80 transition-opacity">
              Get in touch →
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  )
}
