import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Leagues() {
  return (
    <main className="min-h-screen w-full flex flex-col" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 overflow-hidden" style={{ paddingTop: "80px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />

        {/* Scoresheet / tactics board motif */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.07 }} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 600" fill="none">
          {/* scoresheet grid */}
          <g stroke="#F5F1E8" strokeWidth="1">
            <path d="M60 80 H520 M60 130 H520 M60 180 H520 M60 230 H520 M60 280 H520" />
            <path d="M60 80 V280 M175 80 V280 M290 80 V280 M405 80 V280 M520 80 V280" />
          </g>
          {/* diamond sketches in scoresheet cells */}
          <g stroke="#3FBF63" strokeWidth="1.5">
            <path d="M117 105 L137 125 L117 145 L97 125 Z" />
            <path d="M232 155 L252 175 L232 195 L212 175 Z" />
            <path d="M347 205 L367 225 L347 245 L327 225 Z" />
          </g>
          {/* tally marks */}
          <g stroke="#F5F1E8" strokeWidth="1.5">
            <path d="M440 100 v20 M448 100 v20 M456 100 v20 M464 100 v20 M436 122 l34 -22" />
          </g>
          {/* whiteboard play — Xs, Os, arrows */}
          <g stroke="#E8D5A3" strokeWidth="2">
            <circle cx="820" cy="140" r="12" />
            <circle cx="920" cy="220" r="12" />
            <path d="M760 300 l24 24 M784 300 l-24 24" />
            <path d="M880 320 l24 24 M904 320 l-24 24" />
            <path d="M832 148 C 870 170, 890 190, 908 210" strokeDasharray="6 6" />
            <path d="M772 296 C 810 260, 850 250, 908 232" strokeDasharray="6 6" />
            <path d="M902 216 l10 -2 -4 10" fill="none" />
          </g>
          {/* big sketched diamond right side */}
          <g stroke="#3FBF63" strokeWidth="2">
            <path d="M1000 460 L1080 380 L1160 460 L1080 540 Z" />
            <circle cx="1080" cy="460" r="6" />
          </g>
        </svg>

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

      <section className="w-full pb-32 px-6 flex-1">
        <div className="w-full grid gap-8 sm:grid-cols-2" style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>

          {/* NFS League — live */}
          <div className="group relative rounded-[2rem] p-10 flex flex-col gap-5 transition-all hover:scale-[1.01]" style={{ background: 'linear-gradient(160deg, #1A2E1F 0%, #141210 100%)', border: '1px solid #2D9E4E40', paddingTop: "48px" }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: '#2D9E4E' }} />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#E8D5A3', lineHeight: "1.6" }}>Now Live</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              NFS Premier<br/>Softball League
            </h2>
            <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">
              The Northern Fastpitch Series — Auckland premier softball, endorsed by the Auckland Softball Association. Men&apos;s launching this season.
            </p>
            <a href="/nfs" className="mt-auto text-center text-base font-bold tracking-wide transition-all hover:scale-[1.02]" style={{ color: '#4D7FFF', border: '1px solid #4D7FFF', background: 'transparent', padding: "22px 24px" }}>
              Enter NFS Premier Softball League
            </a>
          </div>

          {/* Your competition — invitation */}
          <div className="relative rounded-[2rem] p-10 flex flex-col gap-5" style={{ background: '#18151080', border: '1px dashed #F5F1E830', paddingTop: "48px" }}>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#F5F1E8]/40" style={{ lineHeight: "1.6" }}>Coming Soon</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8]/70 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Your competition<br/>here
            </h2>
            <p className="text-sm text-[#F5F1E8]/35 leading-relaxed">
              Run a league or association? Any sport, any format, any number of teams — Grassroots Fantasy can build a fantasy league around your competition.
            </p>
            <a href="/join" className="mt-auto rounded-full text-center font-black uppercase tracking-widest text-[#F5F1E8]/80 border border-[#F5F1E8]/30 hover:border-[#F5F1E8]/60 hover:text-[#F5F1E8] transition-all" style={{ padding: "20px 24px", fontSize: "14px", lineHeight: "1.4" }}>
              Join Grassroots Fantasy
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  )
}
