'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* Three lanes running away from you. Balls come down them to be caught and
   runners come down them to be avoided — one collision ends the run. It speeds
   up the longer you last, and runners get more frequent as it goes. */
const LANES = 3
const BASE_SPEED = 0.00042        // fraction of the lane per millisecond
const SPEED_RAMP = 0.0000002      // added per millisecond survived

type Thing = { id: number; lane: number; z: number; kind: 'ball' | 'runner' | 'gold' }
let nextId = 1

export default function FieldingClient() {
  const [phase, setPhase] = useState<'ready' | 'live' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [caught, setCaught] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const lane = useRef(1)
  const things = useRef<Thing[]>([])
  const lastFrame = useRef(0)
  const elapsed = useRef(0)
  const spawnAt = useRef(0)
  const glove = useRef(0)          // catch animation, counts down

  const speed = () => BASE_SPEED + elapsed.current * SPEED_RAMP

  const reset = useCallback(() => {
    lane.current = 1
    things.current = []
    elapsed.current = 0
    spawnAt.current = 0
    glove.current = 0
    setScore(0); setCaught(0); setFlash(null)
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

    // Spawn — runners get more likely the longer you last
    spawnAt.current -= dt
    if (spawnAt.current <= 0) {
      const runnerOdds = Math.min(0.5, 0.16 + elapsed.current / 120000)
      const roll = Math.random()
      const kind: Thing['kind'] = roll < runnerOdds ? 'runner' : roll < runnerOdds + 0.06 ? 'gold' : 'ball'
      const newLane = Math.floor(Math.random() * LANES)
      // Never spawn a runner in a lane that already has one close behind —
      // an unavoidable wall isn't difficulty, it's a bug
      const blocked = kind === 'runner' && things.current.some(t => t.kind === 'runner' && t.z > 0.55)
      if (!blocked) things.current.push({ id: nextId++, lane: newLane, z: 0, kind })
      spawnAt.current = 520 - Math.min(240, elapsed.current / 260) + Math.random() * 220
    }

    // Advance and resolve
    const s = speed() * dt
    for (const t of things.current) t.z += s
    for (const t of things.current) {
      if (t.z < 0.9 || t.z > 1.06) continue
      if (t.lane !== lane.current) continue
      if (t.kind === 'runner') { endRun(); return }
      t.z = 99
      glove.current = 200
      const worth = t.kind === 'gold' ? 50 : 10
      setScore(v => v + worth)
      setCaught(c => c + 1)
      if (t.kind === 'gold') { setFlash('DIVING CATCH'); setTimeout(() => setFlash(null), 900) }
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
    const HORIZON = H * 0.28

    // Sky and grass
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON)
    sky.addColorStop(0, '#0B0D18'); sky.addColorStop(1, '#16233C')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON)
    const grass = ctx.createLinearGradient(0, HORIZON, 0, H)
    grass.addColorStop(0, '#123020'); grass.addColorStop(1, '#0A2214')
    ctx.fillStyle = grass; ctx.fillRect(0, HORIZON, W, H - HORIZON)

    const pool = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, W * 0.8)
    pool.addColorStop(0, '#5CFF6B18'); pool.addColorStop(1, 'transparent')
    ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H)

    // Perspective helpers — where a lane sits at depth z (0 far, 1 at your feet)
    const persp = (z: number) => Math.pow(z, 2.1)
    const yAt = (z: number) => HORIZON + (H - HORIZON) * persp(z)
    const halfAt = (z: number) => W * (0.045 + 0.42 * persp(z))
    const xAt = (l: number, z: number) => W / 2 + (l - 1) * halfAt(z)

    // Lane lines converging to the horizon
    ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 2
    for (const edge of [-1.5, -0.5, 0.5, 1.5]) {
      ctx.beginPath()
      ctx.moveTo(W / 2 + edge * halfAt(0.02), yAt(0.02))
      ctx.lineTo(W / 2 + edge * halfAt(1), yAt(1))
      ctx.stroke()
    }
    // Chalk rungs, drifting toward you
    ctx.strokeStyle = '#ffffff0c'; ctx.lineWidth = 1
    for (let i = 0; i < 9; i++) {
      const z = ((i / 9) + ((elapsed.current * speed() * 0.9) % (1 / 9))) % 1
      ctx.beginPath()
      ctx.moveTo(W / 2 - halfAt(z) * 1.5, yAt(z))
      ctx.lineTo(W / 2 + halfAt(z) * 1.5, yAt(z))
      ctx.stroke()
    }

    // Far to near so nearer things draw over
    const sorted = [...things.current].filter(t => t.z <= 1.3).sort((a, b) => a.z - b.z)
    for (const t of sorted) {
      const x = xAt(t.lane, t.z)
      const y = yAt(t.z)
      const scale = 0.14 + persp(t.z) * 1.5

      if (t.kind === 'runner') {
        // A sliding runner — legs out, coming at you
        const w = 52 * scale, h = 26 * scale
        ctx.save()
        ctx.shadowColor = '#FF4D4D'; ctx.shadowBlur = 14 * scale
        ctx.fillStyle = '#0A0C10'
        ctx.beginPath()
        ctx.ellipse(x, y - h * 0.4, w * 0.55, h * 0.5, -0.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FF4D4D'
        ctx.fillRect(x - w * 0.55, y - h * 0.1, w * 0.5, h * 0.16)   // trailing leg
        ctx.beginPath(); ctx.arc(x + w * 0.36, y - h * 0.72, h * 0.3, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        // dust
        ctx.fillStyle = '#C9A87840'
        ctx.beginPath(); ctx.ellipse(x - w * 0.5, y + h * 0.1, w * 0.5, h * 0.22, 0, 0, Math.PI * 2); ctx.fill()
      } else {
        const r = 9 * scale
        const gold = t.kind === 'gold'
        ctx.save()
        ctx.shadowColor = gold ? '#FFD700' : '#F5F1E8'
        ctx.shadowBlur = (gold ? 22 : 12) * Math.max(scale, 0.6)
        ctx.fillStyle = gold ? '#FFD700' : '#F5F1E8'
        ctx.beginPath(); ctx.arc(x, y - r * 1.6, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        if (r > 4) {
          ctx.strokeStyle = gold ? '#8A6D00' : '#C41E3A'
          ctx.lineWidth = Math.max(1, r * 0.22)
          ctx.beginPath(); ctx.arc(x - r * 1.1, y - r * 1.6, r * 0.98, -0.9, 0.9); ctx.stroke()
        }
      }
    }

    // The fielder — a glove at the bottom of your lane
    const fx = xAt(lane.current, 1)
    const fy = yAt(1) - H * 0.045
    const pop = glove.current > 0 ? 1.22 : 1
    ctx.save()
    ctx.translate(fx, fy); ctx.scale(pop, pop)
    ctx.shadowColor = '#5CFF6B'; ctx.shadowBlur = 20
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath()
    ctx.ellipse(0, 0, W * 0.055, W * 0.062, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#5CFF6B'; ctx.lineWidth = 3
    ctx.stroke()
    // webbing
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-W * 0.03, -W * 0.03); ctx.lineTo(W * 0.03, -W * 0.008)
    ctx.moveTo(-W * 0.03, 0); ctx.lineTo(W * 0.03, W * 0.018)
    ctx.stroke()
    ctx.restore()
  }, [])

  // Loop
  useEffect(() => {
    if (phase !== 'live') { draw(); return }
    lastFrame.current = 0
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [phase, tick, draw])

  // Keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a'].includes(e.key)) { e.preventDefault(); lane.current = Math.max(0, lane.current - 1) }
      if (['ArrowRight', 'd'].includes(e.key)) { e.preventDefault(); lane.current = Math.min(LANES - 1, lane.current + 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Swipe and tap-to-side
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    let sx = 0
    const start = (e: TouchEvent) => { sx = e.touches[0].clientX }
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      if (Math.abs(dx) > 26) {
        lane.current = dx > 0
          ? Math.min(LANES - 1, lane.current + 1)
          : Math.max(0, lane.current - 1)
      } else {
        // A tap moves toward the side you tapped
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
        .fd-hud { display: flex; gap: 22px; align-items: baseline; margin-bottom: 14px; flex-wrap: wrap; }
        .fd-hud span { font-size: 9px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6878; }
        .fd-hud b { font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-left: 7px; }
        .fd-stage { position: relative; }
        .fd-canvas {
          width: 100%; height: auto; display: block; touch-action: none; cursor: pointer;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .fd-flash {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        .fd-flash p {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(22px, 6vw, 38px); color: #FFD700; transform: skewX(-7deg);
          text-shadow: 0 0 28px #FFD70090; animation: fd-slam 340ms cubic-bezier(.2,1.7,.4,1);
        }
        @keyframes fd-slam { from { transform: skewX(-7deg) scale(1.8); opacity: 0; } }
        .fd-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060AE6; padding: 24px;
        }
        .fd-key { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 14px; }
        .fd-legend { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 22px; }
        .fd-item {
          display: flex; align-items: center; gap: 8px; padding: 9px 13px;
          border: 1px solid #ffffff12; background: #ffffff05; font-size: 11px; color: #B8C4D2;
        }
        .fd-pip { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
      `}</style>

      <p className="fd-lede">
        Three lanes coming at you. Take everything hit your way, and get out of the road of the
        runners — one collision and the run is over. It quickens the longer you stay out there.
      </p>

      <div className="fd-hud">
        <span>Score <b>{score}</b></span>
        <span>Caught <b>{caught}</b></span>
        <span>Best <b style={{ color: 'var(--neon)' }}>{best}</b></span>
      </div>

      <div className="fd-stage">
        <canvas ref={canvasRef} className="fd-canvas" width={600} height={480} />

        {flash && <div className="fd-flash"><p>{flash}</p></div>}

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
                <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '28ch', lineHeight: 1.6 }}>
                  Move with the arrows, or swipe and tap the sides on a phone.
                </p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '14px' }}><span>Take the field</span></button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="fd-key">Arrows or A / D · swipe or tap a side</p>

      <div className="fd-legend">
        <span className="fd-item"><span className="fd-pip" style={{ background: '#F5F1E8', boxShadow: '0 0 8px #F5F1E8' }} />Ball <b style={{ color: 'var(--neon)', marginLeft: 4 }}>10</b></span>
        <span className="fd-item"><span className="fd-pip" style={{ background: '#FFD700', boxShadow: '0 0 8px #FFD700' }} />Screamer <b style={{ color: 'var(--neon)', marginLeft: 4 }}>50</b></span>
        <span className="fd-item"><span className="fd-pip" style={{ background: '#FF4D4D', boxShadow: '0 0 8px #FF4D4D' }} />Runner · avoid</span>
      </div>
    </>
  )
}