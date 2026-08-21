'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

export type ClubOption = { id: string; name: string; crest: string; colours: [string, string] }

/* Collectibles — a softball is the staple, the rest turn up less often and
   pay more. Every one grows the tail by its own amount. */
const TREATS = [
  { kind: 'ball',  label: 'Softball',   points: 10,  grow: 1, weight: 62, colour: '#F5F1E8' },
  { kind: 'glove', label: 'Glove',      points: 25,  grow: 2, weight: 20, colour: '#C08040' },
  { kind: 'bat',   label: 'Bat',        points: 40,  grow: 3, weight: 13, colour: '#D9B36A' },
  { kind: 'gold',  label: 'Golden Ball', points: 100, grow: 4, weight: 5,  colour: '#FFD700' },
] as const

const COLS = 20
const ROWS = 20

/* Levels rather than a creeping speed-up — you can feel the step change, and
   the target for the next one is always on screen. */
const LEVELS = [
  { at: 0,   ms: 260, name: 'Warm-up' },
  { at: 100, ms: 215, name: 'Reserve' },
  { at: 250, ms: 180, name: 'Bench' },
  { at: 450, ms: 150, name: 'Starter' },
  { at: 700, ms: 125, name: 'Premier' },
  { at: 1000, ms: 105, name: 'Icon' },
]
const levelFor = (score: number) => {
  let i = 0
  for (let n = 0; n < LEVELS.length; n++) if (score >= LEVELS[n].at) i = n
  return i
}

const BDL: [string, string] = ['#FFB800', '#FFE7A8']

type Pt = { x: number; y: number }
type Treat = { pos: Pt; kind: typeof TREATS[number] }

