'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* Three lanes, three stances. Straight on in the middle, fronthand reaching
   left, backhand reaching right — the way a fielder actually takes a ball
   either side of them.

   Four kinds of ball, each arriving differently: a grounder skipping in, a
   liner coming fast and flat, a pop fly hanging up, and the screamer that
   pays. Runners come down the lanes too, and one takes you out. */

const LANES = 3
const BASE_SPEED = 0.00026
const SPEED_RAMP = 0.00000009
const RAMP_DELAY = 12000          // no ramp at all for the first stretch

type Kind = 'grounder' | 'liner' | 'fly' | 'screamer' | 'runner'
type Thing = { id: number; lane: number; z: number; kind: Kind; rate: number; hop: number }
let nextId = 1

const BALL: Record<string, { label: string; points: number; colour: string; rate: number }> = {
  grounder: { label: 'Grounder', points: 10, colour: '#F5F1E8', rate: 0.85 },
  liner:    { label: 'Line drive', points: 20, colour: '#7DF9FF', rate: 1.55 },
  fly:      { label: 'Pop fly',  points: 15, colour: '#C6FF00', rate: 0.62 },
  screamer: { label: 'Screamer', points: 60, colour: '#FFD700', rate: 1.75 },
}

export default function FieldingClient() {
  const [phase, setPhase] = useState<'ready' | 'live' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [caught, setCaught] = useState(0)
  const [streak, setStreak] = useState(0)
  const [flash, setFlash] = useState<{ text: string; colour: string } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const lane = useRef(1)
  const facing = useRef(1)          // rendered stance, eases toward lane
  const things = useRef<Thing[]>([])
  const lastFrame = useRef(0)
  const elapsed = useRef(0)
  const spawnAt = useRef(600)
  const glove = useRef(0)
  const streakRef = useRef(0)

  const speed = () => BASE_SPEED + Math.max(0, elapsed.current - RAMP_DELAY) * SPEED_RAMP

  const reset = useCallback(() => {
    lane.current = 1; facing.current = 1
    things.current = []
    elapsed.current = 0
    spawnAt.current = 600
    glove.current = 0
    streakRef.current = 0
    setScore(0); setCaught(0); setStreak(0); setFlash(null)
  }, [])

  const endRun = useCallback(() => {
    setPhase('over')
    setScore(s => { setBest(b => Math.max(b, s)); return s })
  }, [])

  const tick = useCallback((now: number) => {
    if (lastFrame.current === 0) lastFrame.current = now
    const dt = Math.min(now - lastFrame.current, 48)
    lastFrame.current = now
    elapsed.current += dt

    // Stance eases toward the lane rather than snapping
    facing.current += (lane.current - facing.current) * Math.min(1, dt / 90)

    spawnAt.current -= dt
    if (spawnAt.current <= 0) {
      // Runners stay rare early and never stack up in one lane
      const runnerOdds = Math.min(0.34, 0.05 + Math.max(0, elapsed.current - 15000) / 200000)
      const roll = Math.random()
      let kind: Kind
      if (roll < runnerOdds) kind = 'runner'
      else {
        const r = Math.random()
        kind = r < 0.42 ? 'grounder' : r < 0.72 ? 'liner' : r < 0.94 ? 'fly' : 'screamer'
      }
      const newLane = Math.floor(Math.random() * LANES)
      const crowded = things.current.some(t => t.lane === newLane && t.z > 0.42)
      const wall = kind === 'runner' && things.current.some(t => t.kind === 'runner' && t.z > 0.5)
      if (!crowded && !wall) {
        things.current.push({
          id: nextId++, lane: newLane, z: 0, kind,
          rate: kind === 'runner' ? 1 : BALL[kind].rate,
          hop: Math.random() * Math.PI,
        })
      }
      spawnAt.current = 700 - Math.min(300, Math.max(0, elapsed.current - RAMP_DELAY) / 320) + Math.random() * 300
    }

    const base = speed() * dt
    for (const t of things.current) t.z += base * t.rate

    for (const t of things.current) {
      if (t.z < 0.88 || t.z > 1.08) continue
      if (t.lane !== lane.current) continue
      if (t.kind === 'runner') { endRun(); return }
      t.z = 99
      glove.current = 220
      const meta = BALL[t.kind]
      streakRef.current += 1
      const bonus = streakRef.current >= 5 ? Math.floor(streakRef.current / 5) * 5 : 0
      setStreak(streakRef.current)
      setScore(v => v + meta.points + bonus)
      setCaught(c => c + 1)
      if (t.kind === 'screamer' || streakRef.current % 10 === 0) {
        setFlash({ text: t.kind === 'screamer' ? 'SCREAMER' : `${streakRef.current} CLEAN`, colour: meta.colour })
        setTimeout(() => setFlash(null), 900)
      }
    }

    // A ball through your lane breaks the streak
    for (const t of things.current) {
      if (t.z > 1.08 && t.z < 90 && t.kind !== 'runner') {
        if (streakRef.current > 0) { streakRef.current = 0; setStreak(0) }
        t.z = 99
      }
    }

    things.current = things.current.filter(t => t.z < 1.3)
    if (glove.current > 0) glove.current -= dt

    draw()
    raf.current = requestAnimationFrame(tick)
  }, [endRun])

  const draw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height
    const HORIZON = H * 0.30

    // ── The park ──
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON)
    sky.addColorStop(0, '#080A14'); sky.addColorStop(1, '#152238')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON)

    // Floodlight towers
    for (const fx of [W * 0.16, W * 0.84]) {
      ctx.strokeStyle = '#1B2436'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(fx, HORIZON); ctx.lineTo(fx, H * 0.09); ctx.stroke()
      ctx.fillStyle = '#26314A'; ctx.fillRect(fx - 22, H * 0.055, 44, 22)
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        ctx.fillStyle = '#F3ECCB'
        ctx.beginPath(); ctx.arc(fx - 16 + c * 10.5, H * 0.062 + r * 10, 3, 0, Math.PI * 2); ctx.fill()
      }
      const glow = ctx.createRadialGradient(fx, H * 0.07, 4, fx, H * 0.07, W * 0.4)
      glow.addColorStop(0, '#F3ECCB22'); glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
    }

    // Outfield wall with the sponsor band
    ctx.fillStyle = '#0D1522'; ctx.fillRect(0, HORIZON - H * 0.045, W, H * 0.045)
    ctx.fillStyle = '#5CFF6B22'; ctx.fillRect(0, HORIZON - H * 0.045, W, 2)
    ctx.fillStyle = '#5CFF6B18'
    ctx.font = `900 ${Math.round(H * 0.022)}px var(--font-heading), sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('GRASSROOTS FANTASY', W / 2, HORIZON - H * 0.014)

    // Grass, with mown stripes
    const grass = ctx.createLinearGradient(0, HORIZON, 0, H)
    grass.addColorStop(0, '#153A24'); grass.addColorStop(1, '#0A2214')
    ctx.fillStyle = grass; ctx.fillRect(0, HORIZON, W, H - HORIZON)

    const persp = (z: number) => Math.pow(z, 2.1)
    const yAt = (z: number) => HORIZON + (H - HORIZON) * persp(z)
    const halfAt = (z: number) => W * (0.05 + 0.4 * persp(z))
    const xAt = (l: number, z: number) => W / 2 + (l - 1) * halfAt(z)

    // Stripes drifting toward you
    for (let i = 0; i < 7; i++) {
      const z0 = ((i / 7) + ((elapsed.current * speed() * 0.85) % (1 / 7))) % 1
      const z1 = Math.min(1, z0 + 1 / 14)
      ctx.fillStyle = '#ffffff05'
      ctx.beginPath()
      ctx.moveTo(0, yAt(z0)); ctx.lineTo(W, yAt(z0))
      ctx.lineTo(W, yAt(z1)); ctx.lineTo(0, yAt(z1))
      ctx.fill()
    }

    // Lane chalk
    ctx.strokeStyle = '#ffffff18'; ctx.lineWidth = 2
    for (const edge of [-1.5, -0.5, 0.5, 1.5]) {
      ctx.beginPath()
      ctx.moveTo(W / 2 + edge * halfAt(0.02), yAt(0.02))
      ctx.lineTo(W / 2 + edge * halfAt(1), yAt(1))
      ctx.stroke()
    }

    // ── The things coming ──
    const sorted = [...things.current].filter(t => t.z <= 1.3).sort((a, b) => a.z - b.z)
    for (const t of sorted) {
      const x = xAt(t.lane, t.z)
      const ground = yAt(t.z)
      const scale = 0.14 + persp(t.z) * 1.5

      if (t.kind === 'runner') {
        const w = 54 * scale, h = 27 * scale
        ctx.fillStyle = '#C9A87838'
        ctx.beginPath(); ctx.ellipse(x - w * 0.5, ground + h * 0.1, w * 0.55, h * 0.24, 0, 0, Math.PI * 2); ctx.fill()
        ctx.save()
        ctx.shadowColor = '#FF4D4D'; ctx.shadowBlur = 15 * Math.max(scale, 0.5)
        ctx.fillStyle = '#0A0C10'
        ctx.beginPath(); ctx.ellipse(x, ground - h * 0.42, w * 0.56, h * 0.5, -0.2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#FF4D4D'
        ctx.fillRect(x - w * 0.56, ground - h * 0.12, w * 0.5, h * 0.16)
        ctx.beginPath(); ctx.arc(x + w * 0.37, ground - h * 0.74, h * 0.3, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        continue
      }

      // Height above the ground depends on how it was hit
      const meta = BALL[t.kind]
      let lift = 0
      if (t.kind === 'grounder') lift = Math.abs(Math.sin(t.z * 9 + t.hop)) * H * 0.035 * persp(t.z)
      else if (t.kind === 'liner' || t.kind === 'screamer') lift = H * 0.10 * (1 - persp(t.z) * 0.55)
      else lift = Math.sin(t.z * Math.PI) * H * 0.30 * (0.35 + persp(t.z) * 0.65)

      // Shadow on the grass sells the height
      const sh = Math.max(2, 8 * scale * (1 - lift / (H * 0.3)))
      ctx.fillStyle = '#00000055'
      ctx.beginPath(); ctx.ellipse(x, ground, sh * 1.5, sh * 0.5, 0, 0, Math.PI * 2); ctx.fill()

      const r = 9 * scale
      const y = ground - lift - r
      ctx.save()
      ctx.shadowColor = meta.colour
      ctx.shadowBlur = (t.kind === 'screamer' ? 24 : 13) * Math.max(scale, 0.6)
      ctx.fillStyle = meta.colour
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      if (r > 4) {
        ctx.strokeStyle = t.kind === 'screamer' ? '#8A6D00' : '#C41E3A'
        ctx.lineWidth = Math.max(1, r * 0.22)
        ctx.beginPath(); ctx.arc(x - r * 1.1, y, r * 0.98, -0.9, 0.9); ctx.stroke()
      }
      // Line drives leave a streak
      if ((t.kind === 'liner' || t.kind === 'screamer') && r > 3) {
        const trail = ctx.createLinearGradient(x, y, x, y - H * 0.09)
        trail.addColorStop(0, `${meta.colour}70`); trail.addColorStop(1, 'transparent')
        ctx.strokeStyle = trail; ctx.lineWidth = r * 0.8
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - H * 0.09); ctx.stroke()
      }
    }

    // ── The fielder ──
    drawFielder(ctx, W, H, xAt(facing.current, 1), yAt(1) - H * 0.02, facing.current)
  }, [])

  /* Three stances. Middle lane is square on, glove in front. Left lane reaches
     across fronthand, right lane turns the glove over for the backhand. */
  function drawFielder(ctx: CanvasRenderingContext2D, W: number, H: number, x: number, y: number, f: number) {
    const side = f - 1                       // -1 fronthand, 0 square, +1 backhand
    const lean = side * 0.2
    const s = W * 0.001
    const pop = glove.current > 0 ? 1.16 : 1

    ctx.save()
    ctx.translate(x, y)

    // Shadow
    ctx.fillStyle = '#00000055'
    ctx.beginPath(); ctx.ellipse(0, 4, 46 * s * 10, 10 * s * 10, 0, 0, Math.PI * 2); ctx.fill()

    ctx.rotate(lean * 0.22)

    // Legs, wider as he reaches
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 13; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(-22 - Math.max(0, -side) * 16, 0); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(22 + Math.max(0, side) * 16, 0); ctx.stroke()

    // Torso
    ctx.strokeStyle = '#5CFF6B'; ctx.lineWidth = 22
    ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(-side * 5, -92); ctx.stroke()

    // Head and cap
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(-side * 6, -106, 15, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#5CFF6B'
    ctx.beginPath(); ctx.arc(-side * 6, -108, 15, Math.PI, 0); ctx.fill()
    ctx.fillRect(-side * 6, -111, side >= 0 ? 20 : -20, 5)

    // Throwing hand tucks behind
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 9
    ctx.beginPath(); ctx.moveTo(-side * 5, -86); ctx.lineTo(-side * 34, -66); ctx.stroke()

    // Glove arm — across the body fronthand, turned over backhand
    const gx = side * 52
    const gy = side === 0 ? -44 : -34
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 10
    ctx.beginPath(); ctx.moveTo(-side * 5, -84); ctx.lineTo(gx, gy); ctx.stroke()

    ctx.save()
    ctx.translate(gx, gy)
    ctx.rotate(side * 0.9)          // the turnover on the backhand side
    ctx.scale(pop, pop)
    ctx.shadowColor = '#5CFF6B'; ctx.shadowBlur = 22
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 34, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#5CFF6B'; ctx.lineWidth = 4; ctx.stroke()
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-16, -14); ctx.lineTo(16, -4)
    ctx.moveTo(-16, 2);  ctx.lineTo(16, 12)
    ctx.stroke()
    ctx.restore()

    ctx.restore()
  }

  useEffect(() => {
    if (phase !== 'live') { draw(); return }
    lastFrame.current = 0
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [phase, tick, draw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault(); lane.current = Math.max(0, lane.current - 1) }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { e.preventDefault(); lane.current = Math.min(LANES - 1, lane.current + 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    let sx = 0
    const start = (e: TouchEvent) => { sx = e.touches[0].clientX }
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      if (Math.abs(dx) > 26) {
        lane.current = dx > 0 ? Math.min(LANES - 1, lane.current + 1) : Math.max(0, lane.current - 1)
      } else {
        const rect = cv.getBoundingClientRect()
        const rel = (e.changedTouches[0].clientX - rect.left) / rect.width
        if (rel < 0.4) lane.current = Math.max(0, lane.current - 1)
        else if (rel > 0.6) lane.current = Math.min(LANES - 1, lane.current + 1)
      }
    }
    cv.addEventListener('touchstart', start, { passive: true })
    cv.addEventListener('touchend', end, { passive: true })
    return () => { cv.removeEventListener('touchstart', start); cv.removeEventListener('touchend', end) }
  }, [])

  function start() { reset(); setPhase('live') }

  return (
    <>
      <style>{`
        .fd-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .fd-hud {
          display: flex; align-items: stretch; gap: 1px; margin-bottom: 12px;
          background: #ffffff10; border: 1px solid #ffffff12;
        }
        .fd-stat { flex: 1; background: #07080D; padding: 11px 8px; text-align: center; }
        .fd-stat span { display: block; font-size: 8px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #4E5A6A; }
        .fd-stat b { display: block; font-family: var(--font-heading); font-size: 20px; color: #F5F1E8; margin-top: 3px; }
        .fd-stage { position: relative; }
        .fd-canvas {
          width: 100%; height: auto; display: block; touch-action: none; cursor: pointer;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .fd-flash { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
        .fd-flash p {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(22px, 6vw, 40px); transform: skewX(-7deg);
          animation: fd-slam 340ms cubic-bezier(.2,1.7,.4,1);
        }
        @keyframes fd-slam { from { transform: skewX(-7deg) scale(1.8); opacity: 0; } }
        .fd-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060AE8; padding: 24px;
        }
        .fd-key { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 14px; }
        .fd-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 22px; }
        .fd-item {
          display: flex; align-items: center; gap: 9px; padding: 11px 13px;
          border: 1px solid #ffffff12; background: #ffffff05; font-size: 11px; color: #B8C4D2;
        }
        .fd-pip { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
        .fd-val { margin-left: auto; font-family: var(--font-heading); font-weight: 900; color: var(--neon); }
      `}</style>

      <p className="fd-lede">
        Everything comes at you down three lanes. Square up in the middle, reach fronthand to your
        left, turn it over backhand to your right — and get out of the road of the runners.
      </p>

      <div className="fd-hud">
        <span className="fd-stat"><span>Score</span><b>{score}</b></span>
        <span className="fd-stat"><span>Clean</span><b>{caught}</b></span>
        <span className="fd-stat"><span>Streak</span><b style={{ color: streak >= 5 ? 'var(--neon)' : undefined }}>{streak}</b></span>
        <span className="fd-stat"><span>Best</span><b style={{ color: 'var(--neon)' }}>{best}</b></span>
      </div>

      <div className="fd-stage">
        <canvas ref={canvasRef} className="fd-canvas" width={600} height={480} />

        {flash && (
          <div className="fd-flash">
            <p style={{ color: flash.colour, textShadow: `0 0 28px ${flash.colour}90` }}>{flash.text}</p>
          </div>
        )}

        {phase !== 'live' && (
          <div className="fd-overlay">
            {phase === 'over' ? (
              <>
                <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#FF4D4D' }}>Taken out</p>
                <p className="ar-num" style={{ fontSize: '54px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>{score}</p>
                <p style={{ fontSize: '11px', color: '#7D8B9C' }}>{caught} clean {caught === 1 ? 'take' : 'takes'}</p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '20px' }}><span>Back out there</span></button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '30ch', lineHeight: 1.6 }}>
                  Grounders skip in low. Liners come flat and fast. Pop flies hang. Five clean in a
                  row starts paying a bonus.
                </p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '16px' }}><span>Take the field</span></button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="fd-key">Arrows or A / D · swipe or tap a side</p>

      <div className="fd-legend">
        {Object.entries(BALL).map(([k, v]) => (
          <span key={k} className="fd-item">
            <span className="fd-pip" style={{ background: v.colour, boxShadow: `0 0 8px ${v.colour}` }} />
            {v.label}<span className="fd-val">{v.points}</span>
          </span>
        ))}
        <span className="fd-item" style={{ gridColumn: '1 / -1' }}>
          <span className="fd-pip" style={{ background: '#FF4D4D', boxShadow: '0 0 8px #FF4D4D' }} />
          Runner — get out of the road
        </span>
      </div>
    </>
  )
}