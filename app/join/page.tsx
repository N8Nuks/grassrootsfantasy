import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Join() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 sm:px-12 overflow-hidden grain" style={{ paddingTop: "80px", paddingBottom: "90px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />

        {/* Sport shapes motif */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 600" fill="none">
          <g stroke="#3FBF63" strokeWidth="2">
            <circle cx="150" cy="160" r="34" />
            <path d="M128 138 Q150 152 128 182 M172 138 Q150 152 172 182" strokeWidth="1.5" />
          </g>
          <g stroke="#E8983A" strokeWidth="2">
            <circle cx="1050" cy="140" r="34" />
            <path d="M1050 106 V174 M1016 140 H1084" strokeWidth="1.5" />
          </g>
          <g stroke="#A0C4FF" strokeWidth="2">
            <circle cx="120" cy="460" r="34" />
            <path d="M120 442 L136 452 L130 470 H110 L104 452 Z" strokeWidth="1.5" />
          </g>
          <g stroke="#E8C15A" strokeWidth="2">
            <path d="M1010 420 L1060 380 L1110 420 L1060 460 Z" />
            <circle cx="1060" cy="420" r="5" />
          </g>
          <g stroke="#F5F1E8" strokeWidth="1.5">
            <path d="M560 60 h120 M560 84 h90 M560 108 h104" />
          </g>
        </svg>

        <div className="relative z-10 text-center" style={{ maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#E8C15A' }}>Join GF</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Bring your competition<br/>to Grassroots Fantasy.
          </h1>
          <p className="text-sm text-[#F5F1E8]/45 leading-relaxed" style={{ maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
            If your competition keeps score, we can build a fantasy league around it — any sport, any format, any number of teams.
          </p>
        </div>
      </section>

      <section className="px-6 sm:px-12 flex-1" style={{ borderTop: '1px solid #ffffff08', paddingTop: "90px", paddingBottom: "100px" }}>
        <div className="flex flex-col" style={{ maxWidth: "680px", marginLeft: "auto", marginRight: "auto", gap: "28px" }}>
          {[
            { n: '01', t: 'Talk to us', d: 'Tell us about your competition — the sport, the season format, how stats are recorded today.' },
            { n: '02', t: 'We build your league', d: 'Player cards, scoring rules tuned to your sport, packs, leaderboards, and a season calendar matched to yours.' },
            { n: '03', t: 'Your community plays along', d: 'Players, supporters, families, and clubs collect, select, and compete — all season long.' },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl flex gap-7 items-start" style={{ background: '#181510', border: '1px solid #ffffff0a', padding: "34px 36px" }}>
              <span className="text-4xl font-black leading-none" style={{ color: '#2D9E4E', fontFamily: 'var(--font-heading)' }}>{s.n}</span>
              <div>
                <h2 className="text-lg font-black text-[#F5F1E8] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{s.t}</h2>
                <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 sm:px-12" style={{ background: '#1A2E1F', borderTop: '1px solid #ffffff08', paddingTop: "90px", paddingBottom: "100px", textAlign: "center" }}>
        <div style={{ maxWidth: "576px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)', marginBottom: "36px" }}>Ready to talk?</h2>
          <a href="mailto:info@grassrootsfantasy.co.nz?subject=Bringing%20our%20competition%20to%20Grassroots%20Fantasy"
            className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]"
            style={{ color: '#E8C15A', border: '1px solid #E8C15A', background: 'transparent', padding: "22px 64px" }}>
            info@grassrootsfantasy.co.nz
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}
