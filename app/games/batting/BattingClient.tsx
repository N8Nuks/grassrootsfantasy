'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { splitName } from '@/lib/names'

export type Batter = {
  id: string; name: string; club: string; grade: string; tier: string
  photoUrl: string | null; ba: number; hr: number; points: number
}
export type Pitcher = {
  id: string; name: string; club: string; grade: string
  photoUrl: string | null; k: number; wins: number
}

const PITCHES = 10
const OUTS = 3

const RESULTS = {
  homer:  { label: 'HOME RUN',     points: 15, colour: '#FFD700', flight: 'over' },
  triple: { label: 'TRIPLE',       points: 10, colour: '#C6FF00', flight: 'deep' },
  double: { label: 'DOUBLE',       points: 8,  colour: '#00F0FF', flight: 'deep' },
  single: { label: 'SINGLE',       points: 5,  colour: '#7FE0A0', flight: 'liner' },
  foul:   { label: 'FOUL',         points: 0,  colour: '#8FA0B4', flight: 'back' },
  out:    { label: 'GROUNDED OUT', points: 0,  colour: '#FF7A5C', flight: 'ground' },
  strike: { label: 'STRIKE',       points: 0,  colour: '#FF4D4D', flight: 'none' },
} as const
type ResultKey = keyof typeof RESULTS

/* Where the strike zone sits on the canvas, in fractions of width and height.
   The ball is judged against this box, and the batter stands beside it. */
const ZONE = { x: 0.5, y: 0.70, w: 0.155, h: 0.145 }

