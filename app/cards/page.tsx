import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function Cards() {
  return (
    <main className="min-h-screen" style={{ background: '#141210' }}>
      <Nav />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 sm:px-12 overflow-hidden grain">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        {/* Grass silhouette layers */}
        <div className="grass-layer" style={{ zIndex: 1 }}>
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" style={{ width: '100%', height: '160px', display: 'block' }}>
            <g fill="#0E1B12" opacity="0.9">
              {Array.from({ length: 48 }).map((_, i) => {
                const x = i * 30 + (i % 3) * 8
                const h = 60 + ((i * 37) % 70)
                const lean = ((i * 13) % 14) - 7
                return <path key={i} className={i % 2 ? 'grass-blade' : 'grass-blade-alt'} style={{ animationDelay: `${(i % 7) * 0.4}s` }} d={`M${x} 160 Q ${x + lean} ${160 - h * 0.6} ${x + lean * 1.6} ${160 - h} Q ${x + lean + 4} ${160 - h * 0.55} ${x + 7} 160 Z`} />
              })}
            </g>
            <g fill="#16261A" opacity="0.95">
              {Array.from({ length: 36 }).map((_, i) => {
                const x = i * 40 + 12 + (i % 4) * 5
                const h = 40 + ((i * 53) % 50)
                const lean = ((i * 17) % 12) - 6
                return <path key={i} className={i % 2 ? 'grass-blade-alt' : 'grass-blade'} style={{ animationDelay: `${(i % 5) * 0.6}s` }} d={`M${x} 160 Q ${x + lean} ${160 - h * 0.6} ${x + lean * 1.5} ${160 - h} Q ${x + lean + 3} ${160 - h * 0.5} ${x + 6} 160 Z`} />
              })}
            </g>
          </svg>
        </div>

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
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>The Cards</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Play along with your favourite players.
          </h1>
          <p className="text-sm text-[#F5F1E8]/45 max-w-lg mx-auto leading-relaxed">
            Every player in the competition has a card. Your teammates. Your club legends. The young gun batting seventh. Collect them, select them, and ride every at-bat with them.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-24 px-6 sm:px-12" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] text-center mb-16" style={{ fontFamily: 'var(--font-heading)' }}>Four tiers. Earned on the field.</h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
            {[
              { tier: 'RARE · 2WP A', accent: '#FFD700', desc: 'The complete two-way players — they pitch AND hit at the top level. The rarest cards in the game, dealt only in Starter Packs.' },
              { tier: 'RARE · 2WP B', accent: '#E8D5A3', desc: 'Two-way pitchers whose value lives on the mound. Rare, specialist, and game-changing in the right matchup.' },
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

      {/* What's on a card */}
      <section className="py-24 px-6 sm:px-12" style={{ background: '#181510', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] mb-14" style={{ fontFamily: 'var(--font-heading)' }}>Every card tells a career.</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: 'Club colours', d: 'Every card wears its club — colours and identity front and centre.' },
              { t: 'Live stats', d: 'This season, last season, and career numbers — updated as the games are played.' },
              { t: 'Longevity badges', d: '100, 200, and 300+ career games recognised on the card, forever.' },
              { t: 'Positions', d: 'Where they play is what they score — position eligibility drives your lineup calls.' },
              { t: 'Speed stars', d: 'The competition\'s elite base-stealers carry a mark that smart managers hunt for.' },
              { t: 'Award recognition', d: 'Season awards and honours build a card\'s story — and its value.' },
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

      {/* CTA */}
      <section className="py-24 px-6 sm:px-12 text-center" style={{ background: '#1A2E1F', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Start your collection.</h2>
          <a href="/nfs" className="inline-block rounded-full px-10 py-4 text-sm font-black uppercase tracking-widest text-[#141210] transition-all hover:opacity-90" style={{ background: '#E8D5A3' }}>
            Enter NFS Edition
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}