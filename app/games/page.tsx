import Footer from '@/components/Footer'
import ViewTicker from '@/components/ViewTicker'

const GAMES = [
  { href: '/games/daily', n: '01', title: 'Player of the Day', blurb: 'One player. Six guesses. A clue for every miss.', tag: 'Daily', neon: '#FF2D95' },
  { href: '/games/higher', n: '02', title: 'Higher or Lower', blurb: 'Two cards, one stat. Keep the run alive.', tag: 'Endless', neon: '#00F0FF' },
  { href: '/games/lineup', n: '03', title: 'The Perfect Card', blurb: 'Sixteen cards, twelve slots, one best answer.', tag: 'Puzzle', neon: '#C6FF00' },
  { href: '/games/snake', n: '04', title: 'Diamond Snake', blurb: 'Your club crest, loose on the field. Eat everything.', tag: 'Arcade', neon: '#FFB800' },
  { href: '/games/batting', n: '05', title: 'Legends Cage', blurb: 'Every champion the NFS has crowned. Pick your bat, pick your arm.', tag: 'Archive', neon: '#B47CFF' },
  { href: '/games/memory', n: '06', title: 'Card Sharp', blurb: 'Two of every card, face down. Remember what you saw.', tag: 'Memory', neon: '#FF6B9D' },
  { href: '/games/merge', n: '07', title: 'Tier Up', blurb: 'Two Commons make an Elite. Climb to Immortal.', tag: 'Puzzle', neon: '#39FF9E' },
  { href: '/games/season', n: '08', title: 'Guess the Season', blurb: 'Four award winners. Name the year they won.', tag: 'Archive', neon: '#FF8A3D' },
  { href: '/games/connections', n: '09', title: 'Connections', blurb: 'Sixteen players, four hidden fours. Find them.', tag: 'Daily', neon: '#7DF9FF' },
  { href: '/games/release', n: '10', title: 'Release Point', blurb: 'The windmill comes round. Tap the instant it leaves.', tag: 'Reaction', neon: '#FF4FD8' },
  { href: '/games/fielding', n: '11', title: "Knock 'em Down", blurb: 'Three lanes coming at you. Throw early — nothing crosses the line.', tag: 'Twelve levels', neon: '#5CFF6B' },
  { href: '/games/pickthepitch', n: '12', title: 'Pick the Pitch', blurb: "Steal the catcher's signs from second. Nobody tells you the code.", tag: 'Expert', neon: '#FFD400', featured: true },
  { href: '/games/goldenglove', n: '13', title: 'Golden Glove', blurb: 'Sixty seconds of fungo. Read it, reach it, take it clean.', tag: 'Drill', neon: '#FFC93C', gold: true },
]

