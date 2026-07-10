import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const faqs = [
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
  {
    q: 'How does scoring work?',
    a: 'Every hit, run, RBI, steal, strikeout, win, and inning pitched in the real competition earns points for the managers who hold that player\'s card. Starters score full points, bench players score at a reduced rate, and reserves don\'t score. Provisional scores appear after the weekend\'s games; confirmed scores follow once official stats are reviewed — usually Tuesday.',
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
  {
    q: 'How are players protected?',
    a: 'Scoring is built entirely on on-field statistics from official game records — never fan voting or popularity mechanics. Players under 18 appear only with written parent or guardian consent, with additional protections as standard. Any player — or the parent of any minor — can request removal at any time, actioned within 48 hours including historical data.',
  },
  {
    q: 'Who runs Grassroots Fantasy?',
    a: 'Grassroots Fantasy is a Black Diamond Labs platform, built in Auckland. The NFS League runs in partnership with the Auckland Softball Association, whose scorers provide the official statistics that power the game.',
  },
]

export default function FAQ() {
  return (
    <main className="min-h-screen" style={{ background: '#141210' }}>
      <Nav />

      <section className="relative px-6 sm:px-12 overflow-hidden grain" style={{ paddingTop: "220px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>FAQ</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>
            Good questions.<br/>Straight answers.
          </h1>
        </div>
      </section>

      <section className="pb-24 px-6 sm:px-12">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl overflow-hidden" style={{ background: '#181510', border: '1px solid #ffffff0a' }}>
              <summary className="cursor-pointer list-none p-6 flex items-center justify-between gap-4">
                <span className="text-sm font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{f.q}</span>
                <span className="text-[#2D9E4E] font-black text-lg transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-6 pb-6 text-sm text-[#F5F1E8]/45 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="py-20 px-6 sm:px-12 text-center" style={{ background: '#1A2E1F', borderTop: '1px solid #ffffff08' }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-black text-[#F5F1E8] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Still curious?</h2>
          <a href="mailto:info@blackdiamondlabs.co.nz?subject=Grassroots%20Fantasy%20question" className="text-sm font-semibold" style={{ color: '#E8D5A3' }}>
            info@blackdiamondlabs.co.nz →
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}