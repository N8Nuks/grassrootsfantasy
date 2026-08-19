import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const GAMES = [
  { href: '/games/daily', title: 'Player of the Day', blurb: 'One NFS player, six guesses. A new clue every time you miss.', tag: 'Daily', accent: '#E8C15A' },
  { href: '/games/higher', title: 'Higher or Lower', blurb: 'Two players, one stat. Pick the bigger number and keep the run going.', tag: 'Endless', accent: '#2456E6' },
  { href: '/games/lineup', title: 'The Perfect Card', blurb: 'A fixed set of cards and a scored round. Find the highest legal lineup.', tag: 'Puzzle', accent: '#2D9E4E' },
  { href: '/games/batting', title: 'Batting Practice', blurb: 'Time your swing. See how far it goes.', tag: 'Arcade', accent: '#FF8C42' },
]

export default function Games() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />
      <section className="relative flex-1 px-5 sm:px-12 overflow-hidden" style={{ paddingTop: '76px', paddingBottom: '80px' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 45% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10" style={{ maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '44px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#E8C15A' }}>The Clubhouse</p>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Games</h1>
            <p className="text-sm text-white/70 leading-relaxed" style={{ maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
              Something to do between rounds. Nothing here counts toward your season — it&apos;s just for the love of it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {GAMES.map(g => (
              <a key={g.href} href={g.href}
                className="rounded-2xl transition-all hover:scale-[1.02] flex flex-col gap-3"
                style={{ background: '#121215', border: `1px solid ${g.accent}40`, boxShadow: `0 0 22px ${g.accent}12`, padding: '24px 22px' }}>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] self-start rounded-full"
                  style={{ color: g.accent, background: `${g.accent}18`, padding: '5px 12px' }}>{g.tag}</span>
                <h2 className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h2>
                <p className="text-xs text-white/65 leading-relaxed">{g.blurb}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}