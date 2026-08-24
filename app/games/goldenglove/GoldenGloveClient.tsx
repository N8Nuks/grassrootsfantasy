'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* A sixty-second fielding drill. Three lanes running away from you, a coach
   hitting from one spot, and five ways to field what comes.

   The fielder holds his ground and reaches — left lane fronthand, right lane
   backhand, and in the middle you read the ball: a high bouncer you charge, a
   two hopper you stay back on. A line drive in any lane has to be jumped. */

type Pose = 'square' | 'fronthand' | 'backhand' | 'charge' | 'jump'
type Kind = 'left' | 'right' | 'bouncer' | 'hopper' | 'liner'

const ART: Record<Pose, string> = {
  square: '/field-square.png',
  fronthand: '/field-fronthand.png',
  backhand: '/field-backhand.png',
  charge: '/field-charge.png',
  jump: '/field-jump.png',
}

/* Each ball wants one answer. Points reward the harder reads. */
const BALLS: Record<Kind, { pose: Pose; lane: number; points: number; colour: string }> = {
  left:    { pose: 'fronthand', lane: 0,  points: 10, colour: '#FFC93C' },
  right:   { pose: 'backhand',  lane: 2,  points: 15, colour: '#7DF9FF' },
  bouncer: { pose: 'charge',    lane: 1,  points: 20, colour: '#FF9E2C' },
  hopper:  { pose: 'square',    lane: 1,  points: 10, colour: '#5CFF6B' },
  liner:   { pose: 'jump',      lane: -1, points: 30, colour: '#FF6BD5' },
}

const ROUND_MS = 60_000
const POSE_HOLD = 420

/* The pace across the minute: a rising floor with bursts that fall back but
   never all the way. */
function flightMs(elapsed: number) {
  const t = elapsed / ROUND_MS
  const floor = 1750 - t * 700
  const burst = Math.sin(t * Math.PI * 5) > 0.82 ? 320 : 0
  return Math.max(620, floor - burst)
}
function gapMs(elapsed: number) {
  return Math.max(430, 1000 - (elapsed / ROUND_MS) * 420)
}

type Ball = { id: number; kind: Kind; lane: number; born: number; dur: number; resolved: boolean }
let nextId = 1

