'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* You are the runner at first, watching the pitcher side on. Home plate is off
   to the left, which is the way the cap is pointing.

   The delivery, as it really goes: the hand rests at 7 o'clock in front of the
   body, rocks back to 5, then comes round once — up the front, over the top,
   down the back — and the ball leaves at 7 o'clock, level with the hip,
   travelling flat toward the plate. One revolution only; two is illegal.

   You can't leave first until the ball is out of the hand. Early is a pick-off,
   late and the throw beats you to second. */

const ROUNDS = 10
const SAFE = 120        // ms after release for a clean steal
const CLOSE = 260       // ms after release and still under the tag

/* Canvas angles: 0 is 3 o'clock and angles increase clockwise.
   An hour on the clock face is 30 degrees, so hour h sits at (h * 30 - 90). */
const clock = (h: number) => ((h * 30 - 90) * Math.PI) / 180
const REST = clock(7)                  // hand down in front, home side
const ROCK = clock(5)                  // rocked back behind
/* From the rock the hand comes forward through the bottom, up the FRONT (the
   home side), over the top, down the back, and releases at 7 o'clock — one
   full circle plus the little extra from 5 round to 7. */
const RELEASE = ROCK + (420 * Math.PI) / 180
const ROCK_MS = 420                    // the rock back before the arm goes

const BALL_YELLOW = '#E8FF3D'

const LEVELS = [
  { at: 0, ms: 1450, name: 'Social' },
  { at: 2, ms: 1250, name: 'Reserve' },
  { at: 4, ms: 1080, name: 'Premier' },
  { at: 6, ms: 930,  name: 'Rep' },
  { at: 8, ms: 800,  name: 'Black Sox' },
]
const levelFor = (pitch: number) => {
  let i = 0
  for (let n = 0; n < LEVELS.length; n++) if (pitch >= LEVELS[n].at) i = n
  return i
}

type Outcome = 'clean' | 'close' | 'thrown' | 'picked'
const OUT: Record<Outcome, { label: string; sub: string; colour: string; points: number }> = {
  clean:  { label: 'STOLEN',     sub: 'Safe by a distance', colour: '#39FF9E', points: 30 },
  close:  { label: 'SAFE',       sub: 'Under the tag',      colour: '#7DF9FF', points: 15 },
  thrown: { label: 'THROWN OUT', sub: 'Late off the base',  colour: '#FF4D4D', points: 0 },
  picked: { label: 'PICKED OFF', sub: 'You left too early', colour: '#FF4D4D', points: 0 },
}

