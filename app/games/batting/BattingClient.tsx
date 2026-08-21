'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { splitName } from '@/lib/names'

export type Legend = { name: string; titles: number; grade: string }

const PITCHES = 10
const OUTS = 3

const RESULTS = {
  homer:  { label: 'HOME RUN',     points: 15, colour: '#FFD700', flight: 'over' },
  triple: { label: 'TRIPLE',       points: 10, colour: '#C6FF00', flight: 'deep' },
  double: { label: 'DOUBLE',       points: 8,  colour: '#00F0FF', flight: 'deep' },
  single: { label: 'SINGLE',       points: 5,  colour: '#7FE0A0', flight: 'liner' },
  foul:   { label: 'FOUL BALL',    points: 0,  colour: '#8FA0B4', flight: 'back' },
  out:    { label: 'GROUNDED OUT', points: 0,  colour: '#FF7A5C', flight: 'ground' },
  strike: { label: 'STRIKE',       points: 0,  colour: '#FF4D4D', flight: 'none' },
} as const
type ResultKey = keyof typeof RESULTS

// The zone is the width of the plate and no wider, quartered into nine cells
const ZONE = { x: 0.5, y: 0.66, w: 0.105, h: 0.125 }
const SWING_MS = 300

export default function LegendsClient({ batters, pitchers }: { batters: Legend[]; pitchers: Legend[] }) {
  const [batter, setBatter] = useState<Legend>(batters[0])
  const [pitcher, setPitcher] = useState<Legend>(pitchers[0])
  const [phase, setPhase] = useState<'setup' | 'live' | 'done'>('setup')

  const [pitchNo, setPitchNo] = useState(0)
  const [outs, setOuts] = useState(0)
  const [score, setScore] = useState(0)
  const [log, setLog] = useState<{ key: ResultKey; dist: number; off: number; angle: number }[]>([])
  const [flash, setFlash] = useState<{ key: ResultKey; dist: number; off: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const t = useRef(0)
  const dur = useRef(1400)
  const breakX = useRef(0)
  const started = useRef(0)
  const windUp = useRef(0)
  const swung = useRef(false)
  const settled = useRef(false)
  const swingAt = useRef(0)
  const contact = useRef(false)
  const ball = useRef<{ x: number; y: number; vx: number; vy: number; g: number } | null>(null)

  const maxBatTitles = Math.max(...batters.map(b => b.titles), 1)
  const maxPitTitles = Math.max(...pitchers.map(p => p.titles), 1)
  const heat = pitcher.titles / maxPitTitles
  const eye = batter.titles / maxBatTitles
  const windowSize = 0.058 + eye * 0.055

  const beginPitch = useCallback(() => {
    dur.current = 1520 - heat * 620 + (Math.random() * 240 - 120)
    breakX.current = (Math.random() * 2 - 1) * (0.14 + heat * 0.3)
    t.current = -0.55
    swung.current = false
    settled.current = false
    contact.current = false
    swingAt.current = 0
    ball.current = null
    started.current = performance.now()
  }, [heat])

  const finish = useCallback((key: ResultKey, dist: number, off: number, angle: number) => {
    if (settled.current) return
    settled.current = true
    setFlash({ key, dist, off })
    setScore(s => s + RESULTS[key].points)
    setLog(l => [...l, { key, dist, off, angle }])
    const isOut = key === 'strike' || key === 'out'
    const nextOuts = outs + (isOut ? 1 : 0)
    const nextPitch = pitchNo + 1
    if (isOut) setOuts(nextOuts)
    setPitchNo(nextPitch)
    setTimeout(() => {
      setFlash(null)
      if (nextOuts >= OUTS || nextPitch >= PITCHES) setPhase('done')
      else beginPitch()
    }, 1700)
  }, [outs, pitchNo, beginPitch])

  function launch(kind: string, angle: number) {
    contact.current = true
    const base = { x: ZONE.x, y: ZONE.y }
    if (kind === 'over')        ball.current = { ...base, vx: angle * 0.8, vy: -1.4, g: 0.0118 }
    else if (kind === 'deep')   ball.current = { ...base, vx: angle * 1.1, vy: -1.02, g: 0.0185 }
    else if (kind === 'liner')  ball.current = { ...base, vx: angle * 1.4, vy: -0.6, g: 0.021 }
    else if (kind === 'ground') ball.current = { ...base, vx: angle * 1.7, vy: -0.14, g: 0.028 }
    else if (kind === 'back')   ball.current = { ...base, vx: (angle > 0 ? 1 : -1) * 0.55, vy: -1.55, g: 0.031 }
  }

  const swing = useCallback(() => {
    if (phase !== 'live' || swung.current || settled.current) return
    swung.current = true
    swingAt.current = performance.now()
    const off = t.current - 1
    const abs = Math.abs(off)
    if (t.current < 0.5) { setTimeout(() => finish('strike', 0, off, 0), 320); return }
    const angle = Math.max(-1, Math.min(1, -off * 5))

    let key: ResultKey
    let dist = 0
    if (abs <= windowSize * 0.4) { key = 'homer'; dist = 92 + Math.round(Math.random() * 42) + batter.titles * 4 }
    else if (abs <= windowSize * 0.8) { key = 'triple'; dist = 62 + Math.round(Math.random() * 20) }
    else if (abs <= windowSize * 1.3) { key = 'double'; dist = 44 + Math.round(Math.random() * 16) }
    else if (abs <= windowSize * 2)   { key = 'single'; dist = 26 + Math.round(Math.random() * 14) }
    else if (abs <= windowSize * 3)   { key = 'foul'; dist = 0 }
    else { key = 'out'; dist = 12 + Math.round(Math.random() * 10) }

    setTimeout(() => { launch(RESULTS[key].flight, angle); finish(key, dist, off, angle) }, SWING_MS * 0.38)
  }, [phase, windowSize, batter.titles, finish])

  /* ── The batter ──
     The whole swing turns about the waist, not the shoulders. Hands stay in
     front of the chest and the barrel whips round behind them, so from behind
     the pitcher the bat sweeps level across the frame rather than chopping. */
  function drawBatter(ctx: CanvasRenderingContext2D, W: number, H: number, now: number) {
    const bx = W * (ZONE.x - 0.155)
    const waistY = H * 0.80              // the fulcrum
    let s = 0
    if (swung.current && swingAt.current) s = Math.min(1, (now - swingAt.current) / SWING_MS)
    const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2

    const ink = '#0A0C10'
    const kit = '#B47CFF'
    const turn = -1.05 + e * 2.4         // radians the trunk rotates about the waist

    ctx.save()
    ctx.translate(bx, waistY)

    // Legs below the fulcrum — back foot pivots, front leg braces
    ctx.strokeStyle = ink; ctx.lineWidth = 10; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-17 - e * 4, H * 0.115); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(19 + e * 10, H * 0.115); ctx.stroke()

    // Everything above the waist rotates as one
    ctx.save()
    ctx.rotate(turn * 0.36)
    ctx.strokeStyle = kit; ctx.lineWidth = 17
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -H * 0.085); ctx.stroke()
    // Head stays back and level — a hitter watches the ball in
    ctx.save()
    ctx.rotate(-turn * 0.32)
    ctx.fillStyle = ink
    ctx.beginPath(); ctx.arc(0, -H * 0.115, 11, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = kit
    ctx.beginPath(); ctx.arc(0, -H * 0.12, 11, Math.PI, 0); ctx.fill()
    ctx.fillRect(0, -H * 0.128, 15, 4)
    ctx.restore()
    ctx.restore()

    // The bat pivots about the waist, hands riding just ahead of the barrel
    ctx.save()
    ctx.rotate(turn)
    const handX = 26, barrelX = 88
    ctx.strokeStyle = ink; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(0, -H * 0.07); ctx.lineTo(handX, -6); ctx.stroke()
    const grain = ctx.createLinearGradient(handX, 0, barrelX, 0)
    grain.addColorStop(0, '#6E4F2C'); grain.addColorStop(1, '#D9B36A')
    ctx.strokeStyle = grain; ctx.lineCap = 'round'
    ctx.lineWidth = 6
    ctx.beginPath(); ctx.moveTo(handX, -6); ctx.lineTo(barrelX - 18, -6); ctx.stroke()
    ctx.lineWidth = 11
    ctx.beginPath(); ctx.moveTo(barrelX - 20, -6); ctx.lineTo(barrelX, -6); ctx.stroke()
    ctx.restore()

    // Barrel blur, level through the zone
    if (s > 0.12 && s < 0.88) {
      ctx.save()
      ctx.strokeStyle = `rgba(217,179,106,${0.34 * (1 - Math.abs(s - 0.5) * 2)})`
      ctx.lineWidth = 20
      ctx.beginPath(); ctx.arc(0, -6, 84, turn - 1.0, turn, false); ctx.stroke()
      ctx.restore()
    }
    ctx.restore()

    if (contact.current && s > 0.3 && s < 0.72) {
      const px = W * ZONE.x, py = H * ZONE.y
      ctx.save(); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3
      const r = 12 + (s - 0.3) * 70
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + s * 3
        ctx.beginPath()
        ctx.moveTo(px + Math.cos(a) * r * 0.4, py + Math.sin(a) * r * 0.4)
        ctx.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  function drawPitcher(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const px = W * 0.5, py = H * 0.42, armR = H * 0.075
    const w = Math.max(0, Math.min(1, windUp.current))
    const angle = -Math.PI / 2 + w * Math.PI * 2
    ctx.save()
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 10, py + H * 0.06); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 11 + w * 14, py + H * 0.06); ctx.stroke()
    ctx.strokeStyle = '#5C3E8E'; ctx.lineWidth = 11
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - H * 0.05); ctx.stroke()
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(px, py - H * 0.065, 8, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(px, py - H * 0.045)
    ctx.lineTo(px + Math.cos(angle) * armR, py - H * 0.045 + Math.sin(angle) * armR)
    ctx.stroke()
    ctx.restore()
  }

  const draw = useCallback((now: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height

    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#0B0D18'); sky.addColorStop(0.32, '#101A2E')
    sky.addColorStop(0.33, '#12301C'); sky.addColorStop(1, '#0A1A10')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    const pool = ctx.createRadialGradient(W * 0.5, H * 0.12, 10, W * 0.5, H * 0.12, W * 0.75)
    pool.addColorStop(0, '#B47CFF1C'); pool.addColorStop(1, 'transparent')
    ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#0E1626'; ctx.fillRect(0, H * 0.30, W, H * 0.035)
    ctx.fillStyle = '#B47CFF45'; ctx.fillRect(0, H * 0.30, W, 2)
    ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W * ZONE.x, H * 0.92); ctx.lineTo(W * 0.02, H * 0.33)
    ctx.moveTo(W * ZONE.x, H * 0.92); ctx.lineTo(W * 0.98, H * 0.33)
    ctx.stroke()
    ctx.fillStyle = '#2A1D14'
    ctx.beginPath(); ctx.ellipse(W / 2, H * 1.08, W * 0.55, H * 0.36, 0, Math.PI, 0); ctx.fill()
    ctx.fillStyle = '#3A2A1E'
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.455, W * 0.07, H * 0.022, 0, 0, Math.PI * 2); ctx.fill()

    // Home plate, drawn to the same width as the zone above it
    const pw = W * ZONE.w
    ctx.fillStyle = '#F5F1E8'
    ctx.beginPath()
    ctx.moveTo(W / 2 - pw / 2, H * 0.905); ctx.lineTo(W / 2 + pw / 2, H * 0.905)
    ctx.lineTo(W / 2 + pw / 2, H * 0.925); ctx.lineTo(W / 2, H * 0.944)
    ctx.lineTo(W / 2 - pw / 2, H * 0.925); ctx.closePath(); ctx.fill()

    // Nine-cell zone
    const zx = W * (ZONE.x - ZONE.w / 2), zy = H * (ZONE.y - ZONE.h / 2)
    const zw = W * ZONE.w, zh = H * ZONE.h
    const near = phase === 'live' && !settled.current ? Math.min(Math.max(t.current, 0), 1) : 0
    ctx.strokeStyle = `rgba(180,124,255,${0.28 + near * 0.55})`; ctx.lineWidth = 2
    ctx.strokeRect(zx, zy, zw, zh)
    ctx.strokeStyle = `rgba(180,124,255,${0.12 + near * 0.24})`; ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 1; i < 3; i++) {
      ctx.moveTo(zx + (zw * i) / 3, zy); ctx.lineTo(zx + (zw * i) / 3, zy + zh)
      ctx.moveTo(zx, zy + (zh * i) / 3); ctx.lineTo(zx + zw, zy + (zh * i) / 3)
    }
    ctx.stroke()

    if (phase === 'live') {
      if (!swung.current && !settled.current && started.current) {
        t.current = -0.55 + ((now - started.current) / dur.current) * 1.55
        windUp.current = Math.min(1, Math.max(0, (t.current + 0.55) / 0.55))
        if (t.current >= 1.14) finish('strike', 0, t.current - 1, 0)
      }
      drawPitcher(ctx, W, H)

      const b = ball.current
      if (b) {
        b.x += b.vx * 0.011
        b.y += b.vy * 0.013
        b.vy += b.g
        if (b.y > 0.915 && b.vy > 0) { b.y = 0.915; b.vy *= -0.4; b.vx *= 0.7 }
        ctx.save()
        ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 18
        ctx.fillStyle = '#E8FF3D'
        const r = Math.max(3, 8 - (0.9 - b.y) * 6)
        ctx.beginPath(); ctx.arc(b.x * W, b.y * H, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      } else if (!contact.current && t.current > 0 && t.current < 1.16) {
        const p = t.current
        const x = W * ZONE.x + breakX.current * W * 0.12 * p * p
        const y = H * 0.455 + (H * ZONE.y - H * 0.455) * (p * p * 0.7 + p * 0.3)
        const r = 3.5 + p * p * 9
        ctx.save()
        ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 12 + p * 16
        ctx.fillStyle = '#E8FF3D'
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        ctx.strokeStyle = '#C41E3A'; ctx.lineWidth = Math.max(1, r * 0.24)
        ctx.beginPath(); ctx.arc(x - r * 1.1, y, r * 0.98, -0.9, 0.9); ctx.stroke()
      }
    }

    drawBatter(ctx, W, H, now)
    raf.current = requestAnimationFrame(draw)
  }, [phase, finish])

  useEffect(() => {
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [draw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault(); swing()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [swing])

  function start() {
    setPitchNo(0); setOuts(0); setScore(0); setLog([]); setFlash(null)
    setPhase('live'); beginPitch()
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span style={{ textTransform: 'uppercase' }}>{s.last}</span></>
  }
  const hits = log.filter(l => ['homer','triple','double','single'].includes(l.key)).length
  const homers = log.filter(l => l.key === 'homer').length
  const furthest = log.reduce((m, l) => Math.max(m, l.dist), 0)
  const contactRate = log.length ? Math.round((log.filter(l => l.key !== 'strike').length / log.length) * 100) : 0

  function Card({ p, on, onPick, max }: { p: Legend; on: boolean; onPick: () => void; max: number }) {
    return (
      <button className="bt-pick" data-on={on} onClick={onPick}>
        <span className="bt-face">
          <span className="bt-crest">{p.titles}</span>
        </span>
        <span className="bt-pn">{caps(p.name)}</span>
        <span className="bt-pm">{p.titles} title{p.titles === 1 ? '' : 's'} · {p.grade}</span>
        <span className="bt-bar"><i style={{ width: `${Math.round((p.titles / max) * 100)}%` }} /></span>
      </button>
    )
  }

  return (
    <>
      <style>{`
        .bt-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .bt-lbl { font-size: 9px; font-weight: 900; letter-spacing: 0.3em; text-transform: uppercase; color: #4E5A6A; margin: 20px 0 9px; }
        .bt-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
        .bt-strip::-webkit-scrollbar { display: none; }
        .bt-pick {
          flex: 0 0 auto; width: 104px; cursor: pointer; padding: 0 0 10px; text-align: center;
          background: linear-gradient(160deg, #0C0F16 0%, #07080D 100%);
          border: 1px solid #ffffff14; transition: border-color 150ms ease, transform 150ms ease;
        }
        .bt-pick:hover { transform: translateY(-3px); border-color: #ffffff35; }
        .bt-pick[data-on="true"] { border-color: var(--neon); box-shadow: 0 0 20px color-mix(in srgb, var(--neon) 40%, transparent); }
        .bt-face { height: 58px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(180deg, color-mix(in srgb, var(--neon) 18%, transparent), transparent); }
        .bt-crest { font-family: var(--font-heading); font-weight: 900; font-size: 30px; color: var(--neon); text-shadow: 0 0 18px color-mix(in srgb, var(--neon) 60%, transparent); }
        .bt-pn { font-family: var(--font-heading); font-weight: 900; font-size: 11px; color: #F5F1E8; margin-top: 8px; padding: 0 5px; line-height: 1.15; display: block; }
        .bt-pm { font-size: 9px; color: #5C6878; margin-top: 3px; display: block; }
        .bt-bar { height: 3px; background: #ffffff12; margin: 6px 8px 0; display: block; }
        .bt-bar i { display: block; height: 100%; background: var(--neon); }

        .bt-hud { display: flex; align-items: stretch; gap: 1px; margin: 20px 0 12px; background: #ffffff10; border: 1px solid #ffffff12; }
        .bt-stat { flex: 1; background: #07080D; padding: 10px 6px; text-align: center; }
        .bt-stat span { display: block; font-size: 8px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #4E5A6A; }
        .bt-stat b { display: block; font-family: var(--font-heading); font-size: 19px; color: #F5F1E8; margin-top: 3px; }

        .bt-stage { position: relative; }
        .bt-canvas {
          width: 100%; height: auto; display: block; cursor: pointer; touch-action: manipulation;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .bt-flash { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
        .bt-verdict {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(30px, 9vw, 56px); line-height: 1; transform: skewX(-7deg);
          animation: bt-slam 380ms cubic-bezier(.2,1.7,.4,1);
        }
        @keyframes bt-slam { from { transform: skewX(-7deg) scale(2.1); opacity: 0; } }
        .bt-dist { font-size: 11px; font-weight: 900; letter-spacing: 0.26em; text-transform: uppercase; color: #F5F1E8; margin-top: 8px; }
        .bt-timing { width: 62%; max-width: 260px; height: 8px; background: #ffffff12; margin-top: 14px; position: relative; }
        .bt-timing i { position: absolute; top: -4px; width: 3px; height: 16px; background: #F5F1E8; box-shadow: 0 0 8px #fff; }
        .bt-timing u { position: absolute; top: 0; bottom: 0; left: 42%; width: 16%; background: #FFD70055; }
        .bt-tlbl { display: flex; justify-content: space-between; width: 62%; max-width: 260px; margin-top: 5px; font-size: 8px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; color: #5C6878; }
        .bt-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060Aee; padding: 24px;
        }
        .bt-key { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 14px; }
        .bt-tape { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 16px; }
        .bt-dot { width: 26px; height: 5px; background: #ffffff10; }
      `}</style>

      <p className="bt-lede">
        Every batting and pitching champion the NFS has ever crowned, in one cage. Titles won stand in
        for the stats — the more a hitter won, the wider your window; the more an arm won, the less
        time you get.
      </p>

      {phase === 'setup' && (
        <>
          <p className="bt-lbl">In the box · most batting titles</p>
          <div className="bt-strip">
            {batters.map(b => (
              <Card key={b.name + b.grade} p={b} max={maxBatTitles}
                on={batter.name === b.name} onPick={() => setBatter(b)} />
            ))}
          </div>
          <p className="bt-lbl">On the mound · most pitching titles</p>
          <div className="bt-strip">
            {pitchers.map(p => (
              <Card key={p.name + p.grade} p={p} max={maxPitTitles}
                on={pitcher.name === p.name} onPick={() => setPitcher(p)} />
            ))}
          </div>
        </>
      )}

      <div className="bt-hud">
        <span className="bt-stat"><span>Pitch</span><b>{Math.min(pitchNo + (phase === 'live' ? 1 : 0), PITCHES)}/{PITCHES}</b></span>
        <span className="bt-stat"><span>Outs</span><b style={{ color: outs > 0 ? '#FF4D4D' : undefined }}>{outs}/{OUTS}</b></span>
        <span className="bt-stat"><span>Contact</span><b>{contactRate}%</b></span>
        <span className="bt-stat"><span>Score</span><b style={{ color: 'var(--neon)' }}>{score}</b></span>
      </div>

      <div className="bt-stage">
        <canvas ref={canvasRef} className="bt-canvas" width={600} height={460} onClick={swing} />

        {flash && (
          <div className="bt-flash">
            <p className="bt-verdict" style={{ color: RESULTS[flash.key].colour, textShadow: `0 0 30px ${RESULTS[flash.key].colour}80` }}>
              {RESULTS[flash.key].label}
            </p>
            {flash.dist > 0 && <p className="bt-dist">{flash.dist} metres</p>}
            {flash.key !== 'strike' && (
              <>
                <span className="bt-timing">
                  <u />
                  <i style={{ left: `${Math.max(2, Math.min(98, 50 + flash.off * 120))}%` }} />
                </span>
                <span className="bt-tlbl"><span>Early</span><span>On it</span><span>Late</span></span>
              </>
            )}
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
                <button className="ar-btn" onClick={() => setPhase('setup')} style={{ marginTop: '18px' }}>
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
            <span key={i} className="bt-dot" style={log[i] ? { background: RESULTS[log[i].key].colour } : undefined} />
          ))}
        </div>
      )}
    </>
  )
}