export default function Games() {
  return (
    <main className="gm-root">
      <style>{`
        .gm-root {
          --ink: #05060A;
          min-height: 100vh; background: var(--ink);
          position: relative; overflow-x: hidden;
          display: flex; flex-direction: column;
        }
        /* floodlight haze, drifting */
        .gm-flood {
          position: absolute; inset: -20% -10% auto -10%; height: 90vh; pointer-events: none;
          background:
            radial-gradient(ellipse 40% 60% at 18% 0%, #00F0FF22 0%, transparent 62%),
            radial-gradient(ellipse 42% 62% at 82% 4%, #FF2D9522 0%, transparent 62%),
            radial-gradient(ellipse 60% 40% at 50% 0%, #C6FF0014 0%, transparent 70%);
          animation: gm-drift 14s ease-in-out infinite alternate;
        }
        @keyframes gm-drift { to { transform: translate3d(0, 24px, 0) scale(1.06); } }
        /* chain-link */
        .gm-fence {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.11;
          background-image:
            linear-gradient(45deg, transparent 46%, #9FB0C0 46%, #9FB0C0 54%, transparent 54%),
            linear-gradient(-45deg, transparent 46%, #9FB0C0 46%, #9FB0C0 54%, transparent 54%);
          background-size: 34px 34px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, transparent 30%, black 92%);
          -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, transparent 30%, black 92%);
        }
        /* CRT scanlines */
        .gm-scan {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.5; mix-blend-mode: overlay;
          background: repeating-linear-gradient(180deg, #ffffff0d 0px, #ffffff0d 1px, transparent 1px, transparent 4px);
        }
        .gm-wrap { position: relative; z-index: 2; flex: 1; padding: 84px 20px 96px; }
        .gm-inner { max-width: 940px; margin: 0 auto; }

        .gm-eyebrow {
          font-size: 11px; font-weight: 900; letter-spacing: 0.55em; text-transform: uppercase;
          color: #C6FF00; text-shadow: 0 0 14px #C6FF0090;
        }
        /* spray-stencil headline */
        .gm-title {
          font-family: var(--font-heading); font-weight: 900; line-height: 0.82;
          font-size: clamp(66px, 17vw, 168px); letter-spacing: -0.035em; text-transform: uppercase;
          color: transparent; -webkit-text-stroke: 2px #F5F1E8;
          transform: skewX(-7deg); margin: 16px 0 0; position: relative; width: fit-content;
        }
        .gm-title::before, .gm-title::after {
          content: 'PLAY'; position: absolute; inset: 0; -webkit-text-stroke: 2px transparent;
        }
        .gm-title::before { color: #FF2D95; transform: translate(-5px, 4px); mix-blend-mode: screen; filter: blur(0.5px); animation: gm-jit 5s steps(1) infinite; }
        .gm-title::after  { color: #00F0FF; transform: translate(5px, -4px); mix-blend-mode: screen; filter: blur(0.5px); animation: gm-jit 5s steps(1) infinite reverse; }
        @keyframes gm-jit {
          0%, 92%, 100% { opacity: 0.85; }
          93% { transform: translate(-11px, 4px); opacity: 1; }
          95% { transform: translate(3px, -7px); }
          97% { transform: translate(-7px, 2px); }
        }
        .gm-sub {
          font-size: 14px; line-height: 1.7; color: #8FA0B4; max-width: 400px;
          margin-top: 26px; border-left: 3px solid #FFB800; padding-left: 16px;
        }

        .gm-grid { display: grid; gap: 18px; margin-top: 56px; }
        @media (min-width: 720px) { .gm-grid { grid-template-columns: 1fr 1fr; gap: 22px; } }

        /* stencil panel bolted to the fence */
        .gm-tile {
          --neon: #fff;
          position: relative; display: block; padding: 30px 26px 28px; text-decoration: none;
          background: linear-gradient(155deg, #0C0F16 0%, #07080D 100%);
          border: 1px solid color-mix(in srgb, var(--neon) 40%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
          transition: transform 220ms cubic-bezier(.2,.8,.3,1), box-shadow 220ms ease, border-color 220ms ease;
          overflow: hidden;
        }
        .gm-tile:nth-child(odd)  { transform: rotate(-0.7deg); }
        .gm-tile:nth-child(even) { transform: rotate(0.55deg); }
        .gm-tile::after {
          content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0;
          background: radial-gradient(ellipse 70% 90% at 12% 0%, color-mix(in srgb, var(--neon) 22%, transparent) 0%, transparent 66%);
          transition: opacity 260ms ease;
        }
        .gm-tile:hover, .gm-tile:focus-visible {
          transform: rotate(0deg) translateY(-6px) scale(1.014);
          border-color: var(--neon);
          box-shadow: 0 0 26px color-mix(in srgb, var(--neon) 45%, transparent),
                      0 0 70px color-mix(in srgb, var(--neon) 18%, transparent),
                      0 24px 48px #000000a0;
        }
        .gm-tile:hover::after, .gm-tile:focus-visible::after { opacity: 1; }
        .gm-tile:focus-visible { outline: 2px solid var(--neon); outline-offset: 4px; }

        .gm-n {
          position: absolute; right: 16px; top: 8px; font-family: var(--font-heading);
          font-size: 68px; font-weight: 900; line-height: 1; color: transparent;
          -webkit-text-stroke: 1.5px color-mix(in srgb, var(--neon) 26%, transparent);
        }
        .gm-tag {
          display: inline-block; font-size: 9px; font-weight: 900; letter-spacing: 0.3em;
          text-transform: uppercase; color: var(--ink); background: var(--neon);
          padding: 5px 11px; transform: skewX(-9deg);
        }
        .gm-name {
          font-family: var(--font-heading); font-size: 27px; font-weight: 900; line-height: 1.02;
          text-transform: uppercase; color: #F5F1E8; margin: 16px 0 10px; letter-spacing: -0.02em;
          transition: color 200ms ease, text-shadow 200ms ease;
        }
        .gm-tile:hover .gm-name { color: var(--neon); text-shadow: 0 0 20px color-mix(in srgb, var(--neon) 60%, transparent); }
        .gm-blurb { font-size: 13px; line-height: 1.65; color: #7D8B9C; max-width: 30ch; }
        .gm-go {
          display: flex; align-items: center; gap: 8px; margin-top: 22px;
          font-size: 10px; font-weight: 900; letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--neon);
        }
        .gm-go span { display: inline-block; transition: transform 220ms cubic-bezier(.2,.8,.3,1); }
        .gm-tile:hover .gm-go span { transform: translateX(7px); }

        .gm-foot {
          margin-top: 60px; padding-top: 22px; border-top: 1px dashed #ffffff18;
          font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #5C6878;
        }
        .gm-back {
          display: inline-block; font-size: 11px; font-weight: 900; letter-spacing: 0.28em;
          text-transform: uppercase; color: #64748B; text-decoration: none;
        }
        .gm-back:hover { color: #C6FF00; }

        /* One machine in the corner is worth more than the rest. It breathes,
           its border runs, and it sits a touch prouder than the others. */
        /* The frame is drawn in SVG for the same reason as the number — a
           gradient border box renders flat on iOS Safari. */
        .gm-tile[data-featured="true"] {
          border-color: transparent;
          background: linear-gradient(155deg, #14120A 0%, #0A0906 100%);
          animation: gm-breathe 3.4s ease-in-out infinite;
        }
        .gm-frame {
          position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
        }
        .gm-frame rect { fill: none; stroke: url(#gm-wave-grad); stroke-width: 4; }
        @keyframes gm-breathe {
          0%, 100% { box-shadow: 0 0 22px #FFD40028, 0 18px 40px #00000090; }
          50%      { box-shadow: 0 0 44px #FFD40055, 0 0 90px #FFD4001F, 0 18px 40px #00000090; }
        }
        .gm-tile[data-featured="true"] .gm-tag { animation: gm-flick 2.6s steps(1) infinite; }
        @keyframes gm-flick { 0%, 88%, 100% { opacity: 1; } 90% { opacity: 0.45; } 94% { opacity: 1; } 96% { opacity: 0.6; } }
        .gm-tile[data-featured="true"] .gm-name { color: var(--neon); text-shadow: 0 0 18px #FFD40060; }

        /* A gold sheen travelling across the tile — slower and subtler than the
           featured one, an honour rather than a headline. */
        .gm-tile[data-gold="true"] {
          background: linear-gradient(155deg, #14110A 0%, #0A0906 100%);
          border-color: #FFC93C55;
        }
        .gm-tile[data-gold="true"]::before {
          content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
          background: linear-gradient(105deg,
            transparent 38%, #FFC93C00 44%, #FFE9A833 50%, #FFC93C00 56%, transparent 62%);
          background-size: 260% 100%;
          animation: gm-sheen 4.6s ease-in-out infinite;
        }
        @keyframes gm-sheen {
          0% { background-position: 130% 0; }
          55%, 100% { background-position: -130% 0; }
        }
        .gm-tile[data-gold="true"]:hover { border-color: #FFC93C; }
        .gm-tile[data-gold="true"] .gm-name { color: #FFE9A8; }
        /* Hollow number with a travelling colour on the stroke. Done in SVG
           because background-clip on text fills the glyph — stroke and fill are
           only genuinely separate in SVG. */
        .gm-tile[data-featured="true"] .gm-n { display: none; }
        .gm-nsvg { position: absolute; right: 10px; top: 4px; width: 96px; height: 76px; }
        .gm-nsvg text {
          font-family: var(--font-heading); font-weight: 900; font-size: 66px;
          fill: none; stroke: url(#gm-wave-grad); stroke-width: 2;
        }
        .gm-nsvg .gm-wave-stops { animation: gm-shift 3.2s linear infinite; }
        @keyframes gm-shift {
          from { transform: translateX(-100px); }
          to   { transform: translateX(100px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .gm-flood, .gm-title::before, .gm-title::after { animation: none; }
          .gm-tile { transition: none; }
          .gm-tile[data-featured="true"] { animation: none; border-color: var(--neon); }
          .gm-tile[data-featured="true"] .gm-tag { animation: none; }
          .gm-tile[data-gold="true"]::before { animation: none; }
        }
      `}</style>

      <div className="gm-flood" />
      <div className="gm-fence" />
      <div className="gm-scan" />

      <div className="gm-wrap">
        <div className="gm-inner">
          <a href="/" className="gm-back">← Back to the league</a>

          <p className="gm-eyebrow" style={{ marginTop: '30px' }}>Grassroots Fantasy Arcade</p>
          <h1 className="gm-title">PLAY</h1>
          <p className="gm-sub">
            It's Game-Time! Play Games built using real NFS numbers and other popular games styled for the NFS Premier League. Nothing here touches your season — no points, no packs,
            no ladder - just fun. Pick a game, have a crack, try another. Check for what game we add next...
          </p>

          <div className="gm-grid">
            {GAMES.map(g => (
              <a key={g.href} href={g.href} className="gm-tile"
                data-featured={'featured' in g ? 'true' : undefined}
                data-gold={'gold' in g ? 'true' : undefined}
                style={{ ['--neon' as string]: g.neon }}>
                <span className="gm-n" data-n={g.n}>{g.n}</span>
                {'featured' in g && (
                  <svg className="gm-frame" preserveAspectRatio="none" aria-hidden="true">
                    <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" />
                  </svg>
                )}
                {'featured' in g && (
                  <svg className="gm-nsvg" viewBox="0 0 96 76" aria-hidden="true">
                    <defs>
                      <linearGradient id="gm-wave-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FFD400" />
                        <stop offset="25%" stopColor="#FF2D95" />
                        <stop offset="50%" stopColor="#FFD400" />
                        <stop offset="75%" stopColor="#00F0FF" />
                        <stop offset="100%" stopColor="#FFD400" />
                        <animate attributeName="x1" values="-1;1" dur="3.2s" repeatCount="indefinite" />
                        <animate attributeName="x2" values="0;2" dur="3.2s" repeatCount="indefinite" />
                      </linearGradient>
                    </defs>
                    <text x="93" y="60" textAnchor="end">{g.n}</text>
                  </svg>
                )}
                <span className="gm-tag">{g.tag}</span>
                <h2 className="gm-name">{g.title}</h2>
                <p className="gm-blurb">{g.blurb}</p>
                <p className="gm-go">Play <span>→</span></p>
              </a>
            ))}
          </div>

          <p className="gm-foot">
            Black Diamond Labs · Built on real game records
            <ViewTicker page="arcade" />
          </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}