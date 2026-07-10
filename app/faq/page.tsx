import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const groups = [
  {
    heading: 'Getting started',
    items: [
      {
        q: 'What is Grassroots Fantasy?',
        a: 'A fantasy league built on real local competitions. You collect digital player cards, build a squad, set a weekly lineup, and score points from real game results. The NFS Premier Softball League is our first live edition, endorsed by the Auckland Softball Association.',
      },
      {
        q: 'How do I register?',
        a: 'Online, with your email and a team name. If you play in the competition, access comes bundled with your Association registration. Supporters, family, and friends register free on the site. One account per person — and one account can hold teams in both the Men\'s and Women\'s competitions.',
      },
      {
        q: 'What is a club code?',
        a: 'A code your Team Manager or Club gives you. Enter it at signup and your team is locked to that club for the Club Champion race — plus you receive a bonus card pack. No code? No problem — you can still register and choose your club.',
      },
      {
        q: 'What\'s in the Starter Pack?',
        a: 'Twelve player cards, dealt the moment you register — including your two-way players, the rarest cards in the game and the only time they\'re dealt all season. Your starting lineup is auto-assigned instantly, so you can score points the very first weekend without touching a thing.',
      },
    ],
  },
  {
    heading: 'Playing the game',
    items: [
      {
        q: 'How does scoring work?',
        a: 'Every hit, run, RBI, steal, strikeout, win, and inning pitched in the real competition earns points for the managers who hold that player\'s card. Starters score full points, bench players score at a reduced rate, and reserves don\'t score. The full breakdown — point values, leaderboards, and how confirmed scores work — lives on the Scoring & Leaderboard page inside the NFS Premier Softball League.',
        link: { href: '/nfs/scoring', label: 'Scoring & Leaderboard →' },
      },
      {
        q: 'When do lineups lock?',
        a: 'Friday 4pm, before the weekend\'s games. Lineups reopen after results are confirmed. Your lineup choices are private until lock — then rosters go public and head-to-head matchups are revealed.',
      },
      {
        q: 'What if my player doesn\'t play?',
        a: 'Your bench steps up automatically — first positional match substitutes in. You\'re never punished for a coach\'s selection call. If no bench player fits, a reserve can be promoted at a reduced rate.',
      },
      {
        q: 'What are the ways to win?',
        a: 'The season-long ladder, weekly head-to-head matchups with their own standings, the Weekly High Score, your club\'s Club Champion campaign, and the Finals Challenge — a separate competition across the finals series with its own packs, its own roster, and its own champion.',
      },
      {
        q: 'What is the Finals Challenge?',
        a: 'When finals arrive, everyone gets a fresh pack of hitters from the teams still alive — a new pack every finals round. Pick five to score and one bench, name a Captain for double points, and chase the Finals Challenge title. Built so the role players shine, not just the stars.',
      },
      {
        q: 'I joined late. Can I still compete?',
        a: 'Yes. You can join any time in the season. The cumulative ladder rewards the full-season faithful, but head-to-head, Weekly High Score, Club Champion, and the Finals Challenge are all live targets no matter when you start.',
      },
    ],
  },
  {
    heading: 'Trust & who\'s behind it',
    items: [
      {
        q: 'How are players protected?',
        a: 'Scoring is built entirely on on-field statistics from official game records — never fan voting or popularity mechanics. Players under 18 appear only with written parent or guardian consent, with additional protections as standard. Any player — or the parent of any minor — can request removal at any time, actioned within 48 hours including historical data.',
      },
      {
        q: 'Who runs Grassroots Fantasy?',
        a: 'Grassroots Fantasy is a Black Diamond Labs platform, built in Auckland. The NFS League runs in partnership with the Auckland Softball Association, whose scorers provide the official statistics that power the game.',
      },
    ],
  },
]

export default function FAQ() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 sm:px-12 overflow-hidden grain" style={{ paddingTop: "130px", paddingBottom: "70px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />

        {/* Question-mark / field motif */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 600" fill="none">
          <g stroke="#3FBF63" strokeWidth="2">
            <path d="M120 180 Q120 130 170 130 Q220 130 220 175 Q220 210 170 220 L170 250" />
            <circle cx="170" cy="285" r="4" fill="#3FBF63" />
          </g>
          <g stroke="#E8D5A3" strokeWidth="2">
            <path d="M980 320 Q980 270 1030 270 Q1080 270 1080 315 Q1080 350 1030 360 L1030 390" />
            <circle cx="1030" cy="425" r="4" fill="#E8D5A3" />
          </g>
          <g stroke="#F5F1E8" strokeWidth="1.5">
            <path d="M880 120 L960 40 L1040 120" />
            <path d="M100 480 L180 400 L260 480" />
          </g>
        </svg>

        <div className="relative z-10 text-center" style={{ maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-sm font-black uppercase tracking-[0.35em] mb-5" style={{ color: '#2D9E4E' }}>FAQ</p>
          <h1 className="text-5xl sm:text-7xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>
            Good questions.<br/>Straight answers.
          </h1>
        </div>
      </section>

      <section className="pb-24 px-6 sm:px-12 flex-1">
        <div className="flex flex-col" style={{ maxWidth: "760px", marginLeft: "auto", marginRight: "auto", gap: "48px" }}>
          {groups.map((g) => (
            <div key={g.heading} className="flex flex-col gap-4">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#E8D5A3' }}>{g.heading}</h2>
              {g.items.map((f) => (
                <details key={f.q} className="group rounded-2xl overflow-hidden transition-colors open:border-[#2456E6]" style={{ background: '#181510', border: '1px solid #ffffff0a' }}>
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4" style={{ padding: "26px 28px" }}>
                    <span className="text-base font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{f.q}</span>
                    <span className="text-[#2D9E4E] font-black text-xl transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div style={{ padding: "0 28px 26px 28px" }}>
                    <p className="text-sm text-[#F5F1E8]/50 leading-relaxed">{f.a}</p>
                    {'link' in f && f.link && (
                      <a href={f.link.href} className="inline-block mt-4 text-sm font-black uppercase tracking-widest" style={{ color: '#3FBF63' }}>
                        {f.link.label}
                      </a>
                    )}
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 sm:px-12" style={{ background: '#1A2E1F', borderTop: '1px solid #ffffff08', paddingTop: "90px", paddingBottom: "100px", textAlign: "center" }}>
        <div style={{ maxWidth: "576px", marginLeft: "auto", marginRight: "auto" }}>
          <h2 className="text-2xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)', marginBottom: "36px" }}>Still curious?</h2>
          <a href="mailto:info@grassrootsfantasy.co.nz?subject=Grassroots%20Fantasy%20question"
            className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02]"
            style={{ color: '#E8D5A3', border: '1px solid #E8D5A3', background: 'transparent', padding: "22px 64px" }}>
            info@grassrootsfantasy.co.nz
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}
