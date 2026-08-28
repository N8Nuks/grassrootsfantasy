'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { splitName } from '@/lib/names'
import ArcadeShare from '@/components/ArcadeShare'

export type MemoryPlayer = {
  id: string; name: string; club: string; tier: string
  photoUrl: string | null; points: number
}

const TIER_ACCENT: Record<string, string> = {
  rare_2wp_a: '#FFD700', rare_2wp_b: '#E8C15A', elite: '#4D8DFF', common: '#3FBF63',
}

const LEVELS = [
  { key: 'easy',   label: 'Six pairs',    pairs: 6,  cols: 3 },
  { key: 'normal', label: 'Eight pairs',  pairs: 8,  cols: 4 },
  { key: 'hard',   label: 'Twelve pairs', pairs: 12, cols: 4 },
] as const

type Tile = { key: number; player: MemoryPlayer; flipped: boolean; matched: boolean }

export default function MemoryClient({ pool }: { pool: MemoryPlayer[] }) {
  const [level, setLevel] = useState<typeof LEVELS[number]>(LEVELS[1])
  const [tiles, setTiles] = useState<Tile[]>([])
  const [open, setOpen] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [started, setStarted] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [best, setBest] = useState<Record<string, number>>({})
  const busy = useRef(false)

  const deal = useCallback((lv: typeof LEVELS[number]) => {
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, lv.pairs)
    const doubled = [...picked, ...picked]
      .map((p, i) => ({ key: i, player: p, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5)
      .map((t, i) => ({ ...t, key: i }))
    setTiles(doubled)
    setOpen([]); setMoves(0); setElapsed(0); setStarted(null)
    busy.current = false
  }, [pool])

  useEffect(() => { deal(level) }, [deal, level])

  const done = tiles.length > 0 && tiles.every(t => t.matched)

  // Clock runs from the first flip to the last match
  useEffect(() => {
    if (started === null || done) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250)
    return () => clearInterval(id)
  }, [started, done])

  useEffect(() => {
    if (!done || started === null) return
    const secs = Math.floor((Date.now() - started) / 1000)
    setBest(b => ({ ...b, [level.key]: b[level.key] ? Math.min(b[level.key], secs) : secs }))
  }, [done, started, level.key])

  function flip(key: number) {
    if (busy.current || done) return
    const tile = tiles.find(t => t.key === key)
    if (!tile || tile.flipped || tile.matched) return
    if (started === null) setStarted(Date.now())

    const nextOpen = [...open, key]
    setTiles(ts => ts.map(t => t.key === key ? { ...t, flipped: true } : t))
    setOpen(nextOpen)

    if (nextOpen.length < 2) return

    setMoves(m => m + 1)
    busy.current = true
    const [a, b] = nextOpen.map(k => tiles.find(t => t.key === k)!)
    const hit = a.player.id === b.player.id

    setTimeout(() => {
      setTiles(ts => ts.map(t =>
        nextOpen.includes(t.key)
          ? (hit ? { ...t, matched: true, flipped: true } : { ...t, flipped: false })
          : t))
      setOpen([])
      busy.current = false
    }, hit ? 420 : 780)
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span style={{ textTransform: 'uppercase' }}>{s.last}</span></>
  }
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const matched = tiles.filter(t => t.matched).length / 2

  return (
    <>
      <style>{`
        .mm-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .mm-levels { display: flex; gap: 8px; margin-bottom: 22px; }
        .mm-lv {
          flex: 1; cursor: pointer; padding: 12px 6px; background: transparent;
          border: 1px solid #ffffff16; color: #64748B;
          font-family: var(--font-heading); font-weight: 900; font-size: 11px;
          letter-spacing: 0.14em; text-transform: uppercase;
          transition: color 140ms ease, border-color 140ms ease, background 140ms ease;
        }
        .mm-lv:hover { color: #B8C4D2; border-color: #ffffff30; }
        .mm-lv[data-on="true"] { background: var(--neon); border-color: var(--neon); color: #05060A; }

        .mm-hud { display: flex; gap: 22px; align-items: baseline; margin-bottom: 16px; flex-wrap: wrap; }
        .mm-hud span { font-size: 9px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6878; }
        .mm-hud b { font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-left: 7px; }

        .mm-grid { display: grid; gap: 9px; }
        .mm-cell { perspective: 800px; aspect-ratio: 3 / 4; }
        .mm-inner {
          position: relative; width: 100%; height: 100%; cursor: pointer;
          transform-style: preserve-3d; transition: transform 400ms cubic-bezier(.3,.9,.3,1);
          background: none; border: none; padding: 0;
        }
        .mm-inner[data-up="true"] { transform: rotateY(180deg); }
        .mm-face {
          position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;
          display: flex; flex-direction: column; overflow: hidden;
        }
        /* back — the GF mark, like a real deck */
        .mm-back {
          background: linear-gradient(160deg, #14182A 0%, #0A0C14 100%);
          border: 1px solid color-mix(in srgb, var(--neon) 30%, transparent);
          align-items: center; justify-content: center;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .mm-inner:hover .mm-back { border-color: var(--neon); box-shadow: 0 0 18px color-mix(in srgb, var(--neon) 40%, transparent); }
        .mm-back img { width: 46%; opacity: 0.5; }
        /* front — the player */
        .mm-front {
          transform: rotateY(180deg);
          background: linear-gradient(165deg, #0F1420 0%, #07080D 100%);
          border: 1px solid var(--tier);
          box-shadow: 0 0 16px color-mix(in srgb, var(--tier) 30%, transparent);
        }
        .mm-photo {
          flex: 1; min-height: 0; display: flex; align-items: flex-end; justify-content: center; overflow: hidden;
          background: linear-gradient(180deg, color-mix(in srgb, var(--tier) 22%, transparent) 0%, transparent 88%);
        }
        .mm-photo img { height: 98%; width: auto; object-fit: contain; }
        .mm-ghost { width: 44%; aspect-ratio: 3/4; border-radius: 50% 50% 6px 6px; background: color-mix(in srgb, var(--tier) 34%, transparent); margin-bottom: 6px; }
        .mm-nm {
          font-family: var(--font-heading); font-weight: 900; font-size: 10px; line-height: 1.15;
          color: #F5F1E8; text-align: center; padding: 6px 4px 7px;
          background: #00000060; border-top: 1px solid color-mix(in srgb, var(--tier) 34%, transparent);
        }
        .mm-cell[data-hit="true"] .mm-front { animation: mm-lock 420ms ease; }
        .mm-cell[data-hit="true"] { opacity: 0.72; }
        @keyframes mm-lock { 40% { transform: scale(1.07); } }

        .mm-done { text-align: center; padding: 30px 22px; margin-top: 22px; }
      `}</style>

      <p className="mm-lede">
        Two of every card, face down. Turn them over in pairs and remember what you saw — the clock
        starts on your first flip.
      </p>

      <div className="mm-levels">
        {LEVELS.map(lv => (
          <button key={lv.key} className="mm-lv" data-on={level.key === lv.key} onClick={() => setLevel(lv)}>
            {lv.label}
          </button>
        ))}
      </div>

      <div className="mm-hud">
        <span>Pairs <b>{matched}/{level.pairs}</b></span>
        <span>Moves <b>{moves}</b></span>
        <span>Time <b>{mm(elapsed)}</b></span>
        {best[level.key] && <span>Best <b style={{ color: 'var(--neon)' }}>{mm(best[level.key])}</b></span>}
      </div>

      <div className="mm-grid" style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}>
        {tiles.map(t => {
          const tier = TIER_ACCENT[t.player.tier] ?? TIER_ACCENT.common
          return (
            <div key={t.key} className="mm-cell" data-hit={t.matched} style={{ ['--tier' as string]: tier }}>
              <button className="mm-inner" data-up={t.flipped || t.matched}
                onClick={() => flip(t.key)} aria-label={t.flipped || t.matched ? t.player.name : 'Face-down card'}>
                <span className="mm-face mm-back">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/gf-mark.png" alt="" />
                </span>
                <span className="mm-face mm-front">
                  <span className="mm-photo">
                    {t.player.photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={t.player.photoUrl} alt="" />
                      : <span className="mm-ghost" />}
                  </span>
                  <span className="mm-nm">{caps(t.player.name)}</span>
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {done && (
        <div className="ar-panel mm-done">
          <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--neon)' }}>Board cleared</p>
          <p className="ar-num" style={{ fontSize: '50px', color: '#F5F1E8', textShadow: 'none', margin: '12px 0 4px' }}>{mm(elapsed)}</p>
          <p style={{ fontSize: '11px', color: '#7D8B9C' }}>{moves} moves · {level.pairs} pairs</p>
          <button className="ar-btn" onClick={() => deal(level)} style={{ marginTop: '22px' }}><span>Shuffle again</span></button>
          <div style={{ marginTop: '12px' }}>
            <ArcadeShare lines={[`Card Sharp — ${level.label.toLowerCase()} in ${mm(elapsed)}, ${moves} moves`]} />
          </div>
        </div>
      )}
    </>
  )
}