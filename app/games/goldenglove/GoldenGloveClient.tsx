'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* A reaction drill. The fielder stands up-field facing you; balls fire from one
   spot below the frame and go left, right, straight at him, over his head, or
   die short.

   A light warns you it's coming. On the first two levels the light is colour
   coded to the ball, so it's a memory test. From level three it's white — the
   light is only a starter's gun and the ball itself is the read.

   Ten balls a level to begin with, then twenty. Ninety percent moves you up,
   and the last two levels want perfection. */

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
    /* A ball straight at him needs no move, so too many of them makes the level
       a waiting game. Two to four a round, spread through it. */
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
    const HORIZON = H * 0.20

    // ── The park ──
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON)
    sky.addColorStop(0, '#080A14'); sky.addColorStop(1, '#16233C')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON)
    for (const fx of [W * 0.17, W * 0.83]) {
      ctx.strokeStyle = '#1B2436'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(fx, HORIZON); ctx.lineTo(fx, H * 0.045); ctx.stroke()
      ctx.fillStyle = '#26314A'; ctx.fillRect(fx - 19, H * 0.026, 38, 17)
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        ctx.fillStyle = '#F3ECCB'
        ctx.beginPath(); ctx.arc(fx - 13 + c * 9, H * 0.033 + r * 7.5, 2.5, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.fillStyle = '#0D1522'; ctx.fillRect(0, HORIZON - H * 0.03, W, H * 0.03)
    ctx.fillStyle = '#FFC93C2E'; ctx.fillRect(0, HORIZON - H * 0.03, W, 2)

    const grass = ctx.createLinearGradient(0, HORIZON, 0, H)
    grass.addColorStop(0, '#144026'); grass.addColorStop(1, '#0A2214')
    ctx.fillStyle = grass; ctx.fillRect(0, HORIZON, W, H - HORIZON)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#ffffff05'
      ctx.fillRect(0, HORIZON + (H - HORIZON) * (i / 6), W, (H - HORIZON) / 12)
    }

    /* The fielder stands up-field. He's small because he's a long way off, which
       is what gives the ball room to travel. */
    const FIELD_Y = H * 0.30                 // where his feet are
    const fh = H * 0.30

    // ── The ball's flight: from the bottom of the frame up to him ──
    const ORIGIN = { x: 0.5, y: 1.06 }
    const b = ball.current
    let ballPos: { x: number; y: number; r: number } | null = null
    // Taken cleanly, so it's in the glove and gone
    if (b && b.answered && b.caught) {
      // nothing to draw
    } else if (b) {
      const p = Math.min(1.25, (now - b.born) / FLIGHT_MS)
      const cfg = BALLS[b.kind]
      // Ends up beside him, over him, or short of him
      const endY = b.kind === 'short' ? 0.52 : b.kind === 'over' ? 0.20 : FIELD_Y / H
      const endX = 0.5 + cfg.drift * 0.13
      const x = ORIGIN.x + (endX - ORIGIN.x) * p
      let y = ORIGIN.y + (endY - ORIGIN.y) * p
      // A ball over his head climbs; a short one dies with a hop
      if (b.kind === 'over') y -= Math.sin(p * Math.PI) * 0.10
      if (b.kind === 'short') y -= Math.abs(Math.sin(p * 7)) * 0.03 * (1 - p)
      const r = Math.max(3, 20 - p * 15)
      ballPos = { x: x * W, y: y * H, r }
    }

    // shadow first
    if (ballPos && b) {
      const gy = Math.max(ballPos.y, HORIZON + 10)
      ctx.fillStyle = '#00000045'
      ctx.beginPath(); ctx.ellipse(ballPos.x, gy + ballPos.r * 1.4, ballPos.r * 1.4, ballPos.r * 0.45, 0, 0, Math.PI * 2); ctx.fill()
    }

    // ── The fielder ──
    if (now > poseUntil.current) pose.current = 'ready'
    const art = imgs.current[pose.current]
    if (art) {
      const fw = fh * (art.width / art.height)
      ctx.save()
      ctx.shadowColor = '#00000090'; ctx.shadowBlur = 18
      ctx.drawImage(art, W / 2 - fw / 2, FIELD_Y - fh * 0.86, fw, fh)
      ctx.restore()
    }

    // ── The ball, over him ──
    if (ballPos) {
      ctx.save()
      ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 16
      ctx.fillStyle = '#E8FF3D'
      ctx.beginPath(); ctx.arc(ballPos.x, ballPos.y, ballPos.r, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      if (ballPos.r > 5) {
        ctx.strokeStyle = '#C41E3A'; ctx.lineWidth = Math.max(1, ballPos.r * 0.2)
        ctx.beginPath(); ctx.arc(ballPos.x - ballPos.r * 1.1, ballPos.y, ballPos.r * 0.98, -0.9, 0.9); ctx.stroke()
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
        A light, then a ball. It goes left, right, straight at him, over his head or dies short —
        and you have to be in the right shape before it arrives. The first two levels colour the
        light. After that it tells you nothing but <em>now</em>.
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
            <button className="ar-btn" onClick={() => { setPerfectRuns(0); beginLevel(0) }}
              style={{ marginTop: '10px', background: 'transparent', color: 'var(--neon)', border: '1px solid var(--neon)', boxShadow: 'none' }}>
              <span>Start again</span>
            </button>
          </div>
        )}
      </div>

      {/* Four buttons, two rows. Reaches on top the way they appear on screen,
          depth below. A ball straight at him wants nothing pressed at all. */}
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

      <p className="gg-hint">Arrows or WASD · straight at him, leave it</p>

      {/* Always shown — the memory is in which ball goes where, not in hiding
          the legend. From level three the light is white and this is history. */}
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