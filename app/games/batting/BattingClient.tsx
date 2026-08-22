'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { splitName } from '@/lib/names'

export type Legend = { name: string; titles: number; grade: string; lefty: boolean }

const PITCHES = 10
const OUTS = 3

/* Each result flies its own way: over the fence into the crowd, flat to the
   wall, one bounce and over, or through the infield. */
const RESULTS = {
  homer:  { label: 'HOME RUN',     points: 15, colour: '#FFD700', flight: 'over' },
  triple: { label: 'TRIPLE',       points: 10, colour: '#C6FF00', flight: 'wall' },
  double: { label: 'DOUBLE',       points: 8,  colour: '#00F0FF', flight: 'bounce' },
  single: { label: 'SINGLE',       points: 5,  colour: '#7FE0A0', flight: 'through' },
  foul:   { label: 'FOUL BALL',    points: 0,  colour: '#8FA0B4', flight: 'back' },
  out:    { label: 'GROUNDED OUT', points: 0,  colour: '#FF7A5C', flight: 'ground' },
  strike: { label: 'STRIKE',       points: 0,  colour: '#FF4D4D', flight: 'none' },
} as const
type ResultKey = keyof typeof RESULTS

// Knees to the letters, no wider than the plate beneath it
const ZONE = { x: 0.5, y: 0.755, w: 0.105, h: 0.125 }
/* Field depths, as fractions of the canvas. A softball diamond is tight in the
   middle and deep to the fence — 46 feet to the circle, 60 to the bases, and
   200 to the wall — so the pitcher stands close and the outfield runs away. */
const FENCE_Y = 0.30           // top of the wall
const MOUND_Y = 0.63           // the circle, well inside the dirt
const INFIELD_TOP = 0.585      // where the dirt gives way to grass
const CROWD_TOP = 0.055
const SWING_MS = 340

/* Speed is a multiplier on the flight time — under 1 is quicker than standard. */
const PITCH_TYPES = [
  { name: 'Rise',     speed: 0.82, move: 1.0 },
  { name: 'Drop',     speed: 0.86, move: 1.1 },
  { name: 'Fastball', speed: 0.78, move: 0.5 },
  { name: 'Curve',    speed: 1.18, move: 1.5 },
  { name: 'Changeup', speed: 1.32, move: 0.7 },
]
const CONTACT_AT = 0.458       // where in the swing the barrel meets the ball

type Flight = { kind: string; colour: string; t: number; dur: number
  x0: number; y0: number; x1: number; y1: number; apex: number
  hop?: { x: number; y: number }; landed: boolean }

