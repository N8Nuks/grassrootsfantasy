import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Scoring() {
  return (
    <main className="min-h-screen" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 sm:px-12 overflow-hidden grain" style={{ paddingTop: "140px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #16261C 0%, #141210 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#E8D5A3' }}>NFS Premier Softball League</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Scoring &amp; Leaderboard
          </h1>
          <p className="text-sm text-[#F5F1E8]/45 max-w-lg mx-auto leading-relaxed">
            Every point explained — how your players earn, how your squad scores, and how the leaderboards decide the champions.
          </p>
        </div>
      </section>

      <section className="pb-32 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08', paddingTop: "80px" }}>
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {[
            { t: 'Point values', d: 'Hits, runs, RBIs, steals, strikeouts, wins, innings pitched — the full scoring table for every stat.' },
            { t: 'How your squad scores', d: 'Starters, bench, reserves, and the specialist slots — what counts, and at what rate.' },
            { t: 'Provisional vs confirmed', d: 'Provisional scores land after the weekend. Confirmed scores follow official stat review — usually Tuesday.' },
            { t: 'The leaderboards', d: 'Season ladder, head-to-head standings, Weekly High Score, Club Champion, and the Finals Challenge.' },
          ].map((s) => (
            <div key={s.t} className="rounded-2xl p-8" style={{ background: '#181510', border: '1px solid #ffffff0a' }}>
              <h2 className="text-lg font-black text-[#F5F1E8] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{s.t}</h2>
              <p className="text-sm text-[#F5F1E8]/45 leading-relaxed">{s.d}</p>
            </div>
          ))}
          <p className="text-xs text-[#F5F1E8]/30 text-center italic mt-6">Full details published with the season launch.</p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
