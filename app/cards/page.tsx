import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Cards() {
  return (
    <main className="min-h-screen w-full" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 overflow-hidden" style={{ paddingTop: "140px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10 w-full flex flex-col items-center text-center" style={{ maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>The Cards</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Play along with your favourite players.
          </h1>
          <p className="text-sm sm:text-base text-[#F5F1E8]/45 max-w-lg mx-auto leading-relaxed">
            Every player in the competition has a card. Your teammates. Your club legends. The young gun batting seventh. Collect them, select them, and ride every at-bat with them.
          </p>
        </div>
      </section>

      <section className="w-full py-24" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="w-full flex flex-col items-center px-6" style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] text-center mb-16" style={{ fontFamily: 'var(--font-heading)' }}>Four tiers. Earned on the field.</h2>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 w-full">
            {[
              { tier: 'RARE 2WP A', accent: '#FFD700', desc: 'The complete two-way players — they pitch AND hit at the top level. The rarest cards in the game, dealt only in Starter Packs.' },
              { tier: 'RARE 2WP B', accent: '#E8D5A3', desc: 'Two-way pitchers whose value lives on the mound. Rare, specialist, and game-changing in the right matchup.' },
              { tier: 'ELITE', accent: '#C0C0C0', desc: 'The proven performers — season after season at the top of the stats. Silver treatment, serious points.' },
              { tier: 'COMMON', accent: '#2D9E4E', desc: 'The backbone of every club and every fantasy squad. Smart managers know: championships are won with great Commons.' },
            ].map((c) => (
              <div key={c.tier} className="rounded-3xl p-7 flex flex-col gap-4 items-center text-center" style={{ background: '#181510', border: `1px solid ${c.accent}35` }}>
                <span className="text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full" style={{ color: c.accent, background: c.accent + '15' }}>{c.tier}</span>
                <div className="w-24 h-36 rounded-xl flex items-end justify-center" style={{ background: `linear-gradient(180deg, ${c.accent}20, #141210)`, border: `1px solid ${c.accent}20` }}>
                  <svg width="56" height="76" viewBox="0 0 60 80" fill="none">
                    <circle cx="30" cy="22" r="12" fill="#ffffff14"/>
                    <path d="M8 80 C8 55 52 55 52 80 Z" fill="#ffffff14"/>
                  </svg>
                </div>
                <p className="text-[11px] text-[#F5F1E8]/40 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-24" style={{ background: '#181510', borderTop: '1px solid #ffffff08' }}>
        <div className="w-full flex flex-col items-center px-6 text-center" style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] mb-14" style={{ fontFamily: 'var(--font-heading)' }}>Every card tells a career.</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 w-full">
            {[
              { t: 'Club colours', d: 'Every card wears its club — colours and identity front and centre.' },
              { t: 'Live stats', d: 'This season, last season, and career numbers — updated as the games are played.' },
              { t: 'Longevity badges', d: '100, 200, and 300+ career games recognised on the card, forever.' },
              { t: 'Positions', d: 'Where they play is what they score — position eligibility drives your lineup calls.' },
              { t: 'Speed stars', d: 'The competition&apos;s elite base-stealers carry a mark that smart managers hunt for.' },
              { t: 'Award recognition', d: 'Season awards and honours build a card&apos;s story — and its value.' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl p-6 flex flex-col gap-2 items-center text-center" style={{ background: '#1A2E1F40', border: '1px solid #2D9E4E20' }}>
                <h3 className="text-sm font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h3>
                <p className="text-xs text-[#F5F1E8]/40 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#F5F1E8]/30 mt-12 italic">Full card designs revealed at launch.</p>
        </div>
      </section>

      <section className="w-full text-center" style={{ background: '#1A2E1F', borderTop: '1px solid #ffffff08', paddingTop: "110px", paddingBottom: "120px" }}>
        <div className="w-full px-6" style={{ maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-3xl font-black text-[#F5F1E8] mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Start your collection.</h2>
          <a href="/nfs" className="inline-block rounded-full px-14 py-5 text-base font-black uppercase tracking-widest text-white transition-all hover:opacity-90" style={{ background: '#0047AB' }}>
            Enter NFS League
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}