export default function GoldenGloveClient() {
  const [phase, setPhase] = useState<'ready' | 'count' | 'live' | 'done'>('ready')
  const [count, setCount] = useState(3)
  const [score, setScore] = useState(0)
  const [clean, setClean] = useState(0)
  const [faced, setFaced] = useState(0)
  const [best, setBest] = useState(0)
  const [left, setLeft] = useState(60)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const imgs = useRef<Partial<Record<Pose, HTMLImageElement>>>({})

  const startedAt = useRef(0)
  const balls = useRef<Ball[]>([])
  const spawnAt = useRef(0)
  const pose = useRef<Pose>('square')
  const poseUntil = useRef(0)
  const pops = useRef<{ x: number; y: number; text: string; colour: string; life: number }[]>([])
  const miss = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const after = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  // Load the five figures once
  useEffect(() => {
    ;(Object.keys(ART) as Pose[]).forEach(k => {
      const img = new Image()
      img.src = ART[k]
      img.onload = () => { imgs.current[k] = img }
    })
    return clearTimers
  }, [])

  /* Answering a ball. The nearest unresolved one is the one you're playing. */
  const answer = useCallback((p: Pose) => {
    if (phase !== 'live') return
    pose.current = p
    poseUntil.current = performance.now() + POSE_HOLD

    const now = performance.now()
    const live = balls.current
      .filter(b => !b.resolved && (now - b.born) / b.dur > 0.45)
      .sort((a, b) => (now - b.born) / b.dur - (now - a.born) / a.dur)[0]
    if (!live) return

    const want = BALLS[live.kind]
    live.resolved = true
    setFaced(f => f + 1)

    if (want.pose === p) {
      setScore(s => s + want.points)
      setClean(c => c + 1)
      pops.current.push({ x: 0.5, y: 0.72, text: `+${want.points}`, colour: want.colour, life: 900 })
    } else {
      miss.current = 700
    }
  }, [phase])

  const endRun = useCallback(() => {
    clearTimers()
    setScore(s => { setBest(b => Math.max(b, s)); return s })
    setPhase('done')
  }, [])

  const draw = useCallback((now: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height
    const HORIZON = H * 0.24

    // ── The park ──
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON)
    sky.addColorStop(0, '#080A14'); sky.addColorStop(1, '#16233C')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON)
    for (const fx of [W * 0.16, W * 0.84]) {
      ctx.strokeStyle = '#1B2436'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(fx, HORIZON); ctx.lineTo(fx, H * 0.05); ctx.stroke()
      ctx.fillStyle = '#26314A'; ctx.fillRect(fx - 20, H * 0.03, 40, 18)
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        ctx.fillStyle = '#F3ECCB'
        ctx.beginPath(); ctx.arc(fx - 14 + c * 9.5, H * 0.037 + r * 8, 2.6, 0, Math.PI * 2); ctx.fill()
      }
      const glow = ctx.createRadialGradient(fx, H * 0.045, 4, fx, H * 0.045, W * 0.42)
      glow.addColorStop(0, '#F3ECCB1C'); glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
    }
    ctx.fillStyle = '#0D1522'; ctx.fillRect(0, HORIZON - H * 0.035, W, H * 0.035)
    ctx.fillStyle = '#FFC93C28'; ctx.fillRect(0, HORIZON - H * 0.035, W, 2)

    const grass = ctx.createLinearGradient(0, HORIZON, 0, H)
    grass.addColorStop(0, '#123A22'); grass.addColorStop(1, '#0A2214')
    ctx.fillStyle = grass; ctx.fillRect(0, HORIZON, W, H - HORIZON)

    // Perspective: z runs 0 at the coach to 1 at your feet
    const persp = (z: number) => Math.pow(z, 2.1)
    const yAt = (z: number) => HORIZON + (H - HORIZON) * persp(z)
    const halfAt = (z: number) => W * (0.04 + 0.4 * persp(z))
    const xAt = (l: number, z: number) => W / 2 + (l - 1) * halfAt(z)

    for (let i = 0; i < 6; i++) {
      const z0 = i / 6, z1 = Math.min(1, z0 + 1 / 12)
      ctx.fillStyle = '#ffffff05'
      ctx.beginPath()
      ctx.moveTo(0, yAt(z0)); ctx.lineTo(W, yAt(z0))
      ctx.lineTo(W, yAt(z1)); ctx.lineTo(0, yAt(z1))
      ctx.fill()
    }

    ctx.strokeStyle = '#ffffff16'; ctx.lineWidth = 2
    for (const edge of [-1.5, -0.5, 0.5, 1.5]) {
      ctx.beginPath()
      ctx.moveTo(W / 2 + edge * halfAt(0.02), yAt(0.02))
      ctx.lineTo(W / 2 + edge * halfAt(1), yAt(1))
      ctx.stroke()
    }

    // Cones marking the near end of each lane
    for (const l of [0, 1, 2]) {
      const cx = xAt(l, 0.9), cy = yAt(0.9)
      ctx.fillStyle = '#FF7A2E'
      ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx, cy - 18); ctx.lineTo(cx + 7, cy); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#C4551A'
      ctx.beginPath(); ctx.ellipse(cx, cy, 9, 3, 0, 0, Math.PI * 2); ctx.fill()
    }

    // The coach, at the vanishing point
    const cxx = W / 2, cyy = HORIZON + H * 0.03
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cxx, cyy); ctx.lineTo(cxx - 5, cyy + 12); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cxx, cyy); ctx.lineTo(cxx + 6, cyy + 12); ctx.stroke()
    ctx.strokeStyle = '#2E4A5C'; ctx.lineWidth = 8
    ctx.beginPath(); ctx.moveTo(cxx, cyy); ctx.lineTo(cxx, cyy - 13); ctx.stroke()
    ctx.fillStyle = '#8C6A46'
    ctx.beginPath(); ctx.arc(cxx, cyy - 18, 4.6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#B9BBC4'; ctx.lineWidth = 2.6
    ctx.beginPath(); ctx.moveTo(cxx + 4, cyy - 11); ctx.lineTo(cxx + 18, cyy - 17); ctx.stroke()

    if (phase === 'live') {
      const elapsed = now - startedAt.current
      setLeft(Math.max(0, Math.ceil((ROUND_MS - elapsed) / 1000)))
      if (elapsed >= ROUND_MS) { endRun(); return }

      if (now >= spawnAt.current) {
        const roll = Math.random()
        const kind: Kind = roll < 0.28 ? 'left'
          : roll < 0.56 ? 'right'
          : roll < 0.72 ? 'bouncer'
          : roll < 0.88 ? 'hopper' : 'liner'
        const lane = BALLS[kind].lane === -1 ? Math.floor(Math.random() * 3) : BALLS[kind].lane
        balls.current.push({ id: nextId++, kind, lane, born: now, dur: flightMs(elapsed), resolved: false })
        spawnAt.current = now + gapMs(elapsed)
      }

      for (const b of balls.current) {
        if ((now - b.born) / b.dur > 1.08 && !b.resolved) {
          b.resolved = true
          miss.current = 700
          setFaced(f => f + 1)
        }
      }
      balls.current = balls.current.filter(b => (now - b.born) / b.dur < 1.35)

      // ── The balls, far to near ──
      const sorted = [...balls.current].sort((a, b) => b.born - a.born)
      for (const b of sorted) {
        const p = Math.min(1.3, (now - b.born) / b.dur)
        if (b.resolved && p > 1.08) continue
        const z = Math.min(1, p)
        const x = xAt(b.lane, z)
        const ground = yAt(z)
        const scale = 0.12 + persp(z) * 1.45

        // Each kind flies its own way, which is the tell
        let air = 0
        if (b.kind === 'bouncer') air = Math.abs(Math.sin(z * 5.2)) * H * 0.14 * persp(z)
        else if (b.kind === 'hopper') air = Math.abs(Math.sin(z * 9.4)) * H * 0.05 * persp(z)
        else if (b.kind === 'liner') air = H * 0.13 * (1 - persp(z) * 0.35)
        else air = Math.abs(Math.sin(z * 11)) * H * 0.022 * persp(z)

        const sh = Math.max(2, 8 * scale * (1 - air / (H * 0.15)))
        ctx.fillStyle = '#00000055'
        ctx.beginPath(); ctx.ellipse(x, ground, sh * 1.6, sh * 0.5, 0, 0, Math.PI * 2); ctx.fill()

        const r = 9 * scale
        const y = ground - air - r
        ctx.save()
        ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 12 * Math.max(scale, 0.5)
        ctx.fillStyle = '#E8FF3D'
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        if (r > 4) {
          ctx.strokeStyle = '#C41E3A'; ctx.lineWidth = Math.max(1, r * 0.22)
          ctx.beginPath(); ctx.arc(x - r * 1.1, y, r * 0.98, -0.9, 0.9); ctx.stroke()
        }
        if (b.kind === 'liner' && r > 3) {
          const trail = ctx.createLinearGradient(x, y, x, y - H * 0.08)
          trail.addColorStop(0, '#E8FF3D66'); trail.addColorStop(1, 'transparent')
          ctx.strokeStyle = trail; ctx.lineWidth = r * 0.8
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - H * 0.08); ctx.stroke()
        }
      }
    }

    // ── The fielder ──
    if (now > poseUntil.current) pose.current = 'square'
    const art = imgs.current[pose.current]
    if (art) {
      const fh = H * 0.42
      const fw = fh * (art.width / art.height)
      ctx.save()
      ctx.shadowColor = '#00000090'; ctx.shadowBlur = 22
      ctx.drawImage(art, W / 2 - fw / 2, H * 0.98 - fh, fw, fh)
      ctx.restore()
    }

    // ── Points off the glove ──
    for (const p of pops.current) {
      if (phase === 'live') p.life -= 16
      const k = 1 - p.life / 900
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - k * k)
      ctx.font = `900 ${Math.round(H * 0.085)}px var(--font-heading), sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = p.colour
      ctx.shadowColor = p.colour; ctx.shadowBlur = 26
      ctx.fillText(p.text, p.x * W, p.y * H - k * H * 0.18)
      ctx.restore()
    }
    pops.current = pops.current.filter(p => p.life > 0)

    // ── The miss ──
    if (miss.current > 0) {
      if (phase === 'live') miss.current -= 16
      const k = 1 - miss.current / 700
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - k * k)
      ctx.font = `900 ${Math.round(H * 0.34)}px var(--font-heading), sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FF4D4D'
      ctx.shadowColor = '#FF4D4D'; ctx.shadowBlur = 40
      ctx.fillText('!', W / 2, H * 0.56 + k * H * 0.04)
      ctx.restore()
    }

    raf.current = requestAnimationFrame(draw)
  }, [phase, endRun])

  useEffect(() => {
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [draw])

  // Keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Pose> = {
        ArrowLeft: 'fronthand', a: 'fronthand', A: 'fronthand',
        ArrowRight: 'backhand', d: 'backhand', D: 'backhand',
        ArrowUp: 'charge', w: 'charge', W: 'charge',
        ArrowDown: 'square', s: 'square', S: 'square',
      }
      if (e.code === 'Space') { e.preventDefault(); answer('jump'); return }
      const p = map[e.key]
      if (!p) return
      e.preventDefault()
      answer(p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer])

  // Swipe and tap
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    let sx = 0, sy = 0
    const start = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      const dy = e.changedTouches[0].clientY - sy
      if (Math.abs(dx) < 26 && Math.abs(dy) < 26) { answer('jump'); return }
      if (Math.abs(dx) > Math.abs(dy)) answer(dx > 0 ? 'backhand' : 'fronthand')
      else answer(dy > 0 ? 'square' : 'charge')
    }
    cv.addEventListener('touchstart', start, { passive: true })
    cv.addEventListener('touchend', end, { passive: true })
    return () => { cv.removeEventListener('touchstart', start); cv.removeEventListener('touchend', end) }
  }, [answer])

  function start() {
    clearTimers()
    balls.current = []
    pops.current = []
    miss.current = 0
    pose.current = 'square'
    setScore(0); setClean(0); setFaced(0); setLeft(60)
    setPhase('count'); setCount(3)
    after(1000, () => setCount(2))
    after(2000, () => setCount(1))
    after(3000, () => {
      setCount(0)
      startedAt.current = performance.now()
      spawnAt.current = performance.now() + 500
      setPhase('live')
    })
  }

  const avg = faced > 0 ? (clean / faced).toFixed(3).replace(/^0/, '') : '.000'

  return (
    <>
      <style>{`
        .gg-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 18px; }
        .gg-hud { display: flex; align-items: stretch; gap: 1px; margin-bottom: 10px; background: #ffffff10; border: 1px solid #ffffff12; }
        .gg-stat { flex: 1; background: #07080D; padding: 10px 6px; text-align: center; }
        .gg-stat span { display: block; font-size: 8px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #4E5A6A; }
        .gg-stat b { display: block; font-family: var(--font-heading); font-size: 20px; color: #F5F1E8; margin-top: 3px; }
        .gg-clock { height: 4px; background: #ffffff12; margin-bottom: 12px; }
        .gg-clock i { display: block; height: 100%; background: var(--neon); transition: width 1s linear; }

        .gg-stage { position: relative; }
        .gg-canvas {
          width: 100%; height: auto; display: block; touch-action: none; cursor: pointer;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .gg-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060AEE; padding: 24px;
        }
        .gg-count {
          font-family: var(--font-heading); font-weight: 900; line-height: 1;
          font-size: clamp(80px, 26vw, 150px); color: var(--neon);
          text-shadow: 0 0 50px color-mix(in srgb, var(--neon) 70%, transparent);
          animation: gg-count 1000ms cubic-bezier(.2,1.5,.4,1);
        }
        @keyframes gg-count { 0% { transform: scale(2.2); opacity: 0; } 20% { transform: scale(1); opacity: 1; } 100% { transform: scale(.92); opacity: .35; } }

        .gg-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 12px; }
        .gg-key {
          background: #10141F; border: 1px solid #ffffff18; color: #F5F1E8; cursor: pointer;
          font-family: var(--font-heading); font-weight: 900; font-size: 11px; line-height: 1.2;
          padding: 15px 4px; text-align: center; touch-action: manipulation;
        }
        .gg-key:active { background: color-mix(in srgb, var(--neon) 22%, transparent); border-color: var(--neon); }
        .gg-key span { display: block; font-size: 8px; letter-spacing: .16em; color: #5C6878; margin-top: 3px; font-weight: 900; }

        .gg-hint { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 12px; }
        .gg-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 20px; }
        .gg-item { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border: 1px solid #ffffff12; background: #ffffff05; font-size: 11px; color: #B8C4D2; }
        .gg-pip { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .gg-val { margin-left: auto; font-family: var(--font-heading); font-weight: 900; color: var(--neon); }
      `}</style>

      <p className="gg-lede">
        Sixty seconds of fungo. Left lane you take fronthand, right lane backhand. In the middle you
        read it — a high bouncer you charge, a two hopper you stay back on. Anything on a line has to
        be jumped.
      </p>

      <div className="gg-hud">
        <span className="gg-stat"><span>Time</span><b>{left}</b></span>
        <span className="gg-stat"><span>Score</span><b style={{ color: 'var(--neon)' }}>{score}</b></span>
        <span className="gg-stat"><span>Clean</span><b>{clean}</b></span>
        <span className="gg-stat"><span>Fielding</span><b>{avg}</b></span>
      </div>
      <div className="gg-clock"><i style={{ width: `${(left / 60) * 100}%` }} /></div>

      <div className="gg-stage">
        <canvas ref={canvasRef} className="gg-canvas" width={620} height={560} />

        {phase === 'count' && count > 0 && (
          <div className="gg-overlay" style={{ background: '#05060AC0' }}>
            <p key={count} className="gg-count">{count}</p>
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.3em', textTransform: 'uppercase', color: '#5C6878' }}>
              Get ready
            </p>
          </div>
        )}

        {phase === 'ready' && (
          <div className="gg-overlay">
            <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '30ch', lineHeight: 1.6 }}>
              One minute. Take as many as you can.
            </p>
            <button className="ar-btn" onClick={start} style={{ marginTop: '14px' }}><span>Take the field</span></button>
          </div>
        )}

        {phase === 'done' && (
          <div className="gg-overlay">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.34em', textTransform: 'uppercase', color: 'var(--neon)' }}>
              Time
            </p>
            <p className="ar-num" style={{ fontSize: '58px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>{score}</p>
            <p style={{ fontSize: '11px', color: '#7D8B9C' }}>{clean} clean from {faced} · fielding {avg}</p>
            {best > 0 && <p style={{ fontSize: '10px', color: '#4E5A6A', marginTop: '4px' }}>Best {best}</p>}
            <button className="ar-btn" onClick={start} style={{ marginTop: '20px' }}><span>Go again</span></button>
          </div>
        )}
      </div>

      {/* Thumb pad — the same five inputs as the keyboard */}
      <div className="gg-pad">
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('fronthand') }}>
          Fronthand<span>◀ LEFT</span>
        </button>
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('charge') }}>
          Charge<span>▲ BOUNCER</span>
        </button>
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('backhand') }}>
          Backhand<span>RIGHT ▶</span>
        </button>
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('square') }}>
          Stay back<span>▼ TWO HOPPER</span>
        </button>
        <button className="gg-key" style={{ gridColumn: 'span 2' }}
          onPointerDown={e => { e.preventDefault(); answer('jump') }}>
          Jump<span>LINE DRIVE</span>
        </button>
      </div>

      <p className="gg-hint">Arrows or WASD · space to jump · swipe or tap on a phone</p>

      <div className="gg-legend">
        <span className="gg-item"><span className="gg-pip" style={{ background: '#FFC93C', boxShadow: '0 0 8px #FFC93C' }} />Fronthand<span className="gg-val">10</span></span>
        <span className="gg-item"><span className="gg-pip" style={{ background: '#7DF9FF', boxShadow: '0 0 8px #7DF9FF' }} />Backhand<span className="gg-val">15</span></span>
        <span className="gg-item"><span className="gg-pip" style={{ background: '#FF9E2C', boxShadow: '0 0 8px #FF9E2C' }} />Charge a bouncer<span className="gg-val">20</span></span>
        <span className="gg-item"><span className="gg-pip" style={{ background: '#5CFF6B', boxShadow: '0 0 8px #5CFF6B' }} />Stay back<span className="gg-val">10</span></span>
        <span className="gg-item" style={{ gridColumn: '1 / -1' }}><span className="gg-pip" style={{ background: '#FF6BD5', boxShadow: '0 0 8px #FF6BD5' }} />Jump a line drive<span className="gg-val">30</span></span>
      </div>
    </>
  )
}