export default function ReleaseClient() {
  const [phase, setPhase] = useState<'ready' | 'wind' | 'judged' | 'done'>('ready')
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [results, setResults] = useState<Outcome[]>([])
  const [last, setLast] = useState<{ outcome: Outcome; ms: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const rockAt = useRef(0)         // the rock back begins
  const startAt = useRef(0)        // the arm begins its revolution
  const releaseAt = useRef(0)      // ball leaves the hand
  const spin = useRef(1450)
  const judged = useRef(false)
  const goneAt = useRef(0)

  const level = levelFor(round)

  const beginPitch = useCallback((forRound: number) => {
    judged.current = false
    goneAt.current = 0
    setLast(null)
    spin.current = LEVELS[levelFor(forRound)].ms
    const pause = 900 + Math.random() * 1500        // can't be counted
    setPhase('wind')
    rockAt.current = performance.now() + pause
    startAt.current = rockAt.current + ROCK_MS
    releaseAt.current = startAt.current + spin.current
  }, [])

  const go = useCallback(() => {
    if (phase !== 'wind' || judged.current) return
    judged.current = true
    const now = performance.now()
    goneAt.current = now
    const ms = now - releaseAt.current

    const outcome: Outcome = ms < 0 ? 'picked' : ms <= SAFE ? 'clean' : ms <= CLOSE ? 'close' : 'thrown'
    setLast({ outcome, ms })
    setResults(r => [...r, outcome])
    setScore(s => {
      const n = s + OUT[outcome].points
      setBest(b => Math.max(b, n))
      return n
    })
    setPhase('judged')
    setTimeout(() => {
      const next = round + 1
      setRound(next)
      if (next >= ROUNDS) setPhase('done')
      else beginPitch(next)
    }, 1800)
  }, [phase, round, beginPitch])

  const draw = useCallback((now: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height

    // ── The park ──
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#080A14'); sky.addColorStop(0.42, '#12301C'); sky.addColorStop(1, '#0A1A10')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    const pool = ctx.createRadialGradient(W / 2, H * 0.1, 8, W / 2, H * 0.1, W * 0.8)
    pool.addColorStop(0, '#FF4FD818'); pool.addColorStop(1, 'transparent')
    ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H)

    // The base path, first on the left, second on the right
    const firstX = W * 0.13, secondX = W * 0.87, baseY = H * 0.86
    ctx.strokeStyle = '#C9A87828'; ctx.lineWidth = H * 0.05
    ctx.beginPath(); ctx.moveTo(firstX, baseY); ctx.lineTo(secondX, baseY); ctx.stroke()
    for (const [bx, label] of [[firstX, '1st'], [secondX, '2nd']] as [number, string][]) {
      ctx.fillStyle = '#F5F1E8'
      ctx.save(); ctx.translate(bx, baseY); ctx.rotate(Math.PI / 4)
      ctx.fillRect(-11, -11, 22, 22); ctx.restore()
      ctx.fillStyle = '#ffffff35'
      ctx.font = `900 ${Math.round(H * 0.026)}px var(--font-heading), sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(label, bx, baseY + H * 0.07)
    }
    // Home is off to the left — say so, so the direction reads
    ctx.fillStyle = '#ffffff22'
    ctx.font = `900 ${Math.round(H * 0.024)}px var(--font-heading), sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('← HOME', W * 0.03, H * 0.52)

    // Mound
    ctx.fillStyle = '#3A2A1E'
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.6, W * 0.15, H * 0.04, 0, 0, Math.PI * 2); ctx.fill()

    // ── Arm position ──
    const hipX = W / 2, hipY = H * 0.47, armR = H * 0.17
    const cx = hipX, cy = hipY - armR * 0.34        // shoulder, centre of the circle

    let angle = REST
    let released = false
    let loading = false
    if (phase === 'wind' || phase === 'judged') {
      const tRock = now - rockAt.current
      const tSpin = now - startAt.current
      if (tSpin > 0) {
        const p = Math.min(tSpin / spin.current, 1)
        angle = ROCK + (RELEASE - ROCK) * p
        released = tSpin >= spin.current
      } else if (tRock > 0) {
        const p = Math.min(tRock / ROCK_MS, 1)
        angle = REST + (ROCK - REST) * p
        loading = true
      } else if (tRock > -340) {
        loading = true                              // ball lights just before the rock
      }
    }

    // ── The pitcher, facing home (left) ──
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 8; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX - 20, H * 0.6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX + 14, H * 0.6); ctx.stroke()
    ctx.strokeStyle = '#FF4FD8'; ctx.lineWidth = 14
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX - 3, H * 0.35); ctx.stroke()

    // Head with a cap, brim pointing left toward home
    const headX = hipX - 4, headY = H * 0.32
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(headX, headY, 11, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FF4FD8'
    ctx.beginPath(); ctx.arc(headX, headY - 2, 11, Math.PI, 0); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(headX, headY - 5); ctx.lineTo(headX - 22, headY - 2)
    ctx.lineTo(headX - 22, headY + 2); ctx.lineTo(headX, headY - 1)
    ctx.closePath(); ctx.fill()

    // The circle the hand travels, and the release point marked at 7 o'clock
    ctx.strokeStyle = '#ffffff0B'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, armR, 0, Math.PI * 2); ctx.stroke()
    const mx = cx + Math.cos(REST) * armR
    const my = cy + Math.sin(REST) * armR
    ctx.strokeStyle = released ? '#39FF9E55' : '#FF4FD855'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = released ? '#39FF9E70' : '#FF4FD850'
    ctx.font = `900 ${Math.round(H * 0.02)}px var(--font-heading), sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('RELEASE', mx, my + armR * 0.34)

    // Glove arm tucks across the chest
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 8
    ctx.beginPath(); ctx.moveTo(hipX - 2, H * 0.38); ctx.lineTo(hipX - 26, H * 0.44); ctx.stroke()

    // Throwing arm
    const hx = cx + Math.cos(angle) * armR
    const hy = cy + Math.sin(angle) * armR
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke()

    // ── The ball ──
    if (!released) {
      const pulse = loading ? 0.55 + Math.sin(now / 50) * 0.45 : 0
      ctx.save()
      ctx.shadowColor = BALL_YELLOW
      ctx.shadowBlur = loading ? 16 + pulse * 26 : 10
      ctx.fillStyle = BALL_YELLOW
      ctx.beginPath(); ctx.arc(hx, hy, loading ? 8.5 + pulse * 2.5 : 8.5, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      ctx.strokeStyle = '#C41E3A'; ctx.lineWidth = 1.8
      ctx.beginPath(); ctx.arc(hx - 9, hy, 8, -0.9, 0.9); ctx.stroke()
    } else {
      // Away flat toward home, parallel to the base path
      const g = (now - releaseAt.current) / 620
      const bx = mx - g * W * 0.72
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - g * 0.85)
      ctx.shadowColor = BALL_YELLOW; ctx.shadowBlur = 18
      ctx.fillStyle = BALL_YELLOW
      ctx.beginPath(); ctx.arc(bx, my, 8.5, 0, Math.PI * 2); ctx.fill()
      // trail
      const trail = ctx.createLinearGradient(bx, my, bx + W * 0.14, my)
      trail.addColorStop(0, `${BALL_YELLOW}70`); trail.addColorStop(1, 'transparent')
      ctx.strokeStyle = trail; ctx.lineWidth = 7
      ctx.beginPath(); ctx.moveTo(bx, my); ctx.lineTo(bx + W * 0.14, my); ctx.stroke()
      ctx.restore()
      // the moment marked
      ctx.strokeStyle = `rgba(57, 255, 158, ${Math.max(0, 0.7 - g * 1.4)})`
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(mx, my, 16 + g * 46, 0, Math.PI * 2); ctx.stroke()
    }

    // ── The runner, helmet on ──
    let runP = 0
    if (goneAt.current) runP = Math.min(1, (now - goneAt.current) / 1150)
    const rx = firstX + (secondX - firstX) * runP
    const stride = goneAt.current ? Math.sin(now / 52) : 0
    const lean = goneAt.current ? 0.36 : 0.1

    ctx.save()
    ctx.translate(rx, baseY)
    ctx.rotate(lean)
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-10 + stride * 10, 0); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(10 - stride * 10, 0); ctx.stroke()
    ctx.strokeStyle = '#FFB800'; ctx.lineWidth = 11
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -46); ctx.stroke()
    // helmet — shell with an ear flap on the near side
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(0, -54, 8.5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FFB800'
    ctx.beginPath(); ctx.arc(0, -55, 9.5, Math.PI, 0); ctx.fill()
    ctx.beginPath(); ctx.ellipse(-4, -52, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(8, -58, 8, 3.5)
    // arms pumping
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(12 - stride * 12, -50); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-12 + stride * 12, -34); ctx.stroke()
    ctx.restore()

    if (goneAt.current && runP < 0.92) {
      ctx.fillStyle = '#C9A87828'
      ctx.beginPath(); ctx.ellipse(rx - 24, baseY + 4, 22, 6, 0, 0, Math.PI * 2); ctx.fill()
    }

    raf.current = requestAnimationFrame(draw)
  }, [phase])

  useEffect(() => {
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [draw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault(); go()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  function start() {
    setRound(0); setScore(0); setResults([]); setLast(null)
    beginPitch(0)
  }

  const stolen = results.filter(r => r === 'clean' || r === 'close').length

  return (
    <>
      <style>{`
        .rl-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .rl-hud { display: flex; align-items: stretch; gap: 1px; margin-bottom: 12px; background: #ffffff10; border: 1px solid #ffffff12; }
        .rl-stat { flex: 1; background: #07080D; padding: 11px 6px; text-align: center; }
        .rl-stat span { display: block; font-size: 8px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; color: #4E5A6A; }
        .rl-stat b { display: block; font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-top: 3px; }
        .rl-stage { position: relative; }
        .rl-canvas {
          width: 100%; height: auto; display: block; cursor: pointer; touch-action: manipulation;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .rl-flash { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
        .rl-verdict {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(28px, 8vw, 50px); line-height: 1; transform: skewX(-7deg);
          animation: rl-slam 360ms cubic-bezier(.2,1.7,.4,1);
        }
        @keyframes rl-slam { from { transform: skewX(-7deg) scale(2); opacity: 0; } }
        .rl-sub { font-size: 11px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #F5F1E8; margin-top: 10px; }
        .rl-ms { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #7D8B9C; margin-top: 6px; }
        .rl-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060AE8; padding: 24px;
        }
        .rl-key { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 14px; }
        .rl-tape { display: flex; gap: 4px; margin-top: 18px; flex-wrap: wrap; }
        .rl-dot { width: 26px; height: 5px; background: #ffffff10; }
        .rl-rules { display: flex; flex-direction: column; gap: 7px; margin-top: 22px; }
        .rl-rule {
          display: flex; align-items: center; gap: 10px; padding: 10px 13px;
          border: 1px solid #ffffff12; background: #ffffff05; font-size: 11px; color: #B8C4D2;
        }
        .rl-pip { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .rl-val { margin-left: auto; font-family: var(--font-heading); font-weight: 900; color: var(--neon); }
      `}</style>

      <p className="rl-lede">
        You&apos;re on first, home plate off to your left. The hand rocks back, comes round once, and the
        ball goes at 7 o&apos;clock — level with the hip. Watch it light up: that&apos;s the body loading.
        Leave before it&apos;s gone and you&apos;re picked off.
      </p>

      <div className="rl-hud">
        <span className="rl-stat"><span>Pitch</span><b>{Math.min(round + (phase === 'wind' || phase === 'judged' ? 1 : 0), ROUNDS)}/{ROUNDS}</b></span>
        <span className="rl-stat"><span>Level</span><b style={{ color: 'var(--neon)', fontSize: '13px' }}>{LEVELS[level].name}</b></span>
        <span className="rl-stat"><span>Stolen</span><b>{stolen}</b></span>
        <span className="rl-stat"><span>Score</span><b style={{ color: 'var(--neon)' }}>{score}</b></span>
      </div>

      <div className="rl-stage">
        <canvas ref={canvasRef} className="rl-canvas" width={640} height={430} onClick={go} />

        {last && phase === 'judged' && (
          <div className="rl-flash">
            <p className="rl-verdict" style={{ color: OUT[last.outcome].colour, textShadow: `0 0 28px ${OUT[last.outcome].colour}80` }}>
              {OUT[last.outcome].label}
            </p>
            <p className="rl-sub">{OUT[last.outcome].sub}</p>
            <p className="rl-ms">
              {last.ms < 0 ? `${Math.round(-last.ms)}ms before the release` : `${Math.round(last.ms)}ms after the release`}
            </p>
          </div>
        )}

        {(phase === 'ready' || phase === 'done') && (
          <div className="rl-overlay">
            {phase === 'done' ? (
              <>
                <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--neon)' }}>
                  {stolen === ROUNDS ? 'Ten from ten' : `${stolen} of ${ROUNDS} stolen`}
                </p>
                <p className="ar-num" style={{ fontSize: '54px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>{score}</p>
                <p style={{ fontSize: '11px', color: '#7D8B9C' }}>Best {best}</p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '20px' }}><span>Back on first</span></button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '30ch', lineHeight: 1.6 }}>
                  Ten pitches. The arm quickens as you go.
                </p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '14px' }}><span>Take your lead</span></button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="rl-key">Press space, or tap the field</p>

      {results.length > 0 && (
        <div className="rl-tape">
          {Array.from({ length: ROUNDS }).map((_, i) => (
            <span key={i} className="rl-dot"
              style={results[i] ? { background: OUT[results[i]].colour } : undefined} />
          ))}
        </div>
      )}

      <div className="rl-rules">
        <span className="rl-rule"><span className="rl-pip" style={{ background: OUT.clean.colour, boxShadow: `0 0 8px ${OUT.clean.colour}` }} />Gone on the release<span className="rl-val">30</span></span>
        <span className="rl-rule"><span className="rl-pip" style={{ background: OUT.close.colour, boxShadow: `0 0 8px ${OUT.close.colour}` }} />A shade late, still safe<span className="rl-val">15</span></span>
        <span className="rl-rule"><span className="rl-pip" style={{ background: OUT.thrown.colour, boxShadow: `0 0 8px ${OUT.thrown.colour}` }} />Too slow, or off before the ball<span className="rl-val">0</span></span>
      </div>
    </>
  )
}