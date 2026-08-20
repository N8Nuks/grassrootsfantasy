'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* The windmill: the arm comes over the top, down the back, and the ball leaves
   at the bottom of the circle as the hand passes the hip. Tap on that frame.

   The delivery starts after a random pause so it can't be counted, and the arm
   speed varies each pitch so rhythm alone won't do it either. */
const ROUNDS = 5
const RELEASE_ANGLE = Math.PI * 0.5      // hand at the hip, bottom of the circle

const GRADES = [
  { max: 28,  label: 'PERFECT',  colour: '#FFD700' },
  { max: 60,  label: 'CLEAN',    colour: '#39FF9E' },
  { max: 110, label: 'LATE',     colour: '#7DF9FF' },
  { max: 190, label: 'SLOPPY',   colour: '#FFB800' },
  { max: 1e9, label: 'WILD',     colour: '#FF4D4D' },
]
const gradeFor = (ms: number) => GRADES.find(g => ms <= g.max)!

export default function ReleaseClient() {
  const [phase, setPhase] = useState<'ready' | 'wind' | 'judged' | 'done'>('ready')
  const [round, setRound] = useState(0)
  const [errors, setErrors] = useState<number[]>([])
  const [last, setLast] = useState<{ ms: number; early: boolean } | null>(null)
  const [best, setBest] = useState<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const startAt = useRef(0)
  const releaseAt = useRef(0)
  const spin = useRef(1250)          // ms for one full arm revolution
  const revs = useRef(1)             // how many times round before release
  const judged = useRef(false)

  const beginPitch = useCallback(() => {
    judged.current = false
    setLast(null)
    spin.current = 950 + Math.random() * 520
    revs.current = 1 + Math.floor(Math.random() * 2)     // one or two revolutions
    const pause = 700 + Math.random() * 1600             // can't be counted
    setPhase('wind')
    startAt.current = performance.now() + pause
    releaseAt.current = startAt.current + spin.current * revs.current
  }, [])

  const judge = useCallback(() => {
    if (phase !== 'wind' || judged.current) return
    judged.current = true
    const now = performance.now()
    // Before the arm even moves is a flinch, scored as the worst miss
    const ms = now < startAt.current ? 999 : Math.abs(now - releaseAt.current)
    const early = now < releaseAt.current
    setLast({ ms, early })
    setErrors(e => [...e, ms])
    setBest(b => (b == null || ms < b ? ms : b))
    setPhase('judged')
    setTimeout(() => {
      const next = round + 1
      setRound(next)
      if (next >= ROUNDS) setPhase('done')
      else beginPitch()
    }, 1500)
  }, [phase, round, beginPitch])

  const draw = useCallback((now: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height

    // Circle and dirt
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#0B0D18'); sky.addColorStop(0.55, '#12301C'); sky.addColorStop(1, '#0A1A10')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    const pool = ctx.createRadialGradient(W / 2, H * 0.2, 8, W / 2, H * 0.2, W * 0.7)
    pool.addColorStop(0, '#FF4FD81C'); pool.addColorStop(1, 'transparent')
    ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#3A2A1E'
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.9, W * 0.3, H * 0.07, 0, 0, Math.PI * 2); ctx.fill()

    const hipX = W / 2
    const hipY = H * 0.60
    const armR = H * 0.24

    // Where the arm is right now
    let angle = -Math.PI * 0.5          // resting, hand at the shoulder
    let released = false
    if (phase === 'wind' || phase === 'judged') {
      const t = now - startAt.current
      if (t > 0) {
        const total = spin.current * revs.current
        const p = Math.min(t, total)
        angle = -Math.PI * 0.5 + (p / spin.current) * Math.PI * 2
        released = t >= total
      }
    }

    // Body
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 10; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX - 16, H * 0.87); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX + 22, H * 0.87); ctx.stroke()
    ctx.strokeStyle = '#FF4FD8'; ctx.lineWidth = 16
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX, H * 0.42); ctx.stroke()
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(hipX, H * 0.375, 13, 0, Math.PI * 2); ctx.fill()

    // Arm circle, faint, so the path is readable
    ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(hipX, hipY - armR * 0.28, armR, 0, Math.PI * 2); ctx.stroke()

    // The arm
    const cx = hipX, cy = hipY - armR * 0.28
    const hx = cx + Math.cos(angle) * armR
    const hy = cy + Math.sin(angle) * armR
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 9
    ctx.beginPath(); ctx.moveTo(cx, cy - armR * 0.5); ctx.lineTo(hx, hy); ctx.stroke()

    // Ball — in the hand until release, then gone down the line
    if (!released) {
      ctx.save()
      ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 14
      ctx.fillStyle = '#F5F1E8'
      ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    } else {
      const gone = Math.min(1, (now - releaseAt.current) / 420)
      ctx.save()
      ctx.globalAlpha = 1 - gone
      ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 16
      ctx.fillStyle = '#F5F1E8'
      ctx.beginPath(); ctx.arc(hx + gone * W * 0.45, hy - gone * H * 0.06, 9 - gone * 5, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    // The release marker — where the hand should be when you tap
    const mx = cx + Math.cos(RELEASE_ANGLE) * armR
    const my = cy + Math.sin(RELEASE_ANGLE) * armR
    ctx.strokeStyle = phase === 'wind' ? '#FF4FD880' : '#FF4FD840'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.stroke()

    raf.current = requestAnimationFrame(draw)
  }, [phase])

  useEffect(() => {
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [draw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault(); judge()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [judge])

  function start() {
    setRound(0); setErrors([]); setLast(null); setBest(null)
    beginPitch()
  }

  const avg = errors.length ? Math.round(errors.reduce((a, b) => a + b, 0) / errors.length) : 0
  const overall = errors.length ? gradeFor(avg) : null

  return (
    <>
      <style>{`
        .rl-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .rl-hud { display: flex; gap: 22px; align-items: baseline; margin-bottom: 14px; flex-wrap: wrap; }
        .rl-hud span { font-size: 9px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6878; }
        .rl-hud b { font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-left: 7px; }
        .rl-stage { position: relative; }
        .rl-canvas {
          width: 100%; height: auto; display: block; cursor: pointer; touch-action: manipulation;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .rl-flash {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; pointer-events: none;
        }
        .rl-verdict {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(28px, 8vw, 50px); line-height: 1; transform: skewX(-7deg);
          animation: rl-slam 360ms cubic-bezier(.2,1.7,.4,1);
        }
        @keyframes rl-slam { from { transform: skewX(-7deg) scale(2); opacity: 0; } }
        .rl-ms { font-size: 11px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #F5F1E8; margin-top: 9px; }
        .rl-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060AE6; padding: 24px;
        }
        .rl-key { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 14px; }
        .rl-tape { display: flex; gap: 5px; margin-top: 18px; flex-wrap: wrap; }
        .rl-dot { width: 30px; height: 5px; background: #ffffff10; }
      `}</style>

      <p className="rl-lede">
        The arm comes over and round. Tap the instant the ball leaves the hand — at the bottom of the
        circle, level with the hip. Five pitches, and the arm speed changes every time.
      </p>

      <div className="rl-hud">
        <span>Pitch <b>{Math.min(round + (phase !== 'ready' && phase !== 'done' ? 1 : 0), ROUNDS)}/{ROUNDS}</b></span>
        {best != null && <span>Sharpest <b style={{ color: 'var(--neon)' }}>{Math.round(best)}ms</b></span>}
      </div>

      <div className="rl-stage">
        <canvas ref={canvasRef} className="rl-canvas" width={600} height={420} onClick={judge} />

        {last && phase === 'judged' && (() => {
          const g = gradeFor(last.ms)
          return (
            <div className="rl-flash">
              <p className="rl-verdict" style={{ color: g.colour, textShadow: `0 0 28px ${g.colour}80` }}>{g.label}</p>
              <p className="rl-ms">
                {last.ms >= 999 ? 'Flinched' : `${Math.round(last.ms)}ms ${last.early ? 'early' : 'late'}`}
              </p>
            </div>
          )
        })()}

        {(phase === 'ready' || phase === 'done') && (
          <div className="rl-overlay">
            {phase === 'done' && overall ? (
              <>
                <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: overall.colour }}>
                  {overall.label}
                </p>
                <p className="ar-num" style={{ fontSize: '52px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>{avg}ms</p>
                <p style={{ fontSize: '11px', color: '#7D8B9C' }}>average off the release</p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '20px' }}><span>Go again</span></button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '28ch', lineHeight: 1.6 }}>
                  Watch the hand, not the clock.
                </p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '14px' }}><span>Step in</span></button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="rl-key">Tap the circle or hit space</p>

      {errors.length > 0 && (
        <div className="rl-tape">
          {Array.from({ length: ROUNDS }).map((_, i) => (
            <span key={i} className="rl-dot"
              style={errors[i] != null ? { background: gradeFor(errors[i]).colour } : undefined} />
          ))}
        </div>
      )}
    </>
  )
}