export default function BattingClient({ batters, pitchers }: { batters: Batter[]; pitchers: Pitcher[] }) {
  const [batter, setBatter] = useState<Batter>(batters[0])
  const [pitcher, setPitcher] = useState<Pitcher>(pitchers[0])
  const [phase, setPhase] = useState<'setup' | 'live' | 'done'>('setup')

  const [pitchNo, setPitchNo] = useState(0)
  const [outs, setOuts] = useState(0)
  const [score, setScore] = useState(0)
  const [log, setLog] = useState<{ key: ResultKey; dist: number }[]>([])
  const [flash, setFlash] = useState<{ key: ResultKey; dist: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)

  // Live pitch state, in refs so the loop doesn't restart every frame
  const t = useRef(0)
  const dur = useRef(1400)
  const breakX = useRef(0)
  const started = useRef(0)
  const swung = useRef(false)
  const settled = useRef(false)
  const swingAt = useRef(0)          // when the bat started through
  const contact = useRef(false)      // did the bat meet the ball
  const ball = useRef<{ x: number; y: number; vx: number; vy: number; gravity: number; alive: boolean } | null>(null)

  const maxK = Math.max(...pitchers.map(p => p.k), 1)
  const heat = pitcher.k / maxK
  const windowSize = 0.055 + batter.ba * 0.11

  const beginPitch = useCallback(() => {
    dur.current = 1500 - heat * 620 + (Math.random() * 260 - 130)
    breakX.current = (Math.random() * 2 - 1) * (0.16 + heat * 0.3)
    t.current = 0
    swung.current = false
    settled.current = false
    contact.current = false
    swingAt.current = 0
    ball.current = null
    started.current = performance.now()
  }, [heat])

  const finish = useCallback((key: ResultKey, dist: number) => {
    if (settled.current) return
    settled.current = true
    setFlash({ key, dist })
    setScore(s => s + RESULTS[key].points)
    setLog(l => [...l, { key, dist }])
    const isOut = key === 'strike' || key === 'out'
    const nextOuts = outs + (isOut ? 1 : 0)
    const nextPitch = pitchNo + 1
    if (isOut) setOuts(nextOuts)
    setPitchNo(nextPitch)

    setTimeout(() => {
      setFlash(null)
      if (nextOuts >= OUTS || nextPitch >= PITCHES) setPhase('done')
      else beginPitch()
    }, 1650)
  }, [outs, pitchNo, beginPitch])

  /* Each result gets its own flight. Over the fence climbs and clears the wall;
     deep and liner land in the outfield; ground dies in the dirt; back goes up
     and behind the plate. */
  function launch(kind: string) {
    contact.current = true
    const side = Math.random() * 0.6 - 0.3
    if (kind === 'over')   ball.current = { x: ZONE.x, y: ZONE.y, vx: side * 0.7, vy: -1.35, gravity: 0.0125, alive: true }
    else if (kind === 'deep')   ball.current = { x: ZONE.x, y: ZONE.y, vx: side, vy: -1.0, gravity: 0.019, alive: true }
    else if (kind === 'liner')  ball.current = { x: ZONE.x, y: ZONE.y, vx: side * 1.2, vy: -0.62, gravity: 0.021, alive: true }
    else if (kind === 'ground') ball.current = { x: ZONE.x, y: ZONE.y, vx: side * 1.5, vy: -0.16, gravity: 0.028, alive: true }
    else if (kind === 'back')   ball.current = { x: ZONE.x, y: ZONE.y, vx: (Math.random() > 0.5 ? 1 : -1) * 0.5, vy: -1.5, gravity: 0.030, alive: true }
  }

  const swing = useCallback(() => {
    if (phase !== 'live' || swung.current || settled.current) return
    swung.current = true
    swingAt.current = performance.now()
    const off = Math.abs(t.current - 1)

    // Way early is a swing through — the bat is past before the ball arrives
    if (t.current < 0.55) { setTimeout(() => finish('strike', 0), 260); return }

    let key: ResultKey
    let dist = 0
    if (off <= windowSize * 0.4) { key = 'homer'; dist = 95 + Math.round(Math.random() * 45) + Math.round(batter.hr * 1.5) }
    else if (off <= windowSize * 0.8) { key = 'triple'; dist = 62 + Math.round(Math.random() * 20) }
    else if (off <= windowSize * 1.3) { key = 'double'; dist = 44 + Math.round(Math.random() * 16) }
    else if (off <= windowSize * 2)   { key = 'single'; dist = 26 + Math.round(Math.random() * 14) }
    else if (off <= windowSize * 3)   { key = 'foul'; dist = 0 }
    else { key = 'out'; dist = 12 + Math.round(Math.random() * 10) }

    // Contact lands a beat after the swing starts, so the bat visibly meets it
    setTimeout(() => {
      launch(RESULTS[key].flight)
      finish(key, dist)
    }, 90)
  }, [phase, windowSize, batter.hr, finish])

  // ── The batter: a few shapes, swinging through an arc ──
  function drawBatter(ctx: CanvasRenderingContext2D, W: number, H: number, now: number) {
    const bx = W * (ZONE.x - 0.135)      // stands off the inside corner
    const by = H * 0.885                  // feet at the dirt

    // Swing runs 0 (loaded) to 1 (finished) over 320ms
    let s = 0
    if (swung.current && swingAt.current) s = Math.min(1, (now - swingAt.current) / 320)
    const armAngle = -2.35 + s * 3.5      // radians, back shoulder round to follow-through
    const lean = s * 0.16

    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(lean * 0.35)

    const ink = '#0A0C10'
    const kit = '#B47CFF'

    // Legs
    ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-2, -38); ctx.lineTo(-15, 0); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-2, -38); ctx.lineTo(13 + s * 5, 0); ctx.stroke()

    // Body
    ctx.strokeStyle = kit; ctx.lineWidth = 15
    ctx.beginPath(); ctx.moveTo(-2, -38); ctx.lineTo(-4, -70); ctx.stroke()

    // Head with helmet
    ctx.fillStyle = ink
    ctx.beginPath(); ctx.arc(-4, -82, 11, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = kit
    ctx.beginPath(); ctx.arc(-4, -84, 11, Math.PI, 0); ctx.fill()
    ctx.fillRect(-4, -86, 15, 4)

    // Arms and bat, swinging as one unit from the shoulder
    ctx.save()
    ctx.translate(-4, -66)
    ctx.rotate(armAngle)
    ctx.strokeStyle = ink; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 0); ctx.stroke()
    // bat
    const grad = ctx.createLinearGradient(22, 0, 74, 0)
    grad.addColorStop(0, '#7A5A32'); grad.addColorStop(1, '#D9B36A')
    ctx.strokeStyle = grad
    ctx.lineWidth = 6
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(72, 0); ctx.stroke()
    ctx.lineWidth = 9
    ctx.beginPath(); ctx.moveTo(58, 0); ctx.lineTo(74, 0); ctx.stroke()
    ctx.restore()

    // Contact spark
    if (contact.current && s > 0.25 && s < 0.75) {
      ctx.save()
      ctx.translate(W * ZONE.x - bx, H * ZONE.y - by)
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      const r = 10 + (s - 0.25) * 60
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + s * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5)
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        ctx.stroke()
      }
      ctx.restore()
    }

    ctx.restore()
  }

  const draw = useCallback((now: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height

    // Night sky over the outfield
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#0B0D18')
    sky.addColorStop(0.36, '#101A2E')
    sky.addColorStop(0.37, '#12301C')
    sky.addColorStop(1, '#0A1A10')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    const pool = ctx.createRadialGradient(W * 0.5, H * 0.16, 10, W * 0.5, H * 0.16, W * 0.72)
    pool.addColorStop(0, '#B47CFF20')
    pool.addColorStop(1, 'transparent')
    ctx.fillStyle = pool
    ctx.fillRect(0, 0, W, H)

    // Outfield wall — the home run line
    ctx.fillStyle = '#0E1626'
    ctx.fillRect(0, H * 0.335, W, H * 0.04)
    ctx.fillStyle = '#B47CFF45'
    ctx.fillRect(0, H * 0.335, W, 2)

    // Infield dirt
    ctx.fillStyle = '#2A1D14'
    ctx.beginPath()
    ctx.ellipse(W / 2, H * 1.06, W * 0.54, H * 0.36, 0, Math.PI, 0)
    ctx.fill()

    ctx.strokeStyle = '#ffffff18'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2, H * 0.9); ctx.lineTo(W * 0.14, H * 0.56)
    ctx.moveTo(W / 2, H * 0.9); ctx.lineTo(W * 0.86, H * 0.56)
    ctx.stroke()

    // Mound and plate
    ctx.fillStyle = '#3A2A1E'
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.46, W * 0.07, H * 0.024, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#F5F1E8'
    ctx.beginPath()
    ctx.moveTo(W / 2 - 17, H * 0.895); ctx.lineTo(W / 2 + 17, H * 0.895)
    ctx.lineTo(W / 2 + 17, H * 0.915); ctx.lineTo(W / 2, H * 0.933)
    ctx.lineTo(W / 2 - 17, H * 0.915); ctx.closePath(); ctx.fill()

    // ── Strike zone ──
    const zx = W * (ZONE.x - ZONE.w / 2)
    const zy = H * (ZONE.y - ZONE.h / 2)
    const zw = W * ZONE.w
    const zh = H * ZONE.h
    const live = phase === 'live' && !settled.current
    const closeness = live ? Math.min(Math.max(t.current, 0), 1) : 0
    ctx.strokeStyle = `rgba(180, 124, 255, ${0.28 + closeness * 0.55})`
    ctx.lineWidth = 2
    ctx.strokeRect(zx, zy, zw, zh)
    // quartered, like a broadcast box
    ctx.strokeStyle = `rgba(180, 124, 255, ${0.1 + closeness * 0.22})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(zx + zw / 3, zy); ctx.lineTo(zx + zw / 3, zy + zh)
    ctx.moveTo(zx + (zw * 2) / 3, zy); ctx.lineTo(zx + (zw * 2) / 3, zy + zh)
    ctx.moveTo(zx, zy + zh / 3); ctx.lineTo(zx + zw, zy + zh / 3)
    ctx.moveTo(zx, zy + (zh * 2) / 3); ctx.lineTo(zx + zw, zy + (zh * 2) / 3)
    ctx.stroke()
    // corners brighten as the ball arrives
    if (live && t.current > 0.4) {
      ctx.strokeStyle = `rgba(255, 215, 0, ${(t.current - 0.4) * 1.2})`
      ctx.lineWidth = 3
      const c = 12
      const corners: [number, number, number, number][] = [
        [zx, zy + c, zx, zy], [zx, zy, zx + c, zy],
        [zx + zw - c, zy, zx + zw, zy], [zx + zw, zy, zx + zw, zy + c],
        [zx, zy + zh - c, zx, zy + zh], [zx, zy + zh, zx + c, zy + zh],
        [zx + zw - c, zy + zh, zx + zw, zy + zh], [zx + zw, zy + zh, zx + zw, zy + zh - c],
      ]
      for (const [a, b, cc, d] of corners) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(cc, d); ctx.stroke() }
    }

    if (phase === 'live') {
      if (!swung.current && !settled.current && started.current) {
        t.current = (now - started.current) / dur.current
        if (t.current >= 1.14) finish('strike', 0)
      }

      const b = ball.current
      if (b && b.alive) {
        // Struck ball, on its own flight
        b.x += b.vx * 0.011
        b.y += b.vy * 0.013
        b.vy += b.gravity
        // Ground balls skip along the dirt rather than sinking through it
        if (b.y > 0.9 && b.vy > 0) { b.y = 0.9; b.vy *= -0.42; b.vx *= 0.72 }
        if (b.x < -0.1 || b.x > 1.1 || b.y < -0.25 || Math.abs(b.vx) < 0.02) b.alive = b.y > -0.25 && b.x > -0.1 && b.x < 1.1
        ctx.save()
        ctx.shadowColor = '#F5F1E8'; ctx.shadowBlur = 18
        ctx.fillStyle = '#F5F1E8'
        const r = Math.max(3, 8 - (0.9 - b.y) * 6)
        ctx.beginPath(); ctx.arc(b.x * W, b.y * H, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      } else if (!contact.current && t.current > 0 && t.current < 1.16) {
        // Incoming pitch, growing and breaking
        const p = t.current
        const x = W * ZONE.x + breakX.current * W * 0.13 * p * p
        const y = H * 0.46 + (H * ZONE.y - H * 0.46) * (p * p * 0.7 + p * 0.3)
        const r = 3.5 + p * p * 9
        ctx.save()
        ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 12 + p * 16
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        ctx.strokeStyle = '#C41E3A'
        ctx.lineWidth = Math.max(1, r * 0.24)
        ctx.beginPath(); ctx.arc(x - r * 1.1, y, r * 0.98, -0.9, 0.9); ctx.stroke()
      }

      drawBatter(ctx, W, H, now)
    } else {
      drawBatter(ctx, W, H, now)
    }

    raf.current = requestAnimationFrame(draw)
  }, [phase, finish])

  useEffect(() => {
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [draw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      swing()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [swing])

  function start() {
    setPitchNo(0); setOuts(0); setScore(0); setLog([]); setFlash(null)
    setPhase('live')
    beginPitch()
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span style={{ textTransform: 'uppercase' }}>{s.last}</span></>
  }
  const hits = log.filter(l => ['homer','triple','double','single'].includes(l.key)).length
  const homers = log.filter(l => l.key === 'homer').length
  const furthest = log.reduce((m, l) => Math.max(m, l.dist), 0)

  return (
    <>
      <style>{`
        .bt-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 22px; }
        .bt-lbl { font-size: 9px; font-weight: 900; letter-spacing: 0.3em; text-transform: uppercase; color: #4E5A6A; margin: 22px 0 10px; }
        .bt-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
        .bt-strip::-webkit-scrollbar { display: none; }
        .bt-pick {
          flex: 0 0 auto; width: 96px; cursor: pointer; padding: 0 0 10px; text-align: center;
          background: linear-gradient(160deg, #0C0F16 0%, #07080D 100%);
          border: 1px solid #ffffff14; transition: border-color 150ms ease, transform 150ms ease;
        }
        .bt-pick:hover { transform: translateY(-3px); border-color: #ffffff35; }
        .bt-pick[data-on="true"] { border-color: var(--neon); box-shadow: 0 0 20px color-mix(in srgb, var(--neon) 40%, transparent); }
        .bt-face { height: 66px; display: flex; align-items: flex-end; justify-content: center; overflow: hidden;
          background: linear-gradient(180deg, color-mix(in srgb, var(--neon) 16%, transparent), transparent); }
        .bt-face img { height: 96%; width: auto; object-fit: contain; }
        .bt-ghost { width: 30px; height: 38px; border-radius: 50% 50% 6px 6px; background: color-mix(in srgb, var(--neon) 32%, transparent); margin-bottom: 5px; }
        .bt-pn { font-family: var(--font-heading); font-weight: 900; font-size: 11px; color: #F5F1E8; margin-top: 8px; padding: 0 5px; line-height: 1.15; }
        .bt-pm { font-size: 9px; color: #5C6878; margin-top: 3px; }

        .bt-hud { display: flex; gap: 20px; align-items: baseline; margin: 24px 0 12px; flex-wrap: wrap; }
        .bt-hud span { font-size: 9px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6878; }
        .bt-hud b { font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-left: 7px; }

        .bt-stage { position: relative; }
        .bt-canvas {
          width: 100%; height: auto; display: block; cursor: pointer; touch-action: manipulation;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .bt-flash {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; pointer-events: none;
        }
        .bt-verdict {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(30px, 9vw, 56px); line-height: 1; transform: skewX(-7deg);
          animation: bt-slam 380ms cubic-bezier(.2,1.7,.4,1);
        }
        @keyframes bt-slam { from { transform: skewX(-7deg) scale(2.1); opacity: 0; } }
        .bt-dist { font-size: 11px; font-weight: 900; letter-spacing: 0.26em; text-transform: uppercase; color: #F5F1E8; margin-top: 10px; }
        .bt-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060AE6; padding: 24px;
        }
        .bt-key { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 14px; }
        .bt-tape { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 18px; }
        .bt-dot { width: 26px; height: 5px; background: #ffffff10; }
      `}</style>

      <p className="bt-lede">
        Ten pitches, three outs. Pick your bat and the arm you fancy facing — a better average widens
        your window, and the league&apos;s best strikeout pitchers throw harder and move it more.
      </p>

      {phase === 'setup' && (
        <>
          <p className="bt-lbl">At the plate</p>
          <div className="bt-strip">
            {batters.map(b => (
              <button key={b.id} className="bt-pick" data-on={batter.id === b.id} onClick={() => setBatter(b)}>
                <span className="bt-face">
                  {b.photoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={b.photoUrl} alt="" />
                    : <span className="bt-ghost" />}
                </span>
                <span className="bt-pn">{caps(b.name)}</span>
                <span className="bt-pm">{b.ba.toFixed(3).replace(/^0/, '')} · {b.grade}</span>
              </button>
            ))}
          </div>

          <p className="bt-lbl">On the mound · most strikeouts</p>
          <div className="bt-strip">
            {pitchers.map(p => (
              <button key={p.id} className="bt-pick" data-on={pitcher.id === p.id} onClick={() => setPitcher(p)}>
                <span className="bt-face">
                  {p.photoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.photoUrl} alt="" />
                    : <span className="bt-ghost" />}
                </span>
                <span className="bt-pn">{caps(p.name)}</span>
                <span className="bt-pm">{p.k} K · {p.grade}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="bt-hud">
        <span>Pitch <b>{Math.min(pitchNo + (phase === 'live' ? 1 : 0), PITCHES)}/{PITCHES}</b></span>
        <span>Outs <b style={{ color: outs > 0 ? '#FF4D4D' : undefined }}>{outs}/{OUTS}</b></span>
        <span>Score <b style={{ color: 'var(--neon)' }}>{score}</b></span>
      </div>

      <div className="bt-stage">
        <canvas ref={canvasRef} className="bt-canvas" width={600} height={440} onClick={swing} />

        {flash && (
          <div className="bt-flash">
            <p className="bt-verdict" style={{ color: RESULTS[flash.key].colour, textShadow: `0 0 30px ${RESULTS[flash.key].colour}80` }}>
              {RESULTS[flash.key].label}
            </p>
            {flash.dist > 0 && <p className="bt-dist">{flash.dist} metres</p>}
          </div>
        )}

        {phase !== 'live' && (
          <div className="bt-overlay">
            {phase === 'done' ? (
              <>
                <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--neon)' }}>
                  {outs >= OUTS ? 'Three up, three down' : 'Innings over'}
                </p>
                <p className="ar-num" style={{ fontSize: '58px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>{score}</p>
                <p style={{ fontSize: '11px', color: '#7D8B9C', letterSpacing: '0.08em' }}>
                  {hits} hit{hits === 1 ? '' : 's'} · {homers} home run{homers === 1 ? '' : 's'}
                  {furthest > 0 ? ` · longest ${furthest}m` : ''}
                </p>
                <button className="ar-btn" onClick={() => setPhase('setup')} style={{ marginTop: '20px' }}>
                  <span>Change it up</span>
                </button>
                <button className="ar-btn" onClick={start} style={{ marginTop: '10px', background: 'transparent', color: 'var(--neon)', border: '1px solid var(--neon)', boxShadow: 'none' }}>
                  <span>Same again</span>
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '30ch', lineHeight: 1.6 }}>
                  {caps(batter.name)} facing {caps(pitcher.name)}
                </p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '14px' }}><span>Step in</span></button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="bt-key">Tap the field or hit space to swing</p>

      {log.length > 0 && (
        <div className="bt-tape">
          {Array.from({ length: PITCHES }).map((_, i) => (
            <span key={i} className="bt-dot"
              style={log[i] ? { background: RESULTS[log[i].key].colour } : undefined} />
          ))}
        </div>
      )}
    </>
  )
}