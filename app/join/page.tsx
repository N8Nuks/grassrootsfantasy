import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Join() {
  return (
    <main className="min-h-screen" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 sm:px-12 overflow-hidden grain" style={{ paddingTop: "140px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>Join GF</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Bring your competition<br/>to Grassroots Fantasy.
          </h1>
          <p className="text-sm text-[#F5F1E8]/45 max-w-lg mx-auto leading-relaxed">
            If your competition keeps score, we can build a fantasy league around it — any sport, any format, any number of teams.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08', paddingTop: "80px" }}>
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {[
            { n: '01', t: 'Talk to us', d: 'Tell us about your competition — the sport, the season format, how stats are recorded today.' },
            { n: '02', t: 'We build your league', d: 'Player cards, scoring rules tuned to your sport, packs, leaderboards, and a season calendar matched to yours.' },
            { n: '03', t: 'Your community plays along', d: 'Players, supporters, families, and clubs collect, select, and compete — all season long.' },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl p-8 flex gap-6 items-start" style={{ background: '#181510', border: '1px solid #ffffff0a' }}>
              <span className="text-3xl font-black" style={{ color: '#2D9E4E', fontFamily: 'var(--font-heading)' }}>{s.n}</span>
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
          <h2 className="text-2xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Ready to talk?</h2>
          <a href="mailto:info@grassrootsfantasy.co.nz?subject=Bringing%20our%20competition%20to%20Grassroots%20Fantasy" className="text-sm font-semibold" style={{ color: '#E8D5A3' }}>
            info@grassrootsfantasy.co.nz →
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}
