import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const sports = [
  {
    sport: 'SOFTBALL',
    accent: '#3FBF63',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="16" stroke="#3FBF63" strokeWidth="2"/>
        <path d="M12 12 Q22 18 12 32 M32 12 Q22 18 32 32" stroke="#3FBF63" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    sport: 'BASKETBALL',
    accent: '#E8983A',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="16" stroke="#E8983A" strokeWidth="2"/>
        <path d="M22 6 V38 M6 22 H38 M10 10 Q22 22 34 34 M34 10 Q22 22 10 34" stroke="#E8983A" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    sport: 'SOCCER',
    accent: '#A0C4FF',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="16" stroke="#A0C4FF" strokeWidth="2"/>
        <path d="M22 14 L29 19 L26 27 H18 L15 19 Z" stroke="#A0C4FF" strokeWidth="1.5"/>
        <path d="M22 6 V14 M15 19 L8 16 M29 19 L36 16 M18 27 L13 34 M26 27 L31 34" stroke="#A0C4FF" strokeWidth="1.5"/>
      </svg>
    ),
  },
]

export default function Cards() {
  return (
    <main className="min-h-screen w-full" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 overflow-hidden" style={{ paddingTop: "140px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />

        {/* Card-fan motif */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 600" fill="none">
          <g stroke="#F5F1E8" strokeWidth="1.5">
            <rect x="80" y="120" width="120" height="180" rx="12" transform="rotate(-12 140 210)" />
            <rect x="150" y="100" width="120" height="180" rx="12" transform="rotate(-2 210 190)" />
            <rect x="220" y="110" width="120" height="180" rx="12" transform="rotate(9 280 200)" />
          </g>
          <g stroke="#3FBF63" strokeWidth="1.5">
            <rect x="880" y="300" width="120" height="180" rx="12" transform="rotate(8 940 390)" />
            <rect x="960" y="280" width="120" height="180" rx="12" transform="rotate(18 1020 370)" />
          </g>
        </svg>

        <div className="relative z-10 w-full flex flex-col items-center text-center" style={{ maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>The Cards</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Play along with your favourite players.
          </h1>
          <p className="text-sm sm:text-base text-[#F5F1E8]/45 max-w-lg mx-auto leading-relaxed">
            Every player in the competition has a card. Your teammates. Your club legends. The young gun hitting ninth. Collect them, select them, and ride every at-bat with them.
          </p>
        </div>
      </section>

      {/* One platform, every sport */}
      <section className="w-full py-24" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="w-full flex flex-col items-center px-6" style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] text-center mb-5" style={{ fontFamily: 'var(--font-heading)' }}>One platform. Every sport.</h2>
          <p className="text-sm text-[#F5F1E8]/45 text-center leading-relaxed mb-16" style={{ maxWidth: "520px" }}>
            Cards are the heart of every Grassroots Fantasy league — whatever the code. Each sport gets its own card design, its own stats, and its own stars.
          </p>

          <div className="grid gap-8 sm:grid-cols-3 w-full" style={{ maxWidth: "760px" }}>
            {sports.map((s) => (
              <div key={s.sport} className="rounded-3xl p-8 flex flex-col gap-5 items-center text-center" style={{ background: '#181510', border: `1px solid ${s.accent}30` }}>
                <div className="w-28 h-40 rounded-xl flex flex-col items-center justify-center gap-3" style={{ background: `linear-gradient(180deg, ${s.accent}18, #141210)`, border: `1px solid ${s.accent}25` }}>
                  {s.icon}
                  <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: s.accent }}>{s.sport}</span>
                </div>
                <p className="text-[11px] text-[#F5F1E8]/40 leading-relaxed">
                  {s.sport === 'SOFTBALL' && 'Live now — the NFS Premier Softball League.'}
                  {s.sport === 'BASKETBALL' && 'Built for hoops — points, boards, assists, and steals.'}
                  {s.sport === 'SOCCER' && 'Built for football — goals, assists, and clean sheets.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Universal tiers */}
      <section className="w-full py-24" style={{ background: '#181510', borderTop: '1px solid #ffffff08' }}>
        <div className="w-full flex flex-col items-center px-6" style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] text-center mb-5" style={{ fontFamily: 'var(--font-heading)' }}>Three tiers. Earned on the field.</h2>
          <p className="text-sm text-[#F5F1E8]/45 text-center leading-relaxed mb-16" style={{ maxWidth: "520px" }}>
            Every league runs on the same tier system — and each competition adds its own special Rare cards on top. In softball, that's the two-way players.
          </p>

          <div className="grid gap-8 sm:grid-cols-3 w-full" style={{ maxWidth: "860px" }}>
            {[
              { tier: 'RARE', accent: '#FFD700', desc: 'The rarest cards in every league — the players who change games, dealt only in Starter Packs.' },
              { tier: 'ELITE', accent: '#C0C0C0', desc: 'The proven performers — season after season at the top of the stats. Silver treatment, serious points.' },
              { tier: 'COMMON', accent: '#2D9E4E', desc: 'The backbone of every club and every fantasy squad. Smart managers know: championships are won with great Commons.' },
            ].map((c) => (
              <div key={c.tier} className="rounded-3xl p-7 flex flex-col gap-4 items-center text-center" style={{ background: '#141210', border: `1px solid ${c.accent}35` }}>
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
          <p className="text-xs text-[#F5F1E8]/30 mt-12 italic">See the NFS Premier Softball League tiers — including the two-way Rares — <a href="/nfs" className="underline" style={{ color: '#3FBF63' }}>inside the league</a>.</p>
        </div>
      </section>

      {/* Card anatomy */}
      <section className="w-full py-24" style={{ borderTop: '1px solid #ffffff08' }}>
        <div className="w-full flex flex-col items-center px-6 text-center" style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F1E8] mb-14" style={{ fontFamily: 'var(--font-heading)' }}>Every card tells a career.</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 w-full">
            {[
              { t: 'Club colours', d: 'Every card wears its club — colours and identity front and centre.' },
              { t: 'Live stats', d: 'This season, last season, and career numbers — updated as the games are played.' },
              { t: 'Longevity badges', d: 'Career milestones recognised on the card, forever.' },
              { t: 'Positions', d: 'Where they play is what they score — position eligibility drives your lineup calls.' },
              { t: 'Specialist marks', d: 'Elite skills carry a mark that smart managers hunt for.' },
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

      {/* CTA */}
      <section className="relative w-full text-center overflow-hidden" style={{ background: 'linear-gradient(180deg, #16261C 0%, #1A2E1F 100%)', borderTop: '1px solid #ffffff08', paddingTop: "130px", paddingBottom: "120px" }}>
        <svg className="absolute top-0 left-0 w-full" height="60" preserveAspectRatio="none" viewBox="0 0 1200 60" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0 L0 12 Q10 4 14 22 Q22 6 28 26 Q34 2 42 20 Q50 8 56 28 Q64 4 70 18 Q78 10 86 30 Q92 2 100 22 Q108 8 114 26 Q122 4 130 20 Q138 12 144 32 Q152 6 160 24 Q168 10 174 28 Q182 2 190 18 Q198 8 206 26 Q214 4 222 22 Q230 12 236 30 Q244 6 252 20 Q260 10 266 28 Q274 2 282 24 Q290 8 298 18 Q306 4 314 26 Q322 12 330 22 Q338 6 346 30 Q354 10 360 20 Q368 2 376 28 Q384 8 392 24 Q400 4 408 18 Q416 12 424 26 Q432 6 440 22 Q448 10 456 30 Q464 2 472 20 Q480 8 488 28 Q496 4 504 24 Q512 12 520 18 Q528 6 536 26 Q544 10 552 22 Q560 2 568 30 Q576 8 584 20 Q592 4 600 28 Q608 12 616 24 Q624 6 632 18 Q640 10 648 26 Q656 2 664 22 Q672 8 680 30 Q688 4 696 20 Q704 12 712 28 Q720 6 728 24 Q736 10 744 18 Q752 2 760 26 Q768 8 776 22 Q784 4 792 30 Q800 12 808 20 Q816 6 824 28 Q832 10 840 24 Q848 2 856 18 Q864 8 872 26 Q880 4 888 22 Q896 12 904 30 Q912 6 920 20 Q928 10 936 28 Q944 2 952 24 Q960 8 968 18 Q976 4 984 26 Q992 12 1000 22 Q1008 6 1016 30 Q1024 10 1032 20 Q1040 2 1048 28 Q1056 8 1064 24 Q1072 4 1080 18 Q1088 12 1096 26 Q1104 6 1112 22 Q1120 10 1128 30 Q1136 2 1144 20 Q1152 8 1160 28 Q1168 4 1176 24 Q1184 12 1192 18 L1200 26 L1200 0 Z" fill="#141210" />
        </svg>

        <div className="relative z-10 w-full px-6" style={{ maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-3xl font-black text-[#F5F1E8] mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Start your collection.</h2>
          <a href="/leagues" className="inline-block rounded-full px-14 py-5 text-base font-black uppercase tracking-widest text-white transition-all hover:opacity-90" style={{ background: '#0047AB', boxShadow: '0 8px 32px #0047AB50' }}>
            Enter Leagues
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}
