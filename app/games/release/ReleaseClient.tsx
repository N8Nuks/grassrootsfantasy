'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* You are the runner at first, watching side on. Home is off to the left.

   The delivery: the hand rests at 210 degrees (7 o'clock), rocks back
   anti-clockwise to 170, then swings one full clockwise revolution — 400
   degrees of travel — and releases back at 210, level with the hip. One
   revolution only; two is illegal.

   Five pitches to a set. Take four or more and you move up a level. Reach
   Black Sox and five clean steals in a row promotes you to Black Diamond. */

const SET_SIZE = 5
const PROMOTE_AT = 4          // steals needed in a set to move up
const SAFE = 120              // ms after release for a clean steal
const CLOSE = 260             // ms after release and still under the tag

/* Angles: 0 at 12 o'clock, increasing clockwise. */
const deg = (d: number) => ((d - 90) * Math.PI) / 180
const REST = deg(210)
const ROCK = deg(170)
const RELEASE = ROCK + (400 * Math.PI) / 180
const ROCK_MS = 420

const BALL_YELLOW = '#E8FF3D'

const LEVELS = [
  { name: 'Reserve',       ms: 1450 },
  { name: 'Premier',       ms: 1230 },
  { name: 'Rep',           ms: 1040 },
  { name: 'Black Sox',     ms: 880  },
  { name: 'Black Diamond', ms: 720  },
]
const BLACK_SOX = 3
const BLACK_DIAMOND = 4

type Outcome = 'clean' | 'close' | 'thrown' | 'picked'
const OUT: Record<Outcome, { label: string; sub: string; colour: string }> = {
  clean:  { label: 'STOLEN',     sub: 'Safe by a distance', colour: '#39FF9E' },
  close:  { label: 'SAFE',       sub: 'Under the tag',      colour: '#7DF9FF' },
  thrown: { label: 'THROWN OUT', sub: 'Late off the base',  colour: '#FF4D4D' },
  picked: { label: 'PICKED OFF', sub: 'You left too early', colour: '#FF4D4D' },
}
const isSteal = (o: Outcome) => o === 'clean' || o === 'close'

export default function ReleaseClient() {
  const [phase, setPhase] = useState<'ready' | 'wind' | 'judged' | 'setEnd' | 'done'>('ready')
  const [level, setLevel] = useState(0)
  const [pitch, setPitch] = useState(0)              // within the set
  const [setResults, setSetResults] = useState<Outcome[]>([])
  const [cleanRun, setCleanRun] = useState(0)        // consecutive steals at Black Sox
  const [last, setLast] = useState<{ outcome: Outcome; ms: number } | null>(null)
  const [outcome, setOutcome] = useState<'up' | 'stay' | 'crowned' | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const rockAt = useRef(0)
  const startAt = useRef(0)
  const releaseAt = useRef(0)
  const spin = useRef(1450)
  const judged = useRef(false)
  const goneAt = useRef(0)
  const meterAt = useRef(0)          // where the needle stopped, in ms off release

  const beginPitch = useCallback((lv: number) => {
    judged.current = false
    goneAt.current = 0
    meterAt.current = 0
    setLast(null)
    spin.current = LEVELS[lv].ms
    const pause = 900 + Math.random() * 1500
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
    meterAt.current = ms

    const result: Outcome = ms < 0 ? 'picked' : ms <= SAFE ? 'clean' : ms <= CLOSE ? 'close' : 'thrown'
    setLast({ outcome: result, ms })
    const nextResults = [...setResults, result]
    setSetResults(nextResults)

    // A run of clean steals at Black Sox is the only way to Black Diamond
    const nextRun = level === BLACK_SOX && isSteal(result) ? cleanRun + 1 : 0
    setCleanRun(nextRun)
    setPhase('judged')

    setTimeout(() => {
      if (nextRun >= 5) { setOutcome('crowned'); setPhase('setEnd'); return }
      const nextPitch = pitch + 1
      if (nextPitch >= SET_SIZE) {
        const stolen = nextResults.filter(isSteal).length
        const canRise = stolen >= PROMOTE_AT && level < BLACK_SOX
        setOutcome(canRise ? 'up' : 'stay')
        setPhase('setEnd')
        return
      }
      setPitch(nextPitch)
      beginPitch(level)
    }, 1800)
  }, [phase, setResults, pitch, level, cleanRun, beginPitch])

  function nextSet() {
    const rise = outcome === 'up'
    const lv = rise ? level + 1 : level
    setLevel(lv); setPitch(0); setSetResults([]); setOutcome(null); setLast(null)
    if (!rise) setCleanRun(0)
    beginPitch(lv)
  }

  function startOver() {
    setLevel(0); setPitch(0); setSetResults([]); setCleanRun(0); setOutcome(null); setLast(null)
    beginPitch(0)
  }

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

    const firstX = W * 0.13, secondX = W * 0.87, baseY = H * 0.855
    ctx.strokeStyle = '#C9A87828'; ctx.lineWidth = H * 0.048
    ctx.beginPath(); ctx.moveTo(firstX, baseY); ctx.lineTo(secondX, baseY); ctx.stroke()
    for (const [bx, label] of [[firstX, '1st'], [secondX, '2nd']] as [number, string][]) {
      ctx.fillStyle = '#F5F1E8'
      ctx.save(); ctx.translate(bx, baseY); ctx.rotate(Math.PI / 4)
      ctx.fillRect(-10, -10, 20, 20); ctx.restore()
      ctx.fillStyle = '#ffffff30'
      ctx.font = `900 ${Math.round(H * 0.024)}px var(--font-heading), sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(label, bx, baseY + H * 0.065)
    }
    ctx.fillStyle = '#ffffff20'
    ctx.textAlign = 'left'
    ctx.fillText('← HOME', W * 0.03, H * 0.5)

    ctx.fillStyle = '#3A2A1E'
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.585, W * 0.145, H * 0.038, 0, 0, Math.PI * 2); ctx.fill()

    // ── Arm position ──
    const hipX = W / 2, hipY = H * 0.46, armR = H * 0.165
    const cx = hipX, cy = hipY - armR * 0.34

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
        angle = REST + (ROCK - REST) * Math.min(tRock / ROCK_MS, 1)
        loading = true
      } else if (tRock > -340) {
        loading = true
      }
    }

    // ── The pitcher, facing home (left) ──
    // Back arm first so it sits behind the torso
    ctx.strokeStyle = '#141821'; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(hipX + 4, H * 0.375); ctx.lineTo(hipX + 24, H * 0.425); ctx.stroke()
    ctx.fillStyle = '#141821'
    ctx.beginPath(); ctx.ellipse(hipX + 27, H * 0.432, 6.5, 7.5, -0.4, 0, Math.PI * 2); ctx.fill()

    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 8
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX - 20, H * 0.585); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX + 14, H * 0.585); ctx.stroke()
    ctx.strokeStyle = '#FF4FD8'; ctx.lineWidth = 14
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX - 3, H * 0.345); ctx.stroke()

    const headX = hipX - 4, headY = H * 0.315
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(headX, headY, 11, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FF4FD8'
    ctx.beginPath(); ctx.arc(headX, headY - 2, 11, Math.PI, 0); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(headX, headY - 5); ctx.lineTo(headX - 22, headY - 2)
    ctx.lineTo(headX - 22, headY + 2); ctx.lineTo(headX, headY - 1)
    ctx.closePath(); ctx.fill()

    // The circle and the release mark
    ctx.strokeStyle = '#ffffff0B'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, armR, 0, Math.PI * 2); ctx.stroke()
    const mx = cx + Math.cos(REST) * armR
    const my = cy + Math.sin(REST) * armR
    ctx.strokeStyle = released ? '#39FF9E60' : '#FF4FD850'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.stroke()

    // Throwing arm, shoulder offset right so it reads as the far arm
    const hx = cx + Math.cos(angle) * armR
    const hy = cy + Math.sin(angle) * armR
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(cx + 5, cy); ctx.lineTo(hx, hy); ctx.stroke()

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
      const g = (now - releaseAt.current) / 620
      const bx = mx - g * W * 0.72
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - g * 0.85)
      ctx.shadowColor = BALL_YELLOW; ctx.shadowBlur = 18
      ctx.fillStyle = BALL_YELLOW
      ctx.beginPath(); ctx.arc(bx, my, 8.5, 0, Math.PI * 2); ctx.fill()
      const trail = ctx.createLinearGradient(bx, my, bx + W * 0.14, my)
      trail.addColorStop(0, `${BALL_YELLOW}70`); trail.addColorStop(1, 'transparent')
      ctx.strokeStyle = trail; ctx.lineWidth = 7
      ctx.beginPath(); ctx.moveTo(bx, my); ctx.lineTo(bx + W * 0.14, my); ctx.stroke()
      ctx.restore()
    }

    // ── The timing meter ──
    // Red before the release, green in the steal window, yellow while the throw
    // is still beatable, red again once it isn't. The needle rides it live.
    const mW = W * 0.62, mH = H * 0.036
    const mX = (W - mW) / 2, mY = H * 0.075
    const span = 700                                  // ms shown across the bar
    const zeroX = mX + mW * (300 / span)              // where the release sits

    ctx.fillStyle = '#00000060'; ctx.fillRect(mX - 2, mY - 2, mW + 4, mH + 4)
    const seg = (from: number, to: number, colour: string) => {
      const a = mX + mW * ((from + 300) / span)
      const b = mX + mW * ((to + 300) / span)
      ctx.fillStyle = colour; ctx.fillRect(a, mY, b - a, mH)
    }
    seg(-300, 0, '#FF4D4D')          // early — picked off
    seg(0, SAFE, '#39FF9E')          // gone on the release
    seg(SAFE, CLOSE, '#FFB800')      // late but safe
    seg(CLOSE, 400, '#FF4D4D')       // thrown out

    ctx.strokeStyle = '#F5F1E8'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(zeroX, mY - 5); ctx.lineTo(zeroX, mY + mH + 5); ctx.stroke()
    ctx.fillStyle = '#F5F1E8'
    ctx.font = `900 ${Math.round(H * 0.019)}px var(--font-heading), sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('RELEASE', zeroX, mY - 9)

    // Needle: live while the arm turns, frozen where you went
    let needleMs: number | null = null
    if (phase === 'judged' && goneAt.current) needleMs = meterAt.current
    else if (phase === 'wind' && now > rockAt.current) needleMs = now - releaseAt.current
    if (needleMs != null && needleMs > -320 && needleMs < 420) {
      const nx = mX + mW * ((needleMs + 300) / span)
      ctx.save()
      ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 12
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.moveTo(nx, mY - 7); ctx.lineTo(nx - 5, mY - 15); ctx.lineTo(nx + 5, mY - 15)
      ctx.closePath(); ctx.fill()
      ctx.fillRect(nx - 1.5, mY - 6, 3, mH + 12)
      ctx.restore()
    }

    // ── The runner ──
    let runP = 0
    if (goneAt.current) runP = Math.min(1, (now - goneAt.current) / 1150)
    const rx = firstX + (secondX - firstX) * runP
    const stride = goneAt.current ? Math.sin(now / 52) : 0
    const lean = goneAt.current ? 0.36 : 0.1

    ctx.save()
    ctx.translate(rx, baseY)
    ctx.rotate(lean)
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-10 + stride * 10, 0); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(10 - stride * 10, 0); ctx.stroke()
    ctx.strokeStyle = '#FFB800'; ctx.lineWidth = 11
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -46); ctx.stroke()
    // Helmet, facing second
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(0, -54, 8.5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FFB800'
    ctx.beginPath(); ctx.arc(0, -55, 9.5, Math.PI, 0); ctx.fill()
    ctx.beginPath(); ctx.ellipse(-4, -52, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(8, -58, 8, 3.5)
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

  const stolen = setResults.filter(isSteal).length

  return (
    <>
      <style>{`
        .rl-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .rl-hud { display: flex; align-items: stretch; gap: 1px; margin-bottom: 12px; background: #ffffff10; border: 1px solid #ffffff12; }
        .rl-stat { flex: 1; background: #07080D; padding: 11px 6px; text-align: center; }
        .rl-stat span { display: block; font-size: 8px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; color: #4E5A6A; }
        .rl-stat b { display: block; font-family: var(--font-heading); font-size: 17px; color: #F5F1E8; margin-top: 3px; }
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
        .rl-tape { display: flex; gap: 6px; margin-top: 18px; justify-content: center; }
        .rl-dot { width: 40px; height: 6px; background: #ffffff10; }
        .rl-ladder { display: flex; flex-direction: column; gap: 6px; margin-top: 22px; }
        .rl-rung {
          display: flex; align-items: center; gap: 11px; padding: 10px 13px;
          border: 1px solid #ffffff12; background: #ffffff05; font-size: 11px; color: #7D8B9C;
        }
        .rl-rung[data-on="true"] { border-color: var(--neon); color: #F5F1E8; background: color-mix(in srgb, var(--neon) 10%, transparent); }
        .rl-rung[data-done="true"] { color: #39FF9E; }
        .rl-n { font-family: var(--font-heading); font-weight: 900; color: #3E4A58; width: 16px; }
      `}</style>

      <p className="rl-lede">
        You&apos;re on first, home off to your left. The hand rocks back, comes round once, and the ball
        goes at 7 o&apos;clock. Watch the meter: leave in the green and second is yours. Five pitches to a
        set — take four and you move up.
      </p>

      <div className="rl-hud">
        <span className="rl-stat"><span>Level</span><b style={{ color: 'var(--neon)', fontSize: '13px' }}>{LEVELS[level].name}</b></span>
        <span className="rl-stat"><span>Pitch</span><b>{Math.min(pitch + (phase === 'wind' || phase === 'judged' ? 1 : 0), SET_SIZE)}/{SET_SIZE}</b></span>
        <span className="rl-stat"><span>Stolen</span><b>{stolen}</b></span>
        {level === BLACK_SOX && <span className="rl-stat"><span>In a row</span><b style={{ color: cleanRun >= 3 ? '#FFD700' : undefined }}>{cleanRun}/5</b></span>}
      </div>

      <div className="rl-stage">
        <canvas ref={canvasRef} className="rl-canvas" width={640} height={440} onClick={go} />

        {last && phase === 'judged' && (
          <div className="rl-flash">
            <p className="rl-verdict" style={{ color: OUT[last.outcome].colour, textShadow: `0 0 28px ${OUT[last.outcome].colour}80` }}>
              {OUT[last.outcome].label}
            </p>
            <p className="rl-sub">{OUT[last.outcome].sub}</p>
            <p className="rl-ms">
              {last.ms < 0 ? `${Math.round(-last.ms)}ms early` : `${Math.round(last.ms)}ms after the release`}
            </p>
          </div>
        )}

        {(phase === 'ready' || phase === 'setEnd') && (
          <div className="rl-overlay">
            {phase === 'setEnd' ? (
              <>
                <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase',
                            color: outcome === 'stay' ? '#FF4D4D' : outcome === 'crowned' ? '#FFD700' : '#39FF9E' }}>
                  {outcome === 'crowned' ? 'Black Diamond' : outcome === 'up' ? 'Moving up' : 'Set over'}
                </p>
                <p className="ar-num" style={{ fontSize: '46px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>
                  {outcome === 'crowned' ? '5 in a row' : `${stolen}/${SET_SIZE}`}
                </p>
                <p style={{ fontSize: '12px', color: '#7D8B9C', maxWidth: '30ch', lineHeight: 1.6 }}>
                  {outcome === 'crowned'
                    ? 'Five clean off Black Sox. Nothing left to prove.'
                    : outcome === 'up'
                      ? `Four or better — you're up to ${LEVELS[level + 1].name}.`
                      : level === BLACK_SOX
                        ? 'Five clean in a row is the only way past Black Sox.'
                        : `Four steals moves you up. Run the ${LEVELS[level].name} set again.`}
                </p>
                {outcome === 'crowned' ? (
                  <button className="ar-btn" onClick={startOver} style={{ marginTop: '18px' }}><span>Start again</span></button>
                ) : (
                  <button className="ar-btn" onClick={nextSet} style={{ marginTop: '18px' }}>
                    <span>{outcome === 'up' ? `Face ${LEVELS[level + 1].name}` : 'Run it again'}</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '30ch', lineHeight: 1.6 }}>
                  Five pitches at Reserve. Take four and you move up.
                </p>
                <button className="ar-btn" onClick={start} style={{ marginTop: '14px' }}><span>Take the Base</span></button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="rl-key">Press space, or tap the field</p>

      <div className="rl-tape">
        {Array.from({ length: SET_SIZE }).map((_, i) => (
          <span key={i} className="rl-dot"
            style={setResults[i] ? { background: OUT[setResults[i]].colour } : undefined} />
        ))}
      </div>

      <div className="rl-ladder">
        {LEVELS.map((lv, i) => (
          <span key={lv.name} className="rl-rung" data-on={i === level} data-done={i < level}>
            <span className="rl-n">{i + 1}</span>
            {lv.name}
            <span style={{ marginLeft: 'auto', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {i === BLACK_DIAMOND ? '5 clean in a row' : i < level ? 'Passed' : i === level ? '4 of 5 to pass' : ''}
            </span>
          </span>
        ))}
      </div>
    </>
  )
}