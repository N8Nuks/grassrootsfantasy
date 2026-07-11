import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const groups = [
  {
    title: 'The basics',
    items: [
      {
        q: 'What is Grassroots Fantasy?',
        a: 'A fantasy sports platform built for grassroots competitions — the leagues you actually play in and watch from the sideline. Real players from real local competitions become collectable cards, and their real weekend performances score points for your fantasy team.',
      },
      {
        q: 'Which sports and competitions are covered?',
        a: 'Grassroots Fantasy is built to host any sport, one league at a time. Each league is its own edition with its own cards, scoring, and season. Head to the Leagues page to see what\u2019s live and what\u2019s coming.',
      },
      {
        q: 'How do I join?',
        a: 'Register with your email, name your team, and enter a club code. Codes come through your club or competition — and every league has a general code so supporters without a club connection can play too.',
      },
      {
        q: 'What is a club code?',
        a: 'A code your club or competition shares that connects your fantasy team to them. It gets you your starter pack and counts your points toward your club\u2019s campaign on the club leaderboards.',
      },
    ],
  },
  {
    title: 'Playing the game',
    items: [
      {
        q: 'How do teams and cards work?',
        a: 'You build a squad of player cards — starters who score in full, a bench that scores reduced and covers absences, and reserves for depth. Cards arrive through packs: a starter pack when you register, a pre-season pack, and free packs through the season.',
      },
      {
        q: 'How does scoring work?',
        a: 'Every point comes from real events in real games — official stats only, never fan voting. Each league publishes its own point table on its league page, so you always know exactly what everything is worth.',
      },
      {
        q: 'What if one of my players doesn\u2019t play?',
        a: 'Your bench steps in automatically at full value, and your reserves back-fill the bench. Depth in the positions that matter is part of the craft — squads that plan for absences ride them out best.',
      },
      {
        q: 'When do I set my lineup?',
        a: 'Lineups open after each round\u2019s results are confirmed and lock before the next round starts. Set your card, order your lineup, and back your reads.',
      },
      {
        q: 'How many ways are there to win?',
        a: 'Several — a season-long ladder, head-to-head matchups, weekly high score, club champion, and finals competitions. One bad month doesn\u2019t end your season; there\u2019s always something to play for.',
      },
      {
        q: 'I\u2019m joining mid-season. Is it too late?',
        a: 'No. Head-to-head records start fresh from your first round, weekly prizes reset every week, and finals competitions start everyone level. The season ladder rewards the long haul, but plenty doesn\u2019t.',
      },
    ],
  },
  {
    title: 'Trust & the platform',
    items: [
      {
        q: 'How are the real players protected?',
        a: 'Scoring reflects only what happens on the field, cards celebrate rather than rank personalities, and any player can opt out of appearing, with removal honoured within 48 hours. Fantasy scoring must never influence how anyone plays — players play for their teams, coaches make the calls, we just keep score.',
      },
      {
        q: 'Who runs Grassroots Fantasy?',
        a: 'Grassroots Fantasy is built and operated by Black Diamond Labs, an Auckland-based technology company building platforms for grassroots sport and community organisations.',
      },
      {
        q: 'How do I get my competition on Grassroots Fantasy?',
        a: 'Get in touch — every edition starts with a conversation with the competition it covers. Email info@grassrootsfantasy.co.nz.',
      },
    ],
  },
]

export default function FAQ() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ paddingTop: "140px", paddingBottom: "70px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10 text-center" style={{ maxWidth: "700px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>FAQ</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Good questions.
          </h1>
          <p className="text-sm text-[#F5F1E8]/50">
            Platform-wide answers. Each league\u2019s page carries its own specifics — packs, point tables, and season dates.
          </p>
        </div>
      </section>

      <section className="flex-1 px-6 sm:px-12" style={{ paddingBottom: "100px" }}>
        <div style={{ maxWidth: "700px", marginLeft: "auto", marginRight: "auto" }}>
          {groups.map(g => (
            <div key={g.title} style={{ marginBottom: "48px" }}>
              <h2 className="text-xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h2>
              <div className="flex flex-col gap-3">
                {g.items.map(item => (
                  <details key={item.q} className="group rounded-xl overflow-hidden" style={{ background: '#181510', border: '1px solid #ffffff10' }}>
                    <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4">
                      <span className="text-sm font-bold text-[#F5F1E8]">{item.q}</span>
                      <span className="text-[#3FBF63] text-lg font-black shrink-0 transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="px-6 pb-5 text-sm leading-relaxed text-[#F5F1E8]/55">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  )
}
