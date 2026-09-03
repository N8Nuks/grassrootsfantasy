import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const GOLD = '#E8C15A'
const SILVER = '#4DA6FF'

/* The player policy. Written for players rather than lawyers — someone who
   wants off the platform should find the answer in one screen. */

const SECTIONS: { h: string; ps: string[] }[] = [
  {
    h: 'You can opt out at any time',
    ps: [
      'If you don\u2019t want a Grassroots Fantasy card, you don\u2019t have to have one. Email info@grassrootsfantasy.co.nz and say so.',
      'Your card is removed within 48 hours. You don\u2019t need to give a reason, and nobody will ask you to reconsider or try to talk you out of it.',
      'Removal means your card comes out of the game entirely \u2014 out of the player pool, out of anyone\u2019s squad, and out of every lineup. Your historical statistics stay in the competition\u2019s records, because those belong to the sport rather than to us.',
      'If you change your mind later, email again and we\u2019ll put you back.',
    ],
  },
  {
    h: 'Scoring reflects only what happens on the field',
    ps: [
      'Every point comes from an official statistic in a real game \u2014 hits, runs, steals, innings pitched, strikeouts. There is no fan voting, no popularity ranking, and no subjective rating of any player.',
      'Fantasy scoring must never influence how anyone plays or is selected. Players play for their teams. Coaches make the calls. We keep score.',
      'If an official statistic is corrected, the fantasy score is corrected with it.',
    ],
  },
  {
    h: 'Players under 18',
    ps: [
      'A player under 18 appears on Grassroots Fantasy only with written consent from a parent or guardian.',
      'Without that consent, no card is created. Consent can be withdrawn at any time by the parent, guardian, or the player, and the same 48-hour removal applies.',
    ],
  },
  {
    h: 'Photographs',
    ps: [
      'Player photographs are supplied by clubs, by players themselves, or taken by us at arranged sessions with the player\u2019s knowledge.',
      'We use photographs only on Grassroots Fantasy cards and platform pages. We don\u2019t sell them, license them to anyone else, or use them in advertising without asking first.',
      'If you want your photograph changed or removed, email us. A card without a photograph works exactly the same way.',
    ],
  },
  {
    h: 'It is free, and it is not gambling',
    ps: [
      'Grassroots Fantasy is free to play. There is no entry fee, no money staked, and no wagering of any kind.',
      'Prizes are gear and vouchers contributed by our partners. There is no cash prize and no way to bet on anything.',
    ],
  },
  {
    h: 'The records belong to the sport',
    ps: [
      'Match results, statistics and honours are the record of the competitions that produced them. We display that history; we don\u2019t claim ownership of it.',
      'Associations and competitions we work with can ask us to stop using their data at any time.',
    ],
  },
  {
    h: 'Who to contact',
    ps: [
      'Grassroots Fantasy is built and operated by Black Diamond Labs, an Auckland company.',
      'For anything on this page \u2014 opting out, photographs, consent, or a correction \u2014 email info@grassrootsfantasy.co.nz. We answer everything.',
    ],
  },
]

export default function Policy() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      <section className="px-5 sm:px-12" style={{ paddingTop: '84px', paddingBottom: '40px' }}>
        <div style={{ maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: GOLD, marginBottom: '16px' }}>
            Player policy
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: 'var(--font-heading)', marginBottom: '18px' }}>
            Your name, your call.
          </h1>
          <p className="text-sm text-white/70 leading-relaxed">
            Grassroots Fantasy puts real players on cards. That only works if the players are
            comfortable with it, so here is exactly where you stand — in plain words, on one page.
          </p>
        </div>
      </section>

      {/* The opt-out gets its own panel — it's the thing people come here for */}
      <section className="px-5 sm:px-12" style={{ paddingBottom: '40px' }}>
        <div style={{ maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="rounded-2xl" style={{ background: '#1A1A22', border: `1px solid ${GOLD}55`, padding: '28px 26px' }}>
            <p className="text-base font-black text-white" style={{ fontFamily: 'var(--font-heading)', marginBottom: '10px' }}>
              Want off? One email.
            </p>
            <p className="text-sm text-white/70 leading-relaxed" style={{ marginBottom: '18px' }}>
              No reason needed. Your card is down within 48 hours.
            </p>
            <a href="mailto:info@grassrootsfantasy.co.nz?subject=Opt%20out%20of%20Grassroots%20Fantasy"
              className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
              style={{ color: '#0D0D0F', background: GOLD, padding: '15px 30px', boxShadow: `0 0 22px ${GOLD}40` }}>
              Email us to opt out
            </a>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-12" style={{ paddingBottom: '72px' }}>
        <div className="flex flex-col" style={{ maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto', gap: '34px' }}>
          {SECTIONS.map(s => (
            <div key={s.h} style={{ borderLeft: `3px solid ${SILVER}55`, paddingLeft: '20px' }}>
              <h2 className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>
                {s.h}
              </h2>
              {s.ps.map((p, i) => (
                <p key={i} className="text-sm text-white/70 leading-relaxed" style={{ marginBottom: i < s.ps.length - 1 ? '12px' : '0' }}>
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  )
}