export default function SnakeClient({ clubs, initialClub }: {
  clubs: ClubOption[]; initialClub: ClubOption | null
}) {
  const [club, setClub] = useState<ClubOption | null>(initialClub)
  const [state, setState] = useState<'ready' | 'playing' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [lastEaten, setLastEaten] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [levelUp, setLevelUp] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const crestRef = useRef<HTMLImageElement | null>(null)

  // Mutable game state — kept in refs so the loop never restarts mid-run
  const snake = useRef<Pt[]>([])
  const dir = useRef<Pt>({ x: 1, y: 0 })
  const queued = useRef<Pt[]>([])
  const treat = useRef<Treat | null>(null)
  const grow = useRef(0)
  const speed = useRef(LEVELS[0].ms)
  const raf = useRef<number>(0)
  const last = useRef(0)

  const randomTreat = useCallback((body: Pt[]): Treat => {
    const total = TREATS.reduce((s, t) => s + t.weight, 0)
    let roll = Math.random() * total
    let kind: typeof TREATS[number] = TREATS[0]
    for (const t of TREATS) { roll -= t.weight; if (roll <= 0) { kind = t; break } }
    let pos: Pt
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
    } while (body.some(b => b.x === pos.x && b.y === pos.y))
    return { pos, kind }
  }, [])

  const draw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const cell = cv.width / COLS
    // The tail runs in the club's kit — BDL amber when nobody's picked
    const [c1, c2] = club?.colours ?? BDL

    // Field
    ctx.fillStyle = '#07080D'
    ctx.fillRect(0, 0, cv.width, cv.height)
    ctx.strokeStyle = '#ffffff08'
    ctx.lineWidth = 1
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, cv.height); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(cv.width, i * cell); ctx.stroke()
    }

    // Treat
    const t = treat.current
    if (t) {
      const cx = t.pos.x * cell + cell / 2
      const cy = t.pos.y * cell + cell / 2
      ctx.save()
      ctx.shadowColor = t.kind.colour
      ctx.shadowBlur = 14
      ctx.fillStyle = t.kind.colour
      if (t.kind.kind === 'bat') {
        ctx.translate(cx, cy); ctx.rotate(-Math.PI / 4)
        ctx.fillRect(-cell * 0.07, -cell * 0.34, cell * 0.14, cell * 0.68)
        ctx.beginPath(); ctx.arc(0, cell * 0.3, cell * 0.11, 0, Math.PI * 2); ctx.fill()
      } else if (t.kind.kind === 'glove') {
        ctx.beginPath()
        ctx.ellipse(cx, cy, cell * 0.3, cell * 0.34, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#07080D'
        ctx.fillRect(cx - cell * 0.04, cy - cell * 0.34, cell * 0.08, cell * 0.24)
      } else {
        ctx.beginPath(); ctx.arc(cx, cy, cell * 0.31, 0, Math.PI * 2); ctx.fill()
        // seams
        ctx.strokeStyle = '#C41E3A'
        ctx.lineWidth = Math.max(1, cell * 0.06)
        ctx.beginPath(); ctx.arc(cx - cell * 0.34, cy, cell * 0.3, -0.9, 0.9); ctx.stroke()
        ctx.beginPath(); ctx.arc(cx + cell * 0.34, cy, cell * 0.3, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke()
      }
      ctx.restore()
    }

    // Tail — the club's two colours, banded down the body
    const body = snake.current
    body.forEach((p, i) => {
      if (i === 0) return
      const fade = 1 - (i / body.length) * 0.5
      ctx.save()
      ctx.globalAlpha = 0.45 + fade * 0.52
      ctx.fillStyle = i % 2 ? c2 : c1
      ctx.fillRect(p.x * cell + cell * 0.1, p.y * cell + cell * 0.1, cell * 0.8, cell * 0.8)
      ctx.restore()
    })

    // Head — the club crest, or the BDL diamond
    const h = body[0]
    if (h) {
      const hx = h.x * cell
      const hy = h.y * cell
      ctx.save()
      ctx.shadowColor = c1
      ctx.shadowBlur = 16
      if (crestRef.current) {
        ctx.beginPath()
        ctx.arc(hx + cell / 2, hy + cell / 2, cell * 0.46, 0, Math.PI * 2)
        ctx.closePath(); ctx.clip()
        ctx.drawImage(crestRef.current, hx + cell * 0.04, hy + cell * 0.04, cell * 0.92, cell * 0.92)
      } else {
        ctx.fillStyle = '#F5F1E8'
        ctx.beginPath(); ctx.arc(hx + cell / 2, hy + cell / 2, cell * 0.44, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
      ctx.strokeStyle = c1
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(hx + cell / 2, hy + cell / 2, cell * 0.46, 0, Math.PI * 2); ctx.stroke()
    }
  }, [club])

  // Load the head artwork — a club crest, or the BDL diamond by default
  useEffect(() => {
    const img = new Image()
    img.src = club ? club.crest : '/bdl-diamond.webp'
    img.onload = () => { crestRef.current = img; draw() }
    img.onerror = () => { crestRef.current = null; draw() }
  }, [club, draw])

  const step = useCallback(() => {
    const body = snake.current
    // One turn per tick — queued turns stop a double-tap doubling back
    const next = queued.current.shift()
    if (next && !(next.x === -dir.current.x && next.y === -dir.current.y)) dir.current = next

    const head = { x: body[0].x + dir.current.x, y: body[0].y + dir.current.y }

    // The fence, and yourself
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS
        || body.some(p => p.x === head.x && p.y === head.y)) {
      setState('over')
      setBest(b => Math.max(b, score))
      return
    }

    body.unshift(head)
    const t = treat.current
    if (t && head.x === t.pos.x && head.y === t.pos.y) {
      grow.current += t.kind.grow
      setLastEaten(t.kind.label)
      setScore(s => {
        const nextScore = s + t.kind.points
        const lv = levelFor(nextScore)
        speed.current = LEVELS[lv].ms
        setLevel(prev => {
          if (lv > prev) {
            setLevelUp(LEVELS[lv].name)
            setTimeout(() => setLevelUp(null), 1400)
          }
          return lv
        })
        return nextScore
      })
      treat.current = randomTreat(body)
    }
    if (grow.current > 0) grow.current -= 1
    else body.pop()

    draw()
  }, [draw, randomTreat, score])

  // Game loop
  useEffect(() => {
    if (state !== 'playing') return
    const tick = (now: number) => {
      if (now - last.current >= speed.current) { last.current = now; step() }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [state, step])

  // Keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Pt> = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      }
      const d = map[e.key]
      if (!d) return
      e.preventDefault()
      if (queued.current.length < 2) queued.current.push(d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Swipe — captured on the stage, so a swipe that drifts off the board counts
  useEffect(() => {
    const cv = canvasRef.current?.parentElement
    if (!cv) return
    let sx = 0, sy = 0
    const start = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      const dy = e.changedTouches[0].clientY - sy
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
      const d = Math.abs(dx) > Math.abs(dy)
        ? { x: dx > 0 ? 1 : -1, y: 0 }
        : { x: 0, y: dy > 0 ? 1 : -1 }
      if (queued.current.length < 2) queued.current.push(d)
    }
    cv.addEventListener('touchstart', start, { passive: true })
    cv.addEventListener('touchend', end, { passive: true })
    return () => { cv.removeEventListener('touchstart', start); cv.removeEventListener('touchend', end) }
  }, [])

  /* While a game is live the page mustn't scroll under the swipes — on a phone
     a swipe that drifts off the canvas otherwise drags the whole screen. */
  useEffect(() => {
    if (state !== 'playing') return
    const prev = document.body.style.overscrollBehavior
    const prevTouch = document.body.style.touchAction
    document.body.style.overscrollBehavior = 'none'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overscrollBehavior = prev
      document.body.style.touchAction = prevTouch
    }
  }, [state])

  function begin() {
    snake.current = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }]
    dir.current = { x: 1, y: 0 }
    queued.current = []
    grow.current = 0
    speed.current = LEVELS[0].ms
    setLevel(0); setLevelUp(null)
    last.current = 0
    treat.current = randomTreat(snake.current)
    setScore(0); setLastEaten(null); setState('playing')
    draw()
  }

  useEffect(() => { draw() }, [draw])

  const kit = club?.colours ?? BDL

  return (
    <>
      <style>{`
        .sn-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 22px; }
        .sn-score { display: flex; gap: 26px; align-items: baseline; margin-bottom: 16px; }
        .sn-score span { font-size: 10px; font-weight: 900; letter-spacing: 0.26em; text-transform: uppercase; color: #5C6878; }
        .sn-score b { font-family: var(--font-heading); font-size: 19px; color: #F5F1E8; margin-left: 8px; }
        /* The board is square, so cap it by viewport height too — otherwise on
           a phone it's as tall as the screen is wide and the far edge sits off
           the bottom of the view. */
        .sn-stage {
          position: relative;
          width: min(100%, 62vh);
          margin: 0 auto;
          overscroll-behavior: contain;
        }
        .sn-canvas {
          width: 100%; height: auto; display: block;
          touch-action: none; -webkit-user-select: none; user-select: none;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .sn-over {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px;
          background: #05060AE8; text-align: center; padding: 20px;
        }
        .sn-eaten { font-size: 10px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: var(--neon); min-height: 14px; margin-bottom: 14px; }
        .sn-key { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 16px; }
        .sn-treats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
        .sn-treat {
          display: flex; align-items: center; gap: 8px; padding: 9px 13px;
          border: 1px solid #ffffff12; background: #ffffff05;
          font-size: 11px; font-weight: 700; color: #B8C4D2;
        }
        .sn-pip { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .sn-pts { font-family: var(--font-heading); font-weight: 900; color: var(--neon); }
        .sn-clublbl { font-size: 9px; font-weight: 900; letter-spacing: 0.3em; text-transform: uppercase; color: #4E5A6A; margin: 26px 0 10px; }
        .sn-clubs { display: flex; flex-wrap: wrap; gap: 8px; }
        .sn-club {
          width: 40px; height: 40px; border-radius: 50%; overflow: hidden; cursor: pointer;
          border: 2px solid #ffffff18; background: #0C0F16; padding: 0;
          transition: border-color 140ms ease, transform 140ms ease;
        }
        .sn-club:hover { transform: scale(1.09); border-color: #ffffff40; }
        .sn-club[data-on="true"] { border-color: var(--neon); box-shadow: 0 0 16px color-mix(in srgb, var(--neon) 55%, transparent); }
        .sn-club img { width: 100%; height: 100%; object-fit: cover; }
        /* The kit the tail is currently wearing */
        .sn-kit { display: inline-flex; align-items: center; gap: 6px; margin-left: 10px; vertical-align: middle; }
        .sn-kit i { width: 13px; height: 13px; border-radius: 3px; display: inline-block; }
      `}</style>

      <p className="sn-lede">
        Your club crest, loose on the diamond, with the tail in your colours. Eat what you find, keep
        off the fence, and don&apos;t cross yourself. It quickens every level.
      </p>

      <div className="sn-score">
        <span>Score <b>{score}</b></span>
        <span>Level <b style={{ color: 'var(--neon)' }}>{LEVELS[level].name}</b></span>
        <span>Best <b>{best}</b></span>
      </div>
      <p className="sn-eaten">
        {levelUp
          ? <span style={{ color: 'var(--neon)' }}>Level up · {levelUp}</span>
          : LEVELS[level + 1]
            ? <span style={{ color: '#4E5A6A' }}>{LEVELS[level + 1].at - score} to {LEVELS[level + 1].name}</span>
            : (lastEaten ?? '')}
      </p>

      <div className="sn-stage">
        <canvas ref={canvasRef} className="sn-canvas" width={600} height={600} />
        {state !== 'playing' && (
          <div className="sn-over">
            {state === 'over' && (
              <>
                <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#FF4D4D' }}>Run over</p>
                <p className="ar-num" style={{ fontSize: '58px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 4px' }}>{score}</p>
              </>
            )}
            <button className="ar-btn" onClick={begin} style={{ marginTop: '18px' }}>
              <span>{state === 'over' ? 'Go again' : 'Start'}</span>
            </button>
          </div>
        )}
      </div>

      <p className="sn-key">Arrow keys or WASD · swipe on a phone</p>

      <div className="sn-treats">
        {TREATS.map(t => (
          <span key={t.kind} className="sn-treat">
            <span className="sn-pip" style={{ background: t.colour, boxShadow: `0 0 8px ${t.colour}` }} />
            {t.label} <span className="sn-pts">{t.points}</span>
          </span>
        ))}
      </div>

      <p className="sn-clublbl">
        Pick your head
        <span className="sn-kit">
          <i style={{ background: kit[0] }} /><i style={{ background: kit[1] }} />
        </span>
      </p>
      <div className="sn-clubs">
        <button className="sn-club" data-on={club === null} onClick={() => setClub(null)} aria-label="Black Diamond Labs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bdl-diamond.webp" alt="" />
        </button>
        {clubs.map(c => (
          <button key={c.id} className="sn-club" data-on={club?.id === c.id}
            onClick={() => setClub(c)} aria-label={c.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.crest} alt="" />
          </button>
        ))}
      </div>
    </>
  )
}