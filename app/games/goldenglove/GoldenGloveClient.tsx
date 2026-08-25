'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
 
/* A reaction drill. You're behind the plate looking out at the shortstop; balls
   fire from below the frame and go to his backhand, his fronthand, straight at
   him, over his head, or die short in front of him.
 
   A light warns you it's coming. Early on the light is colour coded to the ball,
   so it's a memory test. Level by level the colours are taken away until the
   light is only a starter's gun and the ball itself is the read. */
 
type Pose = 'ready' | 'square' | 'fronthand' | 'backhand' | 'charge' | 'jump'
type Kind = 'left' | 'right' | 'straight' | 'over' | 'short'
 
const ART: Record<Pose, string> = {
  ready: '/field-ready.png',
  square: '/field-square.png',
  fronthand: '/field-fronthand.png',
  backhand: '/field-backhand.png',
  charge: '/field-charge.png',
  jump: '/field-jump.png',
}
 
/* Colours are arbitrary — there's nothing to reason out, only to remember. */
const BALLS: Record<Kind, { pose: Pose; label: string; light: string; drift: number }> = {
  /* We're behind him, so his glove hand is on our right. A ball to screen right
     is his fronthand; a ball to screen left he has to reach across for. */
  left:     { pose: 'backhand',  label: 'Backhand',  light: '#FF4FD8', drift: -1 },
  right:    { pose: 'fronthand', label: 'Fronthand', light: '#00F0FF', drift: 1 },
  straight: { pose: 'square',    label: 'Straight',  light: '#C6FF00', drift: 0 },
  over:     { pose: 'jump',      label: 'Over him',  light: '#FF7A2E', drift: 0 },
  short:    { pose: 'charge',    label: 'Short',     light: '#9D7CFF', drift: 0 },
}
const KINDS = Object.keys(BALLS) as Kind[]
 
/* `plain` lists the balls whose light gives nothing away — white instead of
   coded. Empty means every light is coded; all five means the light is only a
   starter's gun. */
const LEVELS: { balls: number; lightMs: number; need: number; plain: Kind[]; name: string }[] = [
  { balls: 10, lightMs: 700, need: 0.9, plain: [], name: 'Warm-up' },
  { balls: 10, lightMs: 500, need: 0.9, plain: [], name: 'Infield' },
  { balls: 20, lightMs: 350, need: 1,   plain: ['left', 'right'], name: 'Gold' },
  { balls: 20, lightMs: 250, need: 1,   plain: KINDS, name: 'Platinum' },
]
const FLIGHT_MS = 900          // light going out to the ball arriving
const POSE_HOLD = 400
const CLEARED_RUNS = 2         // perfect runs at the top level to conquer it
 
/* The ground plane, as fractions of canvas height. The field is drawn to these
   so the ball and the fielder share one geometry. */
const SKY_H = 0.130            // night sky above the fence
const FENCE_Y = 0.121          // top of the outfield fence
const GRASS_Y = 0.175          // outfield grass begins
const DIRT_TOP = 0.225         // back edge of the infield dirt, at centre
const DIRT_MID = 0.288         // same edge, at the frame edges
const FIELD_Y = 0.300          // the fielder's feet
const FORE_Y = 0.625           // foreground dirt between us and him
const CIRCLE_Y = 0.733         // the pitching circle
 
type Phase = 'ready' | 'live' | 'levelEnd' | 'conquered'
type LiveBall = { kind: Kind; born: number; answered: boolean; caught: boolean }
 