export default function LegendsClient({ batters, pitchers }: { batters: Legend[]; pitchers: Legend[] }) {
  const [batter, setBatter] = useState<Legend>(batters[0])
  const [pitcher, setPitcher] = useState<Legend>(pitchers[0])
  const [phase, setPhase] = useState<'setup' | 'live' | 'done'>('setup')
  const [paused, setPaused] = useState(false)
  const [count, setCount] = useState<number | null>(null)

  const [pitchNo, setPitchNo] = useState(0)
  const [outs, setOuts] = useState(0)
  const [score, setScore] = useState(0)
  const [log, setLog] = useState<{ key: ResultKey; dist: number; off: number }[]>([])
  const [flash, setFlash] = useState<{ key: ResultKey; dist: number; off: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)

  // Clock that stops when paused, so nothing advances behind the overlay
  const pauseOffset = useRef(0)
  const pausedAt = useRef(0)
  const clock = (now: number) => now - pauseOffset.current

  const t = useRef(0)
  const dur = useRef(1400)
  const breakX = useRef(0)
  const started = useRef(0)
  const windUp = useRef(0)
  const pitchKind = useRef(PITCH_TYPES[0])
  const swung = useRef(false)
  const settled = useRef(false)
  const swingAt = useRef(0)
  const contact = useRef(false)
  const ball = useRef<Flight | null>(null)
  const pop = useRef<{ x: number; y: number; life: number; size: number } | null>(null)
  const wallHit = useRef<{ x: number; y: number; life: number } | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const after = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => clearTimers, [])

  // Crowd, generated once so it doesn't shimmer between frames
  const crowd = useRef<{ x: number; y: number; r: number; c: string }[]>([])
  if (crowd.current.length === 0) {
    const shirts = ['#2B3A55', '#4A2F3D', '#2F4A38', '#463A22', '#3A2F4A', '#514238', '#28303F']
    for (let row = 0; row < 7; row++) {
      const y = CROWD_TOP + row * 0.0345
      for (let i = 0; i < 46; i++) {
        crowd.current.push({
          x: (i / 46) + (row % 2 ? 0.011 : 0) + (Math.random() - 0.5) * 0.008,
          y: y + (Math.random() - 0.5) * 0.006,
          r: 0.0088 + Math.random() * 0.0035,
          c: shirts[Math.floor(Math.random() * shirts.length)],
        })
      }
    }
  }

  const maxBat = Math.max(...batters.map(b => b.titles), 1)
  const maxPit = Math.max(...pitchers.map(p => p.titles), 1)
  const heat = pitcher.titles / maxPit
  const eye = batter.titles / maxBat
  const windowSize = 0.058 + eye * 0.055

  const beginPitch = useCallback(() => {
    // Risers and drops come hard, changeups and curves float in
    const kind = PITCH_TYPES[Math.floor(Math.random() * PITCH_TYPES.length)]
    pitchKind.current = kind
    dur.current = (1520 - heat * 600) * kind.speed + (Math.random() * 200 - 100)
    breakX.current = (Math.random() * 2 - 1) * (0.14 + heat * 0.3) * kind.move
    t.current = -0.55
    swung.current = false
    settled.current = false
    contact.current = false
    swingAt.current = 0
    ball.current = null
    pop.current = null
    started.current = clock(performance.now())
  }, [heat])

  const finish = useCallback((key: ResultKey, dist: number, off: number) => {
    if (settled.current) return
    settled.current = true
    setFlash({ key, dist, off })
    setScore(s => s + RESULTS[key].points)
    setLog(l => [...l, { key, dist, off }])
    // Outs are counted for the record but never cut the cage short — you get
    // all ten swings whatever happens
    const isOut = key === 'strike' || key === 'out'
    const nextPitch = pitchNo + 1
    if (isOut) setOuts(o => o + 1)
    setPitchNo(nextPitch)
    after(2100, () => {
      setFlash(null)
      if (nextPitch >= PITCHES) setPhase('done')
      else beginPitch()
    })
  }, [outs, pitchNo, beginPitch])

  /* Flight paths, aimed rather than simulated — a home run has to clear the
     wall and land in the crowd, a triple has to die against it. */
  function launch(kind: string, pull: number, colour: string) {
    contact.current = true
    const spread = pull * 0.34
    const base = { kind, colour, t: 0, landed: false, x0: ZONE.x, y0: ZONE.y }
    if (kind === 'over') {
      ball.current = { ...base, x1: 0.5 + spread * 1.5, y1: CROWD_TOP + 0.09, apex: 0.30, dur: 1500 }
    } else if (kind === 'wall') {
      ball.current = { ...base, x1: 0.5 + spread * 1.7, y1: FENCE_Y + 0.045, apex: 0.10, dur: 950 }
    } else if (kind === 'bounce') {
      ball.current = { ...base, x1: 0.5 + spread * 1.5, y1: FENCE_Y - 0.02, apex: 0.16, dur: 1250,
        hop: { x: 0.5 + spread * 0.9, y: 0.545 } }
    } else if (kind === 'through') {
      // Flat through the infield, dying just short of the wall
      ball.current = { ...base, x1: 0.5 + spread * 0.9, y1: FENCE_Y + 0.115, apex: 0.05, dur: 900 }
    } else if (kind === 'back') {
      ball.current = { ...base, x1: 0.5 + (pull > 0 ? 0.7 : -0.7), y1: 1.15, apex: 0.42, dur: 1000 }
    } else {
      // Grounder — dribbles forward between the lines and stops in the dirt
      ball.current = { ...base, x1: 0.5 + spread * 0.4, y1: 0.76, apex: 0.012, dur: 800 }
    }
  }

  const swing = useCallback(() => {
    if (phase !== 'live' || paused || swung.current || settled.current) return
    swung.current = true
    swingAt.current = clock(performance.now())
    const off = t.current - 1
    const abs = Math.abs(off)
    // A swing is always a swing — miss it early or miss it late, the bat still goes
    if (t.current < 0.5 || t.current > 1.14) {
      after(SWING_MS * 0.7, () => finish('strike', 0, off))
      return
    }
    const pull = Math.max(-1, Math.min(1, -off * 5))

    let key: ResultKey
    let dist = 0
    if (abs <= windowSize * 0.4) { key = 'homer'; dist = 92 + Math.round(Math.random() * 42) + batter.titles * 4 }
    else if (abs <= windowSize * 0.8) { key = 'triple'; dist = 62 + Math.round(Math.random() * 20) }
    else if (abs <= windowSize * 1.3) { key = 'double'; dist = 44 + Math.round(Math.random() * 16) }
    else if (abs <= windowSize * 2)   { key = 'single'; dist = 26 + Math.round(Math.random() * 14) }
    else if (abs <= windowSize * 3)   { key = 'foul'; dist = 0 }
    else { key = 'out'; dist = 12 + Math.round(Math.random() * 10) }

    after(SWING_MS * CONTACT_AT, () => {
      launch(RESULTS[key].flight, pull, RESULTS[key].colour)
      finish(key, dist, off)
    })
  }, [phase, paused, windowSize, batter.titles, finish])

  /* ── The swing ──
     The bat rotates about the spine through 240 degrees: loaded behind the
     head, round through the zone, and wrapped across the front shoulder. Seen
     from behind the plate that circle is foreshortened, so the barrel traces a
     flat ellipse — level through contact, never chopping down. */
  function drawBatter(ctx: CanvasRenderingContext2D, W: number, H: number, now: number) {
    // A right-hander stands to the catcher's right, which is screen left from here
    const side = batter.lefty ? 1 : -1
    const px = W * (ZONE.x - 0.155 * side)     // spine
    const py = H * 0.845                        // waist, the fulcrum
    const R = W * 0.125                         // barrel radius
    const SQUASH = 0.38                         // how flat the circle looks

    let s = 0
    if (swung.current && swingAt.current) s = Math.min(1, (now - swingAt.current) / SWING_MS)
    const p = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2

    // Compass angle in the horizontal plane: 0 points at the pitcher, 90 at
    // the plate. Runs 200 down to -40 — behind, through, and round.
    const phi = ((200 - 240 * p) * Math.PI) / 180
    // The bat is up at the load, level at contact, up again on the follow
    // High at the load, level through contact, high again on the follow-through
    const lift = p < 0.5
      ? H * 0.20 * Math.cos(p * Math.PI)
      : H * 0.075 * -Math.cos(p * Math.PI)

    const tipX = px + Math.sin(phi) * R * side
    const tipY = py - Math.cos(phi) * R * SQUASH - lift
    const handR = R * 0.34
    const handX = px + Math.sin(phi) * handR * side
    const handY = py - Math.cos(phi) * handR * SQUASH - lift * 0.55

    const ink = '#0A0C10'
    const kit = '#B47CFF'
    const turn = -0.95 + p * 2.1

    // Shadow on the dirt
    ctx.save()
    ctx.fillStyle = '#00000050'
    ctx.beginPath(); ctx.ellipse(px, H * 0.955, W * 0.055, H * 0.014, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    /* Built as a player rather than a stick: white pants, a jersey that tapers
       from the shoulders to the waist, a belt where the two meet, and legs that
       bend at the knee. Everything above the belt turns; everything below drives. */
    const PANTS = '#D7D3C9'
    const SHADE = '#00000030'
    ctx.save()
    ctx.translate(px, py)
    ctx.scale(side, 1)

    // ── Legs ──
    const kneeY = H * 0.055, footY = H * 0.108
    const backKnee = -15 - p * 3, backFoot = -21 - p * 5
    const frontKnee = 15 + p * 6, frontFoot = 22 + p * 11
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    // back leg, pivoting up onto the toe
    ctx.strokeStyle = PANTS; ctx.lineWidth = 15
    ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(backKnee, kneeY); ctx.lineTo(backFoot, footY - 6); ctx.stroke()
    // front leg, braced and straightening
    ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(frontKnee, kneeY); ctx.lineTo(frontFoot, footY - 6); ctx.stroke()
    // seam down the outside
    ctx.strokeStyle = SHADE; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(backKnee, kneeY); ctx.lineTo(backFoot, footY - 6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(frontKnee, kneeY); ctx.lineTo(frontFoot, footY - 6); ctx.stroke()
    // cleats
    ctx.fillStyle = ink
    ctx.beginPath(); ctx.ellipse(backFoot - 3, footY - 3, 11, 5.5, -0.35, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(frontFoot + 3, footY - 3, 12, 5.5, 0.1, 0, Math.PI * 2); ctx.fill()

    /* ── Above the belt ──
       Rotation about the spine doesn't tilt a hitter, it foreshortens him:
       shoulders closed at the load, square at contact, open on the follow. So
       the span breathes rather than the whole trunk leaning over. */
    ctx.save()
    ctx.rotate(turn * 0.09)              // just a trace of lean into the ball

    const openness = Math.max(0, Math.min(1, (turn + 0.95) / 2.1))
    const shoulderY = -H * 0.088
    const shoulderW = 15.5 * (0.68 + 0.32 * Math.sin(openness * Math.PI))
    const waistW = 9.5

    // jersey, tapered from the shoulders down to the belt
    ctx.fillStyle = kit
    ctx.beginPath()
    ctx.moveTo(-waistW, 0)
    ctx.lineTo(-shoulderW, shoulderY + 6)
    ctx.quadraticCurveTo(0, shoulderY - 4, shoulderW, shoulderY + 6)
    ctx.lineTo(waistW, 0)
    ctx.closePath(); ctx.fill()
    // shading down the back half so it reads round
    ctx.fillStyle = '#00000022'
    ctx.beginPath()
    ctx.moveTo(-waistW, 0); ctx.lineTo(-shoulderW, shoulderY + 6)
    ctx.lineTo(-shoulderW * 0.3, shoulderY + 2); ctx.lineTo(-waistW * 0.3, 0)
    ctx.closePath(); ctx.fill()

    // belt
    ctx.fillStyle = ink
    ctx.fillRect(-waistW - 1, -3, (waistW + 1) * 2, 6)
    ctx.fillStyle = '#C9A85E'
    ctx.fillRect(-3, -3, 6, 6)

    // sleeves capping the shoulders
    ctx.fillStyle = kit
    ctx.beginPath(); ctx.ellipse(-shoulderW + 1, shoulderY + 8, 6.5, 8, -0.25, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(shoulderW - 1, shoulderY + 8, 6.5, 8, 0.25, 0, Math.PI * 2); ctx.fill()

    // neck
    ctx.fillStyle = '#8C6A46'
    ctx.fillRect(-4, shoulderY - 4, 8, 8)

    // head stays level and back — the counter-rotation is what a hitter does
    ctx.save()
    ctx.rotate(-turn * 0.09)
    ctx.fillStyle = '#8C6A46'
    ctx.beginPath(); ctx.arc(0, shoulderY - 13, 11, 0, Math.PI * 2); ctx.fill()
    // helmet shell and brim, brim pointing out at the pitcher
    ctx.fillStyle = kit
    ctx.beginPath(); ctx.arc(0, shoulderY - 14, 12, Math.PI * 1.02, Math.PI * 2.02); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(2, shoulderY - 16); ctx.lineTo(19, shoulderY - 14)
    ctx.lineTo(19, shoulderY - 10); ctx.lineTo(2, shoulderY - 11)
    ctx.closePath(); ctx.fill()
    // ear flap on the near side
    ctx.beginPath(); ctx.ellipse(-6, shoulderY - 11, 5, 6.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    ctx.restore()   // trunk
    ctx.restore()   // figure

    // Barrel trail through the zone
    if (s > 0.08 && s < 0.94) {
      ctx.save()
      for (let g = 1; g <= 6; g++) {
        const gp = Math.max(0, p - g * 0.045)
        const gphi = ((200 - 240 * gp) * Math.PI) / 180
        const glift = gp < 0.5 ? H * 0.085 * Math.cos(gp * Math.PI) : H * 0.068 * -Math.cos(gp * Math.PI)
        ctx.fillStyle = `rgba(217,179,106,${0.16 - g * 0.022})`
        ctx.beginPath()
        ctx.arc(px + Math.sin(gphi) * R * side, py - Math.cos(gphi) * R * SQUASH - glift, 9, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // Arms out to the hands
    ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = 'round'
    /* Both arms run from the shoulders to the hands, drawn over the jersey so
       the bat never looks like it's growing out of his chest. The span matches
       the shoulders as they turn. */
    const shY = py - H * 0.088 + 8
    const shSpan = 15.5 * (0.68 + 0.32 * Math.sin(Math.max(0, Math.min(1, (turn + 0.95) / 2.1)) * Math.PI))
    // back arm first, a shade darker so the two read as separate limbs
    ctx.strokeStyle = '#6B5036'; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(px - shSpan * side, shY); ctx.lineTo(handX, handY); ctx.stroke()
    ctx.strokeStyle = '#8C6A46'; ctx.lineWidth = 8
    ctx.beginPath(); ctx.moveTo(px + shSpan * side, shY); ctx.lineTo(handX, handY); ctx.stroke()
    // hands together on the handle
    ctx.fillStyle = '#2A2A32'
    ctx.beginPath(); ctx.arc(handX, handY, 6, 0, Math.PI * 2); ctx.fill()

    // The bat itself — handle to barrel along the same line
    const grain = ctx.createLinearGradient(handX, handY, tipX, tipY)
    grain.addColorStop(0, '#6E4F2C'); grain.addColorStop(0.7, '#B58A4F'); grain.addColorStop(1, '#E4C480')
    ctx.strokeStyle = grain; ctx.lineWidth = 6
    ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(tipX, tipY); ctx.stroke()
    ctx.lineWidth = 11
    ctx.beginPath()
    ctx.moveTo(handX + (tipX - handX) * 0.74, handY + (tipY - handY) * 0.74)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()

    // Contact spark
    if (contact.current && s > CONTACT_AT - 0.12 && s < CONTACT_AT + 0.2) {
      const cx = W * ZONE.x, cy = H * ZONE.y
      const k = (s - (CONTACT_AT - 0.12)) / 0.32
      ctx.save()
      ctx.strokeStyle = `rgba(255,215,0,${1 - k})`; ctx.lineWidth = 3
      const r = 14 + k * 64
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + k * 2
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35)
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  function drawPitcher(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const px = W * 0.5, py = H * (MOUND_Y - 0.055), armR = H * 0.06
    const w = Math.max(0, Math.min(1, windUp.current))
    const angle = -Math.PI / 2 + w * Math.PI * 2
    const s = pitcher.lefty ? -1 : 1
    ctx.save()
    ctx.fillStyle = '#00000045'
    ctx.beginPath(); ctx.ellipse(px, py + H * 0.055, W * 0.035, H * 0.01, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 9 * s, py + H * 0.05); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (10 + w * 13) * s, py + H * 0.05); ctx.stroke()
    ctx.strokeStyle = '#5C3E8E'; ctx.lineWidth = 10
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - H * 0.042); ctx.stroke()
    ctx.fillStyle = '#0A0C10'
    ctx.beginPath(); ctx.arc(px, py - H * 0.055, 7, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#0A0C10'; ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(px, py - H * 0.038)
    ctx.lineTo(px + Math.cos(angle) * armR * s, py - H * 0.038 + Math.sin(angle) * armR)
    ctx.stroke()
    ctx.restore()
  }

  const draw = useCallback((raw: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height
    const now = clock(raw)

    // ── Night sky and floodlight haze ──
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#080A14'); sky.addColorStop(0.28, '#0E1626')
    sky.addColorStop(0.44, '#12301C'); sky.addColorStop(1, '#0A1A10')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    const pool = ctx.createRadialGradient(W * 0.5, 0, 10, W * 0.5, 0, W * 0.8)
    pool.addColorStop(0, '#B47CFF22'); pool.addColorStop(1, 'transparent')
    ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H)

    // ── The crowd, banked above the wall ──
    ctx.save()
    ctx.fillStyle = '#0A0E18'
    ctx.fillRect(0, 0, W + 2, H * (FENCE_Y - 0.005))
    for (const c of crowd.current) {
      ctx.fillStyle = c.c
      ctx.beginPath(); ctx.arc(c.x * W, c.y * H, c.r * W, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#00000055'
      ctx.beginPath(); ctx.arc(c.x * W, (c.y - 0.011) * H, c.r * W * 0.58, 0, Math.PI * 2); ctx.fill()
    }
    // Haze over the stand so it sits back
    const dim = ctx.createLinearGradient(0, 0, 0, H * FENCE_Y)
    dim.addColorStop(0, '#050810CC'); dim.addColorStop(1, '#0508101A')
    ctx.fillStyle = dim; ctx.fillRect(0, 0, W, H * FENCE_Y)
    ctx.restore()

    // ── The wall, with the name running along it ──
    const fh = H * 0.062        // a real fence is low against that distance
    const fy = H * FENCE_Y
    ctx.fillStyle = '#0C1420'; ctx.fillRect(0, fy, W, fh)
    ctx.fillStyle = '#B47CFF50'; ctx.fillRect(0, fy, W, 2)
    ctx.fillStyle = '#ffffff10'; ctx.fillRect(0, fy + fh - 2, W, 2)
    ctx.save()
    ctx.beginPath(); ctx.rect(0, fy, W, fh); ctx.clip()
    ctx.font = `900 ${Math.round(fh * 0.42)}px var(--font-heading), sans-serif`
    ctx.textBaseline = 'middle'
    const word = 'GRASSROOTS FANTASY   ·   '
    const wordW = ctx.measureText(word).width
    const scroll = (now / 26) % wordW
    ctx.fillStyle = '#B47CFF30'
    for (let x = -wordW - scroll; x < W + wordW; x += wordW) {
      ctx.fillText(word, x, fy + fh * 0.5)
    }
    ctx.restore()

    /* ── The diamond, seen from behind the plate ──
       Home is bottom centre, second sits straight out under the circle, and
       first and third fall away to the sides. The dirt is a skinned infield —
       an arc behind the bases with grass inside the base paths. */
    const homeX = W * 0.5, homeY = H * 0.90
    const secX = W * 0.5,  secY = H * (MOUND_Y - 0.075)
    const firstX = W * 0.80, firstY = H * (MOUND_Y + 0.055)
    const thirdX = W * 0.20, thirdY = firstY

    // Skinned dirt, arcing behind the bases
    ctx.fillStyle = '#8A5A34'
    ctx.beginPath()
    ctx.moveTo(W * 0.055, H * 0.96)
    ctx.quadraticCurveTo(W * 0.04, secY - H * 0.03, W * 0.5, secY - H * 0.052)
    ctx.quadraticCurveTo(W * 0.96, secY - H * 0.03, W * 0.945, H * 0.96)
    ctx.closePath(); ctx.fill()

    // Infield grass inside the base paths
    ctx.fillStyle = '#1B5E2A'
    ctx.beginPath()
    ctx.moveTo(homeX, homeY - H * 0.012)
    ctx.lineTo(firstX - W * 0.035, firstY)
    ctx.lineTo(secX, secY + H * 0.016)
    ctx.lineTo(thirdX + W * 0.035, thirdY)
    ctx.closePath(); ctx.fill()

    // Base paths
    ctx.strokeStyle = '#A9713F'; ctx.lineWidth = Math.max(5, W * 0.014)
    ctx.beginPath()
    ctx.moveTo(homeX, homeY); ctx.lineTo(firstX, firstY)
    ctx.lineTo(secX, secY); ctx.lineTo(thirdX, thirdY)
    ctx.closePath(); ctx.stroke()

    /* Foul lines run from home straight through first and third and keep going —
       off the sides of the frame, which is where they'd really go. */
    ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = 2
    const EXT = 5
    ctx.beginPath()
    ctx.moveTo(homeX, homeY)
    ctx.lineTo(homeX + (firstX - homeX) * EXT, homeY + (firstY - homeY) * EXT)
    ctx.moveTo(homeX, homeY)
    ctx.lineTo(homeX + (thirdX - homeX) * EXT, homeY + (thirdY - homeY) * EXT)
    ctx.stroke()

    // The three bases
    const drawBase = (x: number, y: number, s: number) => {
      ctx.fillStyle = '#F5F1E8'
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.rotate(Math.PI / 4)
      ctx.fillRect(-s, -s, s * 2, s * 2)
      ctx.restore()
    }
    drawBase(firstX, firstY, W * 0.016)
    drawBase(secX, secY, W * 0.015)
    drawBase(thirdX, thirdY, W * 0.016)

    // The pitcher's circle
    ctx.fillStyle = '#A9713F'
    ctx.beginPath(); ctx.ellipse(W / 2, H * MOUND_Y, W * 0.075, H * 0.021, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.ellipse(W / 2, H * MOUND_Y, W * 0.075, H * 0.021, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#F5F1E8'
    ctx.fillRect(W / 2 - W * 0.018, H * MOUND_Y - 2, W * 0.036, 3)

    // Plate, drawn to the same width as the zone above it
    const pw = W * ZONE.w
    ctx.fillStyle = '#F5F1E8'
    ctx.beginPath()
    ctx.moveTo(W / 2 - pw / 2, H * 0.905); ctx.lineTo(W / 2 + pw / 2, H * 0.905)
    ctx.lineTo(W / 2 + pw / 2, H * 0.925); ctx.lineTo(W / 2, H * 0.944)
    ctx.lineTo(W / 2 - pw / 2, H * 0.925); ctx.closePath(); ctx.fill()

    // ── The nine-cell zone ──
    const zx = W * (ZONE.x - ZONE.w / 2), zy = H * (ZONE.y - ZONE.h / 2)
    const zw = W * ZONE.w, zh = H * ZONE.h
    const near = phase === 'live' && !settled.current ? Math.min(Math.max(t.current, 0), 1) : 0
    ctx.strokeStyle = `rgba(180,124,255,${0.26 + near * 0.55})`; ctx.lineWidth = 2
    ctx.strokeRect(zx, zy, zw, zh)
    ctx.strokeStyle = `rgba(180,124,255,${0.1 + near * 0.22})`; ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 1; i < 3; i++) {
      ctx.moveTo(zx + (zw * i) / 3, zy); ctx.lineTo(zx + (zw * i) / 3, zy + zh)
      ctx.moveTo(zx, zy + (zh * i) / 3); ctx.lineTo(zx + zw, zy + (zh * i) / 3)
    }
    ctx.stroke()

    if (phase === 'live') {
      if (!paused && !swung.current && !settled.current && started.current) {
        t.current = -0.55 + ((now - started.current) / dur.current) * 1.55
        windUp.current = Math.min(1, Math.max(0, (t.current + 0.55) / 0.55))
        if (t.current >= 1.14) finish('strike', 0, t.current - 1)
      }
      drawPitcher(ctx, W, H)

      // ── The struck ball ──
      const b = ball.current
      if (b) {
        if (!paused) b.t = Math.min(1, b.t + 16 / b.dur)
        const k = b.t
        let x: number, y: number
        if (b.hop) {
          // One bounce in the outfield, then up and over the wall
          if (k < 0.55) {
            const k1 = k / 0.55
            x = b.x0 + (b.hop.x - b.x0) * k1
            y = b.y0 + (b.hop.y - b.y0) * k1 - Math.sin(k1 * Math.PI) * b.apex
          } else {
            const k2 = (k - 0.55) / 0.45
            x = b.hop.x + (b.x1 - b.hop.x) * k2
            y = b.hop.y + (b.y1 - b.hop.y) * k2 - Math.sin(k2 * Math.PI) * b.apex * 0.7
          }
        } else {
          x = b.x0 + (b.x1 - b.x0) * k
          y = b.y0 + (b.y1 - b.y0) * k - Math.sin(k * Math.PI) * b.apex
        }

        // Shrinks as it goes out, and a home run pops the crowd on landing
        const r = Math.max(2.5, 9 - (0.9 - y) * 7)
        ctx.save()
        ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 16
        ctx.fillStyle = '#E8FF3D'
        ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()

        if (k >= 1 && !b.landed) {
          b.landed = true
          if (b.kind === 'over') pop.current = { x, y, life: 700, size: 1 }
          else if (b.kind === 'bounce') pop.current = { x, y, life: 520, size: 0.55 }
          else if (b.kind === 'wall') wallHit.current = { x, y, life: 600 }
        }
      }

      // A triple thumping into the boards
      if (wallHit.current) {
        if (!paused) wallHit.current.life -= 16
        const k = 1 - wallHit.current.life / 600
        const cx = wallHit.current.x * W, cy = wallHit.current.y * H
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - k)
        ctx.strokeStyle = '#C6FF00'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(cx, cy, 6 + k * 26, 0, Math.PI * 2); ctx.stroke()
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.35
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx + Math.cos(a) * (14 + k * 34), cy + Math.sin(a) * (14 + k * 34) * 0.5)
          ctx.stroke()
        }
        ctx.restore()
        if (wallHit.current.life <= 0) wallHit.current = null
      }

      // Crowd erupting where the ball landed
      if (pop.current) {
        if (!paused) pop.current.life -= 16
        const k = 1 - pop.current.life / 700
        const cx = pop.current.x * W, cy = pop.current.y * H
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - k)
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5
        const sz = pop.current.size
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2
          const r0 = (8 + k * 30) * sz, r1 = (16 + k * 62) * sz
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
          ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
          ctx.stroke()
        }
        ctx.fillStyle = `rgba(255,215,0,${0.25 * (1 - k)})`
        ctx.beginPath(); ctx.arc(cx, cy, (30 + k * 70) * sz, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        if (pop.current.life <= 0) pop.current = null
      }

      // ── The pitch on its way in ──
      if (!contact.current && t.current > 0 && t.current < 1.16) {
        const p = t.current
        const x = W * ZONE.x + breakX.current * W * 0.12 * p * p
        // Keeps travelling past the zone to the catcher — it never hangs
        const y = H * MOUND_Y + (H * 0.9 - H * MOUND_Y) * ((p / 1.16) * (p / 1.16) * 0.55 + (p / 1.16) * 0.45)
        const r = 3.5 + p * p * 9
        ctx.save()
        ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 12 + p * 18
        ctx.fillStyle = '#E8FF3D'
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        ctx.strokeStyle = '#C41E3A'; ctx.lineWidth = Math.max(1, r * 0.24)
        ctx.beginPath(); ctx.arc(x - r * 1.1, y, r * 0.98, -0.9, 0.9); ctx.stroke()
      }
    }

    drawBatter(ctx, W, H, now)
    raf.current = requestAnimationFrame(draw)
  }, [phase, paused, finish])

  useEffect(() => {
    raf.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf.current)
  }, [draw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') { e.preventDefault(); togglePause(); return }
      if (e.code !== 'Space') return
      e.preventDefault(); swing()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function togglePause() {
    if (phase !== 'live') return
    setPaused(p => {
      if (p) { pauseOffset.current += performance.now() - pausedAt.current; return false }
      pausedAt.current = performance.now(); return true
    })
  }

  /* Three seconds to settle before the first one comes in — starting on a pitch
     already halfway to the plate is a poor way to begin. */
  function start() {
    clearTimers()
    setPitchNo(0); setOuts(0); setScore(0); setLog([]); setFlash(null); setPaused(false)
    pauseOffset.current = 0
    setPhase('live')
    setCount(3)
    after(900, () => setCount(2))
    after(1800, () => setCount(1))
    after(2700, () => { setCount(null); beginPitch() })
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
        <span className="bt-face"><span className="bt-crest">{p.titles}</span></span>
        <span className="bt-pn">{caps(p.name)}</span>
        <span className="bt-pm">{p.grade} · {p.lefty ? 'LHB' : 'RHB'}</span>
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
          flex: 0 0 auto; width: 106px; cursor: pointer; padding: 0 0 10px; text-align: center;
          background: linear-gradient(160deg, #0F1018 0%, #07080D 100%);
          border: 1px solid #ffffff14; transition: border-color 150ms ease, transform 150ms ease;
        }
        .bt-pick:hover { transform: translateY(-3px); border-color: #ffffff35; }
        .bt-pick[data-on="true"] { border-color: var(--neon); box-shadow: 0 0 22px color-mix(in srgb, var(--neon) 42%, transparent); }
        .bt-face { height: 60px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(180deg, color-mix(in srgb, var(--neon) 20%, transparent), transparent); }
        .bt-crest { font-family: var(--font-heading); font-weight: 900; font-size: 32px; color: var(--neon); text-shadow: 0 0 20px color-mix(in srgb, var(--neon) 65%, transparent); }
        .bt-pn { font-family: var(--font-heading); font-weight: 900; font-size: 11px; color: #F5F1E8; margin-top: 8px; padding: 0 5px; line-height: 1.15; display: block; }
        .bt-pm { font-size: 9px; color: #5C6878; margin-top: 3px; display: block; letter-spacing: .1em; }
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
                .bt-count {
          font-family: var(--font-heading); font-weight: 900; line-height: 1;
          font-size: clamp(80px, 26vw, 150px); color: var(--neon);
          text-shadow: 0 0 50px color-mix(in srgb, var(--neon) 70%, transparent);
          animation: bt-count 900ms cubic-bezier(.2,1.5,.4,1);
        }
        @keyframes bt-count {
          0% { transform: scale(2.4); opacity: 0; }
          22% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.35; }
        }
        .bt-paused {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(28px, 8vw, 48px); color: var(--neon); transform: skewX(-7deg);
          text-shadow: 0 0 30px color-mix(in srgb, var(--neon) 60%, transparent);
        }
        .bt-hit {
          position: absolute; inset: 0; border: none; cursor: pointer; padding: 0;
          background: transparent; touch-action: manipulation;
        }
        .bt-hit:active { background: color-mix(in srgb, var(--neon) 10%, transparent); }
        .bt-swing { font-size: 18px !important; padding: 19px 52px !important; }
        .bt-swing:active { transform: skewX(-8deg) translate(3px, 3px) scale(0.97) !important; }
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
              <Card key={b.name + b.grade} p={b} max={maxBat}
                on={batter.name === b.name} onPick={() => setBatter(b)} />
            ))}
          </div>
          <p className="bt-lbl">On the mound · most pitching titles</p>
          <div className="bt-strip">
            {pitchers.map(p => (
              <Card key={p.name + p.grade} p={p} max={maxPit}
                on={pitcher.name === p.name} onPick={() => setPitcher(p)} />
            ))}
          </div>
        </>
      )}

      <div className="bt-hud">
        <span className="bt-stat"><span>Pitch</span><b>{Math.min(pitchNo + (phase === 'live' ? 1 : 0), PITCHES)}/{PITCHES}</b></span>
        <span className="bt-stat"><span>Outs</span><b style={{ color: outs > 0 ? '#FF4D4D' : undefined }}>{outs}</b></span>
        <span className="bt-stat"><span>Contact</span><b>{contactRate}%</b></span>
        <span className="bt-stat"><span>Score</span><b style={{ color: 'var(--neon)' }}>{score}</b></span>
      </div>

      <div className="bt-stage">
        <canvas ref={canvasRef} className="bt-canvas" width={620} height={520} onClick={swing} />

        {/* The whole field is the swing target — no panel, no waiting for the
            release, so the tap lands the moment your finger touches. */}
        {phase === 'live' && !paused && (
          <button className="bt-hit" onPointerDown={e => { e.preventDefault(); swing() }} aria-label="Swing" />
        )}

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

        {count !== null && (
          <div className="bt-overlay" style={{ background: '#05060Ab8' }}>
            <p key={count} className="bt-count">{count}</p>
          </div>
        )}

        {phase === 'live' && paused && (
          <div className="bt-overlay">
            <p className="bt-paused">Paused</p>
            <button className="ar-btn" onClick={togglePause} style={{ marginTop: '14px' }}><span>Resume</span></button>
          </div>
        )}

        {phase !== 'live' && (
          <div className="bt-overlay">
            {phase === 'done' ? (
              <>
                <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--neon)' }}>
                  Ten swings
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

      {phase === 'live' && !paused && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          <button className="ar-btn bt-swing" onPointerDown={e => { e.preventDefault(); swing() }}>
            <span>Swing</span>
          </button>
          <button className="ar-btn" onClick={togglePause}
            style={{ background: 'transparent', color: 'var(--neon)', border: '1px solid var(--neon)', boxShadow: 'none' }}>
            <span>Pause</span>
          </button>
        </div>
      )}

      <p className="bt-key">Tap the field or hit space to swing · P to pause</p>

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