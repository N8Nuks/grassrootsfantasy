'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* You are the runner at first. The pitcher winds — one revolution, as the rules
   require — and the ball leaves the hand at the bottom of the circle, level
   with the hip. Go on the release and second is yours.

   Ten pitches. The hand quickens as the levels climb, and the ball lights in
   the hand just before the arm goes, the way a real delivery telegraphs itself
   through the body. */

const ROUNDS = 10
const SAFE = 120        // ms after release for a clean steal
const CLOSE = 260       // ms after release and still under the tag

// Release at 7 o'clock — hand at the hip, ball away
const REST_ANGLE = -Math.PI / 2                 // 12 o'clock, arm up at the start
const RELEASE_ANGLE = Math.PI * (7 / 6)         // 7 o'clock

/* One revolution from rest to release, so the arm travels from 12 round to 7. */
const TRAVEL = (RELEASE_ANGLE + Math.PI * 2) - REST_ANGLE

const LEVELS = [
  { at: 0,  ms: 1450, name: 'Social' },
  { at: 2,  ms: 1250, name: 'Reserve' },
  { at: 4,  ms: 1080, name: 'Premier' },
  { at: 6,  ms: 930,  name: 'Rep' },
  { at: 8,  ms: 800,  name: 'Black Sox' },
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
  const startAt = useRef(0)          // arm begins to move
  const releaseAt = useRef(0)        // ball leaves the hand
  const spin = useRef(1400)          // ms for the one revolution
  const judged = useRef(false)
  const goneAt = useRef(0)

  const level = levelFor(round)

  const beginPitch = useCallback((forRound: number) => {
    judged.current = false
    goneAt.current = 0
    setLast(null)
    spin.current = LEVELS[levelFor(forRound)].ms
    const pause = 900 + Math.random() * 1500      // can't be counted
    setPhase('wind')
    startAt.current = performance.now() + pause
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

    // Infield
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#080A14'); sky.addColorStop(0.42, '#12301C'); sky.addColorStop(1, '#0A1A10')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    const pool = ctx.createRadialGradient(W / 2, H * 0.12, 8, W / 2, H * 0.12, W * 0.8)
    pool.addColorStop(0, '#FF4FD818'); pool.addColorStop(1, 'transparent')
    ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H)

    // The base path you're running
    const firstX = W * 0.12, secondX = W * 0.88, baseY = H * 0.86
    ctx.strokeStyle = '#C9A87830'; ctx.lineWidth = H * 0.05
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

    // Mound
    ctx.fillStyle = '#3A2A1E'
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.58, W * 0.15, H * 0.04, 0, 0, Math.PI * 2); ctx.fill()

    // ── The pitcher ──
    const hipX = W / 2, hipY = H * 0.46, armR = H * 0.17
    const cx = hipX, cy = hipY - armR * 0.3

    let angle = REST_ANGLE
    let released = false
    let loading = false          // the ball lights just before the arm goes
    const t = now - startAt.current
    if (phase === 'wind' || phase === 'judged') {
      loading = t > -320 && t < 0
      if (t > 0) {
        const p = Math.min(t / spin.current, 1)
        angle = REST_ANGLE + TRAVEL * p
        released = t >= spin.current
      }
    }

    // Body — legs, torso, head
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 8; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX - 14, H * 0.58); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX + 18, H * 0.58); ctx.stroke()
    ctx.strokeStyle = '#FF4FD8'; ctx.lineWidth = 13
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX, H * 0.34); ctx.stroke()
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(hipX, H * 0.31, 10, 0, Math.PI * 2); ctx.fill()

    // The circle the arm travels, and the release point marked at 7 o'clock
    ctx.strokeStyle = '#ffffff0C'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, armR, 0, Math.PI * 2); ctx.stroke()
    const mx = cx + Math.cos(RELEASE_ANGLE) * armR
    const my = cy + Math.sin(RELEASE_ANGLE) * armR
    ctx.strokeStyle = released ? '#39FF9E50' : '#FF4FD860'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2); ctx.stroke()

    // Arm
    const hx = cx + Math.cos(angle) * armR, hy = cy + Math.sin(angle) * armR
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(cx, cy - armR * 0.45); ctx.lineTo(hx, hy); ctx.stroke()

    // Ball — lights in the hand as the body loads, then away at release
    if (!released) {
      const pulse = loading ? 0.6 + Math.sin(now / 55) * 0.4 : 0
      ctx.save()
      ctx.shadowColor = loading ? '#FFD700' : '#FFFFFF'
      ctx.shadowBlur = loading ? 18 + pulse * 22 : 12
      ctx.fillStyle = loading ? '#FFE96B' : '#F5F1E8'
      ctx.beginPath(); ctx.arc(hx, hy, loading ? 8 + pulse * 2.5 : 8, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    } else {
      const g = Math.min(1, (now - releaseAt.current) / 460)
      ctx.save(); ctx.globalAlpha = 1 - g * 0.75
      ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 16
      ctx.fillStyle = '#F5F1E8'
      ctx.beginPath(); ctx.arc(hx - g * W * 0.06, hy + g * H * 0.36, 8, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      ctx.strokeStyle = `rgba(57, 255, 158, ${Math.max(0, 0.7 - g)})`
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(hx, hy, 16 + g * 34, 0, Math.PI * 2); ctx.stroke()
    }

    // ── The runner ──
    let runP = 0
    if (goneAt.current) runP = Math.min(1, (now - goneAt.current) / 1150)
    const rx = firstX + (secondX - firstX) * runP
    const stride = goneAt.current ? Math.sin(now / 55) : 0
    const lean = goneAt.current ? 0.34 : 0.08

    ctx.save()
    ctx.translate(rx, baseY)
    ctx.rotate(lean)
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-9 + stride * 9, 0); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(9 - stride * 9, 0); ctx.stroke()
    ctx.strokeStyle = '#FFB800'; ctx.lineWidth = 11
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -46); ctx.stroke()
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(0, -54, 8, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(11 - stride * 11, -50); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-11 + stride * 11, -34); ctx.stroke()
    ctx.restore()

    if (goneAt.current && runP < 0.9) {
      ctx.fillStyle = '#C9A87830'
      ctx.beginPath(); ctx.ellipse(rx - 22, baseY + 4, 20, 6, 0, 0, Math.PI * 2); ctx.fill()
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
        You are on first. The runner can&apos;t leave until the ball is out of the hand — it goes at the
        bottom of the circle, level with the hip. Watch for the ball to light up: that&apos;s the body
        loading, and the arm is about to come round.
      </p>

      <div className="rl-hud">
        <span className="rl-stat"><span>Pitch</span><b>{Math.min(round + (phase === 'wind' || phase === 'judged' ? 1 : 0), ROUNDS)}/{ROUNDS}</b></span>
        <span className="rl-stat"><span>Level</span><b style={{ color: 'var(--neon)', fontSize: '14px' }}>{LEVELS[level].name}</b></span>
        <span className="rl-stat"><span>Stolen</span><b>{stolen}</b></span>
        <span className="rl-stat"><span>Score</span><b style={{ color: 'var(--neon)' }}>{score}</b></span>
      </div>

      <div className="rl-stage">
        <canvas ref={canvasRef} className="rl-canvas" width={640} height={420} onClick={go} />

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
                  Ten pitches. The arm gets quicker as you go.
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