export default function GoldenGloveClient() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [level, setLevel] = useState(0)
  const [ballNo, setBallNo] = useState(0)
  const [clean, setClean] = useState(0)
  const [perfectRuns, setPerfectRuns] = useState(0)
  const [flash, setFlash] = useState<{ ok: boolean; label: string } | null>(null)
 
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const imgs = useRef<Partial<Record<Pose, HTMLImageElement>>>({})
 
  const pose = useRef<Pose>('ready')
  const poseUntil = useRef(0)
  const light = useRef<{ colour: string; until: number } | null>(null)
  const ball = useRef<LiveBall | null>(null)
  const miss = useRef(0)
  const squaresSoFar = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const after = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
 
  const L = LEVELS[level]
 
  useEffect(() => {
    ;(Object.keys(ART) as Pose[]).forEach(k => {
      const img = new Image()
      img.src = ART[k]
      img.onload = () => { imgs.current[k] = img }
    })
    return clearTimers
  }, [])
 
  /* One ball: the light, then the flight, then the verdict. */
  const throwBall = useCallback((n: number, lv: number) => {
    const cfg = LEVELS[lv]
    /* A ball straight at him is a different shape of play, so two to four a
       round, spread through it rather than bunched. */
    const squaresWanted = 2 + Math.floor(Math.random() * 3)
    const remaining = Math.max(1, cfg.balls - n + 1)
    const stillNeeded = Math.max(0, squaresWanted - squaresSoFar.current)
    const wantSquare = stillNeeded > 0 && Math.random() < stillNeeded / remaining
    const pool = wantSquare ? (['straight'] as Kind[]) : KINDS.filter(k => k !== 'straight')
    const kind = pool[Math.floor(Math.random() * pool.length)]
    if (kind === 'straight') squaresSoFar.current += 1
    light.current = {
      colour: cfg.plain.includes(kind) ? '#F5F1E8' : BALLS[kind].light,
      until: performance.now() + cfg.lightMs,
    }
    setBallNo(n)
    after(cfg.lightMs, () => {
      ball.current = { kind, born: performance.now(), answered: false, caught: false }
      // If nothing has been done by the time it arrives, it's through you
      after(FLIGHT_MS + 120, () => {
        if (ball.current && !ball.current.answered) {
          ball.current.answered = true
          miss.current = 700
          setFlash({ ok: false, label: 'Through you' })
          after(900, () => setFlash(null))
          settle(false, n, lv)
        }
      })
    })
  }, [])
 
  /* After each ball, either the next one or the end of the level. */
  const settle = useCallback((ok: boolean, n: number, lv: number) => {
    const cfg = LEVELS[lv]
    setClean(c => {
      const next = c + (ok ? 1 : 0)
      // The top two levels want perfection, so one miss ends the attempt there
      if (!ok && cfg.need === 1) {
        after(1100, () => setPhase('levelEnd'))
        return next
      }
      if (n >= cfg.balls) {
        after(1100, () => setPhase('levelEnd'))
        return next
      }
      after(1000, () => throwBall(n + 1, lv))
      return next
    })
  }, [throwBall])
 
  const answer = useCallback((p: Pose) => {
    if (phase !== 'live') return
    pose.current = p
    poseUntil.current = performance.now() + POSE_HOLD
 
    const b = ball.current
    if (!b || b.answered) return
    b.answered = true
    const want = BALLS[b.kind]
    const ok = want.pose === p
    b.caught = ok
    if (!ok) miss.current = 700
    setFlash({ ok, label: ok ? 'Success' : `It was ${want.label.toLowerCase()}` })
    after(900, () => setFlash(null))
    settle(ok, ballNo, level)
  }, [phase, ballNo, level, settle])
 
  const draw = useCallback((now: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height
 
    /* ── The park ──
       Seen from behind the plate on a long lens, so everything behind him
       compresses: fence high and flat, a thin band of outfield, then dirt. */
    ctx.fillStyle = '#0E1729'; ctx.fillRect(0, 0, W, H * SKY_H)
 
    for (const fx of [W * 0.17, W * 0.83]) {
      ctx.fillStyle = '#26314A'; ctx.fillRect(fx - 22, H * 0.012, 44, H * 0.040)
      ctx.fillStyle = '#1B2436'; ctx.fillRect(fx - 2.5, H * 0.052, 5, H * 0.071)
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = '#F3ECCB'
          ctx.beginPath()
          ctx.arc(fx - 16 + c * 10, H * 0.027 + r * H * 0.0146, 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
 
    ctx.fillStyle = '#101A2B'; ctx.fillRect(0, H * FENCE_Y, W, H * 0.054)
    ctx.fillStyle = '#FFC93C4D'; ctx.fillRect(0, H * FENCE_Y, W, 3)
    ctx.fillStyle = '#0B1119'; ctx.fillRect(0, H * 0.158, W, H * 0.017)
 
    ctx.fillStyle = '#164429'; ctx.fillRect(0, H * GRASS_Y, W, H * 0.083)
    ctx.fillStyle = '#1B5232'; ctx.fillRect(0, H * 0.200, W, H * 0.025)
 
    const arcTop = H * DIRT_TOP, arcMid = H * DIRT_MID
    ctx.fillStyle = '#6B4630'
    ctx.beginPath()
    ctx.moveTo(-20, H); ctx.lineTo(-20, arcMid)
    ctx.quadraticCurveTo(W / 2, arcTop, W + 20, arcMid)
    ctx.lineTo(W + 20, H); ctx.closePath(); ctx.fill()
 
    ctx.fillStyle = '#8A5C3D'
    ctx.beginPath()
    ctx.moveTo(-20, arcMid)
    ctx.quadraticCurveTo(W / 2, arcTop, W + 20, arcMid)
    ctx.lineTo(W + 20, arcMid + 9)
    ctx.quadraticCurveTo(W / 2, arcTop + 9, -20, arcMid + 9)
    ctx.closePath(); ctx.fill()
 
    ctx.fillStyle = '#5E3D2A'; ctx.fillRect(0, H * FORE_Y, W, H * (1 - FORE_Y))
    ctx.fillStyle = '#6B4630'
    ctx.beginPath()
    ctx.moveTo(-20, H * FORE_Y)
    ctx.quadraticCurveTo(W / 2, H * 0.600, W + 20, H * FORE_Y)
    ctx.lineTo(W + 20, H * 0.650)
    ctx.quadraticCurveTo(W / 2, H * 0.625, -20, H * 0.650)
    ctx.closePath(); ctx.fill()
 
    ctx.strokeStyle = '#F5F1E84D'; ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(W * 0.51, H * CIRCLE_Y, W * 0.242, H * 0.071, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#E8E2D273'; ctx.fillRect(W * 0.474, H * 0.704, W * 0.071, H * 0.021)
 
    // second base behind his right shoulder, third base low and left
    ctx.fillStyle = '#F5F1E8F0'
    ctx.beginPath()
    ctx.moveTo(W * 0.684, H * 0.317); ctx.lineTo(W * 0.745, H * 0.306)
    ctx.lineTo(W * 0.755, H * 0.327); ctx.lineTo(W * 0.694, H * 0.340)
    ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(W * 0.139, H * 0.408); ctx.lineTo(W * 0.223, H * 0.392)
    ctx.lineTo(W * 0.239, H * 0.419); ctx.lineTo(W * 0.155, H * 0.438)
    ctx.closePath(); ctx.fill()
 
    ctx.strokeStyle = '#F5F1E821'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(W * 0.568, H); ctx.lineTo(W * 0.103, H * 0.396); ctx.stroke()
 
    /* ── The ball's flight ──
       Out of the frame below us, across the foreground dirt, up to him. Each
       kind finishes on a different part of the ground plane. */
    const ORIGIN = { x: 0.5, y: 1.06 }
    const b = ball.current
    let ballPos: { x: number; y: number; r: number } | null = null
    // Taken cleanly, so it's in the glove and gone
    if (b && b.answered && b.caught) {
      // nothing to draw
    } else if (b) {
      const p = Math.min(1.25, (now - b.born) / FLIGHT_MS)
      const cfg = BALLS[b.kind]
      /* Short dies on the dirt in front of him; over him sails into the
         outfield grass; the rest finish at his feet. */
      const endY = b.kind === 'short' ? 0.56
        : b.kind === 'over' ? GRASS_Y + 0.02
        : FIELD_Y
      const endX = 0.5 + cfg.drift * 0.13
      const x = ORIGIN.x + (endX - ORIGIN.x) * p
      let y = ORIGIN.y + (endY - ORIGIN.y) * p
      // Over his head climbs hard; a reach carries a little air; short hops in
      if (b.kind === 'over') y -= Math.sin(p * Math.PI) * 0.10
      if (b.kind === 'left' || b.kind === 'right') y -= Math.sin(p * Math.PI) * 0.055
      if (b.kind === 'straight') y -= Math.sin(p * Math.PI) * 0.030
      if (b.kind === 'short') y -= Math.abs(Math.sin(p * 7)) * 0.03 * (1 - p)
      const r = Math.max(3, 20 - p * 15)
      ballPos = { x: x * W, y: y * H, r }
    }
 
    // shadow on the ground beneath it, never above his feet
    if (ballPos && b) {
      const gy = Math.max(ballPos.y, H * FIELD_Y)
      ctx.fillStyle = '#00000045'
      ctx.beginPath()
      ctx.ellipse(ballPos.x, gy + ballPos.r * 1.4, ballPos.r * 1.4, ballPos.r * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
    }
 
    // ── The fielder ──
    if (now > poseUntil.current) pose.current = 'ready'
    const art = imgs.current[pose.current]
    if (art) {
      const fh = H * 0.30
      const fw = fh * (art.width / art.height)
      ctx.save()
      ctx.shadowColor = '#00000090'; ctx.shadowBlur = 18
      ctx.drawImage(art, W / 2 - fw / 2, H * FIELD_Y - fh * 0.86, fw, fh)
      ctx.restore()
    }
 
    // ── The ball itself ──
    if (ballPos) {
      ctx.save()
      ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 16
      ctx.fillStyle = '#E8FF3D'
      ctx.beginPath(); ctx.arc(ballPos.x, ballPos.y, ballPos.r, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      if (ballPos.r > 5) {
        ctx.strokeStyle = '#C41E3A'; ctx.lineWidth = Math.max(1, ballPos.r * 0.2)
        ctx.beginPath()
        ctx.arc(ballPos.x - ballPos.r * 1.1, ballPos.y, ballPos.r * 0.98, -0.9, 0.9)
        ctx.stroke()
      }
    }
 
    // ── The light ──
    const lg = light.current
    if (lg && now < lg.until) {
      const k = 1 - (lg.until - now) / L.lightMs
      const lx = W / 2, ly = H * 0.88
      ctx.save()
      ctx.globalAlpha = 0.35 + Math.sin(k * Math.PI) * 0.65
      const halo = ctx.createRadialGradient(lx, ly, 4, lx, ly, W * 0.26)
      halo.addColorStop(0, lg.colour + 'CC'); halo.addColorStop(1, 'transparent')
      ctx.fillStyle = halo
      ctx.beginPath(); ctx.arc(lx, ly, W * 0.26, 0, Math.PI * 2); ctx.fill()
      ctx.shadowColor = lg.colour; ctx.shadowBlur = 34
      ctx.fillStyle = lg.colour
      ctx.beginPath(); ctx.arc(lx, ly, 17, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
 
    // ── The miss ──
    if (miss.current > 0) {
      if (phase === 'live') miss.current -= 16
      const k = 1 - miss.current / 700
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - k * k)
      ctx.font = `900 ${Math.round(H * 0.30)}px var(--font-heading), sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FF4D4D'
      ctx.shadowColor = '#FF4D4D'; ctx.shadowBlur = 40
      ctx.fillText('!', W / 2, H * 0.62 + k * H * 0.03)
      ctx.restore()
    }
 
    raf.current = requestAnimationFrame(draw)
  }, [phase, L.lightMs])
 
  useEffect(() => {
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [draw])
 
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Pose> = {
        ArrowLeft: 'backhand', a: 'backhand', A: 'backhand',
        ArrowRight: 'fronthand', d: 'fronthand', D: 'fronthand',
        ArrowUp: 'jump', w: 'jump', W: 'jump',
        ArrowDown: 'charge', s: 'charge', S: 'charge',
      }
      if (e.code === 'Space') { e.preventDefault(); answer('square'); return }
      const p = map[e.key]
      if (!p) return
      e.preventDefault()
      answer(p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer])
 
  function beginLevel(lv: number) {
    clearTimers()
    ball.current = null
    light.current = null
    miss.current = 0
    squaresSoFar.current = 0
    pose.current = 'ready'
    setLevel(lv); setClean(0); setBallNo(0); setFlash(null)
    setPhase('live')
    after(900, () => throwBall(1, lv))
  }
 
  const passed = clean / L.balls >= L.need
  const isTop = level === LEVELS.length - 1
 
  function next() {
    if (passed && isTop) {
      const runs = perfectRuns + 1
      setPerfectRuns(runs)
      if (runs >= CLEARED_RUNS) { setPhase('conquered'); return }
      beginLevel(level)
      return
    }
    if (passed) { beginLevel(level + 1); return }
    beginLevel(level)      // same level again
  }
 
  /* Dropping back a level is free — only Platinum runs count toward the glove,
     so there's nothing to farm further down the ladder. */
  function dropBack() {
    setPerfectRuns(0)
    beginLevel(Math.max(0, level - 1))
  }
 
  async function share() {
    const text = `I conquered Golden Glove in the Grassroots Fantasy Arcade — two perfect runs at Platinum.\ngrassrootsfantasy.co.nz/games`
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }
 
  const pct = L.balls > 0 ? Math.round((clean / Math.max(ballNo, 1)) * 100) : 0
 
  return (
    <>
      <style>{`
        .gg-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 16px; }
        .gg-hud { display: flex; align-items: stretch; gap: 1px; margin-bottom: 12px; background: #ffffff10; border: 1px solid #ffffff12; }
        .gg-stat { flex: 1; background: #07080D; padding: 10px 6px; text-align: center; }
        .gg-stat span { display: block; font-size: 8px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #4E5A6A; }
        .gg-stat b { display: block; font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-top: 3px; }
 
        .gg-stage { position: relative; }
        .gg-canvas {
          width: 100%; height: auto; display: block; touch-action: none;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .gg-call {
          position: absolute; left: 0; right: 0; bottom: 12%; text-align: center; pointer-events: none;
          font-family: var(--font-heading); font-weight: 900; font-size: clamp(16px, 4.6vw, 24px);
          text-transform: uppercase; letter-spacing: .04em;
          animation: gg-pop 260ms cubic-bezier(.2,1.6,.4,1);
        }
        @keyframes gg-pop { from { transform: scale(1.5); opacity: 0; } }
        .gg-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060AF2; padding: 24px;
        }
        .gg-ghost {
          background: transparent; color: var(--neon);
          border: 1px solid var(--neon); box-shadow: none;
        }
 
        .gg-pad { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 12px; }
        .gg-key {
          background: #10141F; border: 1px solid #ffffff18; color: #F5F1E8; cursor: pointer;
          font-family: var(--font-heading); font-weight: 900; font-size: 11px; line-height: 1.2;
          padding: 15px 4px; text-align: center; touch-action: manipulation;
        }
        .gg-key:active { background: color-mix(in srgb, var(--neon) 24%, transparent); border-color: var(--neon); }
        .gg-arrow { display: block; font-size: 13px; color: #5C6878; margin-bottom: 4px; font-weight: 400; line-height: 1; }
 
        .gg-hint { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 12px; }
        .gg-key-list { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin-top: 18px; }
        .gg-swatch { border: 1px solid #ffffff12; background: #ffffff05; padding: 9px 4px; text-align: center; }
        .gg-dot { display: block; width: 14px; height: 14px; border-radius: 50%; margin: 0 auto 5px; }
        .gg-swatch b { display: block; font-size: 9px; font-weight: 900; color: #B8C4D2; }
 
        .gg-ladder { display: flex; flex-direction: column; gap: 6px; margin-top: 20px; }
        .gg-rung { display: flex; align-items: center; gap: 11px; padding: 10px 13px; border: 1px solid #ffffff12; background: #ffffff05; font-size: 11px; color: #7D8B9C; }
        .gg-rung[data-on="true"] { border-color: var(--neon); color: #F5F1E8; background: color-mix(in srgb, var(--neon) 10%, transparent); }
        .gg-rung[data-done="true"] { color: #5CFF6B; }
        .gg-n { font-family: var(--font-heading); font-weight: 900; color: #3E4A58; width: 14px; }
      `}</style>
 
      <p className="gg-lede">
        A light, then a ball. It goes to his backhand, his fronthand, straight at him, over his
        head or dies short — and you have to be in the right shape before it arrives. Early on the
        light is colour coded. Level by level the colours are taken away until it tells you
        nothing but <em>now</em>.
      </p>
 
      <div className="gg-hud">
        <span className="gg-stat"><span>Level</span><b style={{ color: 'var(--neon)', fontSize: '13px' }}>{L.name}</b></span>
        <span className="gg-stat"><span>Ball</span><b>{Math.min(ballNo, L.balls)}/{L.balls}</b></span>
        <span className="gg-stat"><span>Clean</span><b>{clean}</b></span>
        <span className="gg-stat"><span>Rate</span><b>{ballNo ? `${pct}%` : '—'}</b></span>
      </div>
 
      <div className="gg-stage">
        <canvas ref={canvasRef} className="gg-canvas" width={620} height={480} />
 
        {flash && (
          <p className="gg-call" style={{
            color: flash.ok ? '#5CFF6B' : '#FF4D4D',
            textShadow: `0 0 24px ${flash.ok ? '#5CFF6B' : '#FF4D4D'}80`,
          }}>{flash.label}</p>
        )}
 
        {phase === 'ready' && (
          <div className="gg-overlay">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--neon)' }}>
              Level 1 · {LEVELS[0].name}
            </p>
            <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '32ch', lineHeight: 1.6, marginTop: '6px' }}>
              Ten balls. The light is colour coded — learn what each one means.
            </p>
            <button className="ar-btn" onClick={() => beginLevel(0)} style={{ marginTop: '16px' }}>
              <span>Take the field</span>
            </button>
          </div>
        )}
 
        {phase === 'levelEnd' && (
          <div className="gg-overlay">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase',
                        color: passed ? '#5CFF6B' : '#FF4D4D' }}>
              {passed ? (isTop ? `Perfect run ${perfectRuns + 1} of ${CLEARED_RUNS}` : 'Level cleared') : 'Not this time'}
            </p>
            <p className="ar-num" style={{ fontSize: '46px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>
              {clean}/{L.balls}
            </p>
            <p style={{ fontSize: '12px', color: '#7D8B9C', maxWidth: '32ch', lineHeight: 1.6 }}>
              {passed
                ? (isTop
                    ? `One more clean sheet at ${L.name} and it's yours.`
                    : `Up to ${LEVELS[level + 1].name}${LEVELS[level + 1].plain.length > LEVELS[level].plain.length ? ' — fewer lights tell you anything from here' : ''}.`)
                : L.need === 1
                  ? `${L.name} wants all ${L.balls}. Go again.`
                  : `You need ${Math.ceil(L.balls * L.need)} of ${L.balls}. Go again.`}
            </p>
            <button className="ar-btn" onClick={next} style={{ marginTop: '16px' }}>
              <span>{passed && !isTop ? `Face ${LEVELS[level + 1].name}` : 'Go again'}</span>
            </button>
            {level > 0 && (
              <button className="ar-btn gg-ghost" onClick={dropBack} style={{ marginTop: '10px' }}>
                <span>Drop to {LEVELS[level - 1].name}</span>
              </button>
            )}
          </div>
        )}
 
        {phase === 'conquered' && (
          <div className="gg-overlay">
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase',
                        fontSize: 'clamp(26px, 8vw, 44px)', color: '#FFC93C', transform: 'skewX(-7deg)',
                        textShadow: '0 0 40px #FFC93C90' }}>
              Golden Glove
            </p>
            <p style={{ fontSize: '12px', color: '#B8C4D2', maxWidth: '30ch', lineHeight: 1.7, marginTop: '10px' }}>
              Two perfect runs at Platinum. Nobody gets one of these by accident.
            </p>
            <button className="ar-btn" onClick={share} style={{ marginTop: '18px' }}><span>Share it</span></button>
            <button className="ar-btn gg-ghost" onClick={() => { setPerfectRuns(0); beginLevel(0) }}
              style={{ marginTop: '10px' }}>
              <span>Start again</span>
            </button>
          </div>
        )}
      </div>
 
      {/* Five buttons on one line, in field order: the two reaches bookend it,
          the three middle-lane balls sit together in the middle. */}
      <div className="gg-pad">
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('backhand') }}>
          <span className="gg-arrow">◀</span>Backhand
        </button>
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('square') }}>
          <span className="gg-arrow">▬</span>Straight At&apos;em
        </button>
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('charge') }}>
          <span className="gg-arrow">▼</span>Charge
        </button>
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('jump') }}>
          <span className="gg-arrow">▲</span>Jump
        </button>
        <button className="gg-key" onPointerDown={e => { e.preventDefault(); answer('fronthand') }}>
          <span className="gg-arrow">▶</span>Fronthand
        </button>
      </div>
 
      <p className="gg-hint">Arrows or WASD · space for straight at&apos;em</p>
 
      {/* Always shown — the memory is in which ball goes where, not in hiding
          the legend. A white dot means that light gives nothing away. */}
      <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase',
                  color: '#4E5A6A', margin: '20px 0 8px' }}>
        {L.plain.length === KINDS.length ? 'Every light is white from here' : 'What the light means'}
      </p>
      <div className="gg-key-list" style={{ opacity: L.plain.length === KINDS.length ? 0.35 : 1 }}>
          {KINDS.map(k => (
            <span key={k} className="gg-swatch">
              <i className="gg-dot" style={{
                background: L.plain.includes(k) ? '#F5F1E8' : BALLS[k].light,
                boxShadow: `0 0 10px ${L.plain.includes(k) ? '#F5F1E8' : BALLS[k].light}`,
              }} />
              <b>{BALLS[k].label}</b>
            </span>
          ))}
      </div>
 
      <div className="gg-ladder">
        {LEVELS.map((lv, i) => (
          <span key={i} className="gg-rung" data-on={i === level} data-done={i < level}>
            <span className="gg-n">{i + 1}</span>
            {lv.name}
            <span style={{ marginLeft: 'auto', fontSize: '10px', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              {lv.balls} balls · {lv.need === 1 ? 'perfect' : '90%'}{lv.plain.length === KINDS.length ? ' · white light' : lv.plain.length > 0 ? ' · some white' : ''}
            </span>
          </span>
        ))}
      </div>
    </>
  )
}
 