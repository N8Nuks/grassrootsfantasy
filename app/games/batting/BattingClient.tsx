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
  homer:  { label: 'HOME RUN',  points: 15, colour: '#FFD700' },
  triple: { label: 'TRIPLE',    points: 10, colour: '#C6FF00' },
  double: { label: 'DOUBLE',    points: 8,  colour: '#00F0FF' },
  single: { label: 'SINGLE',    points: 5,  colour: '#7FE0A0' },
  foul:   { label: 'FOUL',      points: 0,  colour: '#8FA0B4' },
  out:    { label: 'GROUNDED OUT', points: 0, colour: '#FF7A5C' },
  strike: { label: 'STRIKE',    points: 0,  colour: '#FF4D4D' },
} as const
type ResultKey = keyof typeof RESULTS

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

  // Live pitch state, in refs so the loop doesn't restart on every frame
  const t = useRef(0)                    // 0 at release, 1 at the plate
  const dur = useRef(1400)               // ms for this pitch
  const breakX = useRef(0)               // sideways movement
  const started = useRef(0)
  const swung = useRef(false)
  const settled = useRef(false)
  const ball = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)

  /* The pitcher's strikeouts set speed and movement; the batter's average sets
     how wide the perfect window is. A .571 hitter against a soft arm is a very
     different night to a .250 hitter against the best in the league. */
  const maxK = Math.max(...pitchers.map(p => p.k), 1)
  const heat = pitcher.k / maxK                       // 0..1
  const windowSize = 0.055 + batter.ba * 0.11         // perfect window, in t

  const beginPitch = useCallback(() => {
    dur.current = 1500 - heat * 620 + (Math.random() * 260 - 130)
    breakX.current = (Math.random() * 2 - 1) * (0.16 + heat * 0.3)
    t.current = 0
    swung.current = false
    settled.current = false
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
    }, 1500)
  }, [outs, pitchNo, beginPitch])

  const swing = useCallback(() => {
    if (phase !== 'live' || swung.current || settled.current) return
    swung.current = true
    const off = Math.abs(t.current - 1)

    if (t.current < 0.55) { finish('strike', 0); return }        // way early
    if (off <= windowSize * 0.4) {                                // dead centre
      const dist = 95 + Math.round(Math.random() * 45) + Math.round(batter.hr * 1.5)
      launch(-0.55 - Math.random() * 0.2)
      finish('homer', dist); return
    }
    if (off <= windowSize * 0.8) {
      launch(-0.42); finish('triple', 62 + Math.round(Math.random() * 20)); return
    }
    if (off <= windowSize * 1.3) {
      launch(-0.3); finish('double', 44 + Math.round(Math.random() * 16)); return
    }
    if (off <= windowSize * 2) {
      launch(-0.18); finish('single', 26 + Math.round(Math.random() * 14)); return
    }
    if (off <= windowSize * 3) { launch(-0.6, true); finish('foul', 0); return }
    launch(-0.08); finish('out', 12 + Math.round(Math.random() * 10))
  }, [phase, windowSize, batter.hr, finish])

  function launch(vy: number, foul = false) {
    ball.current = {
      x: 0.5, y: 0.82,
      vx: foul ? (Math.random() > 0.5 ? 0.9 : -0.9) : (Math.random() * 0.5 - 0.25),
      vy,
    }
  }

  // ── The field ──
  const draw = useCallback((now: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height

    // Night sky over the outfield
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#0B0D18')
    sky.addColorStop(0.42, '#101A2E')
    sky.addColorStop(0.43, '#12301C')
    sky.addColorStop(1, '#0A1A10')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    // Floodlight pools
    const pool = ctx.createRadialGradient(W * 0.5, H * 0.2, 10, W * 0.5, H * 0.2, W * 0.7)
    pool.addColorStop(0, '#B47CFF22')
    pool.addColorStop(1, 'transparent')
    ctx.fillStyle = pool
    ctx.fillRect(0, 0, W, H)

    // Outfield wall
    ctx.fillStyle = '#0E1626'
    ctx.fillRect(0, H * 0.40, W, H * 0.045)
    ctx.fillStyle = '#B47CFF35'
    ctx.fillRect(0, H * 0.40, W, 2)

    // Infield dirt arc
    ctx.fillStyle = '#2A1D14'
    ctx.beginPath()
    ctx.ellipse(W / 2, H * 1.02, W * 0.52, H * 0.34, 0, Math.PI, 0)
    ctx.fill()

    // Base paths
    ctx.strokeStyle = '#ffffff20'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2, H * 0.86); ctx.lineTo(W * 0.16, H * 0.60)
    ctx.moveTo(W / 2, H * 0.86); ctx.lineTo(W * 0.84, H * 0.60)
    ctx.stroke()

    // Mound and plate
    ctx.fillStyle = '#3A2A1E'
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.52, W * 0.075, H * 0.026, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#F5F1E8'
    ctx.beginPath()
    ctx.moveTo(W / 2 - 16, H * 0.855); ctx.lineTo(W / 2 + 16, H * 0.855)
    ctx.lineTo(W / 2 + 16, H * 0.875); ctx.lineTo(W / 2, H * 0.893)
    ctx.lineTo(W / 2 - 16, H * 0.875); ctx.closePath(); ctx.fill()

    if (phase === 'live') {
      // Advance the pitch
      if (!swung.current && !settled.current && started.current) {
        t.current = (now - started.current) / dur.current
        if (t.current >= 1.12) finish('strike', 0)
      }

      // Timing ring — tightens as the ball arrives, so the eye has something to read
      if (t.current > 0.15 && t.current < 1.15 && !ball.current) {
        const p = Math.min(t.current, 1)
        const r = 74 - p * 52
        ctx.strokeStyle = `rgba(180, 124, 255, ${0.14 + p * 0.5})`
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(W / 2, H * 0.845, Math.max(r, 14), 0, Math.PI * 2); ctx.stroke()
      }

      if (ball.current) {
        // Hit ball, arcing away
        const b = ball.current
        b.x += b.vx * 0.012
        b.y += b.vy * 0.014
        b.vy += 0.016
        ctx.save()
        ctx.shadowColor = '#F5F1E8'; ctx.shadowBlur = 16
        ctx.fillStyle = '#F5F1E8'
        ctx.beginPath(); ctx.arc(b.x * W, b.y * H, 7, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      } else if (t.current > 0 && t.current < 1.14) {
        // Incoming pitch — grows as it nears, breaking sideways
        const p = t.current
        const x = W / 2 + breakX.current * W * 0.14 * p * p
        const y = H * 0.52 + (H * 0.845 - H * 0.52) * (p * p * 0.72 + p * 0.28)
        const r = 3.5 + p * p * 9
        ctx.save()
        ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 12 + p * 14
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        ctx.strokeStyle = '#C41E3A'
        ctx.lineWidth = Math.max(1, r * 0.24)
        ctx.beginPath(); ctx.arc(x - r * 1.1, y, r * 0.98, -0.9, 0.9); ctx.stroke()
      }
    }
    raf.current = requestAnimationFrame(draw)
  }, [phase, finish])

  useEffect(() => {
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [draw])

  // Space bar swings
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