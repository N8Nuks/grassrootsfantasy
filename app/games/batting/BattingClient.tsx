'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { splitName } from '@/lib/names'

export type Legend = { name: string; titles: number; grade: string; lefty: boolean }

const PITCHES = 10

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

// Bottom edge just below the middle of his pants, top around the letters
const ZONE = { x: 0.5, y: 0.813, w: 0.105, h: 0.125 }

/* Field depths, as fractions of the canvas. A softball diamond is tight in the
   middle and deep to the fence, so the pitcher stands close and the outfield
   runs away. */
const FENCE_Y = 0.245          // deeper, so there's real outfield to hit into
const MOUND_Y = 0.63
const CROWD_TOP = 0.055

const SWING_MS = 340
const CONTACT_AT = 0.46        // where in the swing the barrel meets the ball
const WAIST_Y = 0.817          // the batter's belt, and his fulcrum
const STANCE_OFF = 0.155       // how far he stands off the plate

/* Speed is a multiplier on the flight time — under 1 is quicker than standard. */
/* Speed is a multiplier on the flight time. `spin` is the seam rotation you can
   read off the ball: forward for a drop, backward for a rise, sideways for a
   curve, and barely anything on a changeup. */
const PITCH_TYPES = [
  { name: 'Rise',     speed: 0.82, move: 1.0, spin: -1.0, tilt: 0 },
  { name: 'Drop',     speed: 0.86, move: 1.1, spin:  1.0, tilt: 0 },
  { name: 'Fastball', speed: 0.78, move: 0.5, spin: -0.6, tilt: 0 },
  { name: 'Curve',    speed: 1.18, move: 1.5, spin:  0.8, tilt: 1 },
  { name: 'Changeup', speed: 1.32, move: 0.7, spin:  0.12, tilt: 0 },
]

type Flight = { kind: string; colour: string; t: number; dur: number
  x0: number; y0: number; x1: number; y1: number; apex: number
  hop?: { x: number; y: number }; landed: boolean }

/* ── The swing, as three keyframes ──
   Hands travel from over the rear shoulder, out through the ball, then across
   and back to finish flat. The bat is a fixed length throughout — only its
   angle changes — so it never appears to grow or shrink.
   Angles are measured in local space where +x points at the plate. */
const LOAD    = { hx: -15, hy: -46, deg: -130 }
const CONTACT = { hx:  23, hy: -28, deg:   11 }
/* Same finishing direction as +180, but reached by rotating up and over the
   shoulder rather than down past his feet — which is what made the swing read
   backwards. */
const FINISH  = { hx: -14, hy: -39, deg: -180 }

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const easeOut = (k: number) => 1 - Math.pow(1 - k, 2.4)
const easeIn = (k: number) => k * k

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
  // Even the gentlest of these was a Premier champion — the floor keeps them honest
  const heat = 0.45 + 0.55 * (pitcher.titles / maxPit)
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
    // Outs are counted for the record but never cut the cage short
    const isOut = key === 'strike' || key === 'out'
    const nextPitch = pitchNo + 1
    if (isOut) setOuts(o => o + 1)
    setPitchNo(nextPitch)
    after(2100, () => {
      setFlash(null)
      if (nextPitch >= PITCHES) setPhase('done')
      else beginPitch()
    })
  }, [pitchNo, beginPitch])

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
      // Lands in the outfield grass, then one big hop over the wall
      ball.current = { ...base, x1: 0.5 + spread * 1.5, y1: FENCE_Y - 0.03, apex: 0.20, dur: 1350,
        hop: { x: 0.5 + spread * 1.2, y: FENCE_Y + 0.095 } }
    } else if (kind === 'through') {
      ball.current = { ...base, x1: 0.5 + spread * 0.9, y1: FENCE_Y + 0.115, apex: 0.05, dur: 900 }
    } else if (kind === 'back') {
      ball.current = { ...base, x1: 0.5 + (pull > 0 ? 0.7 : -0.7), y1: 1.15, apex: 0.42, dur: 1000 }
    } else {
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

  /* Where the hands are and which way the bat points at any point in the swing.
     Before contact the hands come forward and the barrel whips round; after it
     they carry across and settle flat. */
  function poseAt(p: number) {
    if (p <= CONTACT_AT) {
      const k = easeIn(p / CONTACT_AT)
      return {
        hx: lerp(LOAD.hx, CONTACT.hx, k),
        hy: lerp(LOAD.hy, CONTACT.hy, k),
        deg: lerp(LOAD.deg, CONTACT.deg, k),
      }
    }
    const k = easeOut((p - CONTACT_AT) / (1 - CONTACT_AT))
    return {
      hx: lerp(CONTACT.hx, FINISH.hx, k),
      hy: lerp(CONTACT.hy, FINISH.hy, k),
      deg: lerp(CONTACT.deg, FINISH.deg, k),
    }
  }

  /* ── The batter ──
     His feet run along the plate line, so from this camera one is nearer than
     the other rather than beside it. The back leg is large and low; the front
     leg sits higher, smaller and partly behind him, and strides across toward
     the plate. Everything above the belt turns about the spine. */
  function drawBatter(ctx: CanvasRenderingContext2D, W: number, H: number, now: number) {
    // Handedness is called from the pitcher's view, so a right-hander stands on
    // the third base side — screen left from behind the plate.
    const side = batter.lefty ? -1 : 1
    const px = W * (ZONE.x - STANCE_OFF * side)
    const py = H * WAIST_Y
    const BAT_LEN = W * 0.125            // fixed — only the angle ever changes

    let s = 0
    if (swung.current && swingAt.current) s = Math.min(1, (now - swingAt.current) / SWING_MS)
    const p = s
    const pose = poseAt(p)
    const rad = (pose.deg * Math.PI) / 180

    // Hands and barrel in world space
    const handX = px + pose.hx * side
    const handY = py + pose.hy
    const tipX = handX + Math.cos(rad) * BAT_LEN * side
    const tipY = handY + Math.sin(rad) * BAT_LEN

    const ink = '#0A0C10'
    const kit = '#B47CFF'
    const turn = -0.95 + p * 2.1
    // Both arms have crossed in front of his chest by the finish, so they go
    const armFade = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.28)

    // Shadow on the dirt, following the stride
    ctx.save()
    ctx.fillStyle = '#00000050'
    ctx.beginPath()
    ctx.ellipse(px + 8 * side * p, H * 0.94, W * 0.045, H * 0.012, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    const PANTS_NEAR = '#D7D3C9'
    const PANTS_FAR = '#A8A49B'
    const CLEAT_FAR = '#14161C'

    ctx.save()
    ctx.translate(px, py)
    ctx.scale(side, 1)          // local +x points toward the plate
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'

    /* ── Legs, stacked in depth ──
       Far leg first so the near one covers it. The far foot sits higher up the
       frame because it's further up-field, and strides out toward the plate;
       the back knee drives in while its foot stays planted behind. */
    const nearKneeY = H * 0.055, nearFootY = H * 0.100
    const farKneeY = H * 0.040, farFootY = H * 0.078

    const farKneeX = 3 + p * 15
    const farFootX = 6 + p * 27
    const nearKneeX = 2 + p * 10
    const nearFootX = -9 - p * 3

    ctx.strokeStyle = PANTS_FAR; ctx.lineWidth = 11
    ctx.beginPath()
    ctx.moveTo(-2, -2); ctx.lineTo(farKneeX, farKneeY); ctx.lineTo(farFootX, farFootY)
    ctx.stroke()
    ctx.fillStyle = CLEAT_FAR
    ctx.save(); ctx.translate(farFootX + 2, farFootY + 3); ctx.rotate(-0.1 + p * 0.2)
    ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 3.8, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    ctx.strokeStyle = PANTS_NEAR; ctx.lineWidth = 15
    ctx.beginPath()
    ctx.moveTo(3, 2); ctx.lineTo(nearKneeX, nearKneeY); ctx.lineTo(nearFootX, nearFootY)
    ctx.stroke()
    ctx.strokeStyle = '#00000026'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(3, 2); ctx.lineTo(nearKneeX, nearKneeY); ctx.lineTo(nearFootX, nearFootY)
    ctx.stroke()
    ctx.fillStyle = ink
    ctx.save(); ctx.translate(nearFootX - 2, nearFootY + 4); ctx.rotate(-p * 0.5)
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    /* ── Above the belt ──
       Rotation about the spine doesn't tilt a hitter, it foreshortens him:
       shoulders closed at the load, square at contact, open on the follow. */
    ctx.save()
    ctx.rotate(turn * 0.09)

    const openness = Math.max(0, Math.min(1, (turn + 0.95) / 2.1))
    const shoulderY = -H * 0.088
    const shoulderW = 15.5 * (0.68 + 0.32 * Math.sin(openness * Math.PI))
    const waistW = 9.5

    ctx.fillStyle = kit
    ctx.beginPath()
    ctx.moveTo(-waistW, 0)
    ctx.lineTo(-shoulderW, shoulderY + 6)
    ctx.quadraticCurveTo(0, shoulderY - 4, shoulderW, shoulderY + 6)
    ctx.lineTo(waistW, 0)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#00000022'
    ctx.beginPath()
    ctx.moveTo(-waistW, 0); ctx.lineTo(-shoulderW, shoulderY + 6)
    ctx.lineTo(-shoulderW * 0.3, shoulderY + 2); ctx.lineTo(-waistW * 0.3, 0)
    ctx.closePath(); ctx.fill()

    // belt — the height the barrel meets the ball
    ctx.fillStyle = ink
    ctx.fillRect(-waistW - 1, -3, (waistW + 1) * 2, 6)
    ctx.fillStyle = '#C9A85E'
    ctx.fillRect(-3, -3, 6, 6)

    ctx.fillStyle = kit
    ctx.beginPath(); ctx.ellipse(-shoulderW + 1, shoulderY + 8, 6.5, 8, -0.25, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(shoulderW - 1, shoulderY + 8, 6.5, 8, 0.25, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = '#8C6A46'
    ctx.fillRect(-4, shoulderY - 4, 8, 8)

    // head stays level and back — the counter-rotation is what a hitter does
    ctx.save()
    ctx.rotate(-turn * 0.09)
    ctx.fillStyle = '#8C6A46'
    ctx.beginPath(); ctx.arc(0, shoulderY - 13, 11, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = kit
    ctx.beginPath(); ctx.arc(0, shoulderY - 14, 12, Math.PI * 1.02, Math.PI * 2.02); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(2, shoulderY - 16); ctx.lineTo(19, shoulderY - 14)
    ctx.lineTo(19, shoulderY - 10); ctx.lineTo(2, shoulderY - 11)
    ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.ellipse(-6, shoulderY - 11, 5, 6.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    ctx.restore()   // trunk
    ctx.restore()   // figure

    // Barrel trail through the zone
    if (s > 0.08 && s < 0.94) {
      ctx.save()
      for (let g = 1; g <= 6; g++) {
        const gp = Math.max(0, p - g * 0.05)
        const gpose = poseAt(gp)
        const grad2 = (gpose.deg * Math.PI) / 180
        const ghx = px + gpose.hx * side
        const ghy = py + gpose.hy
        ctx.fillStyle = `rgba(170,172,182,${0.15 - g * 0.021})`
        ctx.beginPath()
        ctx.arc(ghx + Math.cos(grad2) * BAT_LEN * side, ghy + Math.sin(grad2) * BAT_LEN, 9, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    /* Arms run from the shoulders to the hands, over the jersey. They fade out
       through the follow-through — by the finish both have crossed in front of
       his chest and only the hands are left on the handle. */
    if (armFade > 0.02) {
      const shY = py - H * 0.088 + 8
      const shSpan = 15.5 * (0.68 + 0.32 * Math.sin(openness * Math.PI))
      ctx.save()
      ctx.globalAlpha = armFade
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#6B5036'; ctx.lineWidth = 7
      ctx.beginPath(); ctx.moveTo(px - shSpan * side, shY); ctx.lineTo(handX, handY); ctx.stroke()
      ctx.strokeStyle = '#8C6A46'; ctx.lineWidth = 8
      ctx.beginPath(); ctx.moveTo(px + shSpan * side, shY); ctx.lineTo(handX, handY); ctx.stroke()
      ctx.restore()
    }

    /* ── The bat ──
       Grey barrel with a yellow mark on the handle, one fixed length. */
    const grain = ctx.createLinearGradient(handX, handY, tipX, tipY)
    grain.addColorStop(0, '#5E6068'); grain.addColorStop(0.6, '#8E9099'); grain.addColorStop(1, '#BFC1CA')
    ctx.lineCap = 'round'
    ctx.strokeStyle = grain; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(tipX, tipY); ctx.stroke()
    // thicker barrel over the last quarter
    ctx.strokeStyle = '#BFC1CA'; ctx.lineWidth = 11
    ctx.beginPath()
    ctx.moveTo(handX + (tipX - handX) * 0.78, handY + (tipY - handY) * 0.78)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
    // the mark on the handle
    ctx.strokeStyle = '#E8FF3D'; ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(handX + (tipX - handX) * 0.19, handY + (tipY - handY) * 0.19)
    ctx.lineTo(handX + (tipX - handX) * 0.30, handY + (tipY - handY) * 0.30)
    ctx.stroke()

    // Both hands on the handle, always visible
    ctx.fillStyle = '#2A2A32'
    ctx.beginPath(); ctx.ellipse(handX, handY, 6, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#232329'
    ctx.beginPath()
    ctx.ellipse(handX - Math.cos(rad) * 8 * side, handY - Math.sin(rad) * 8, 5.5, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Contact spark, at the belt
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
    const dim = ctx.createLinearGradient(0, 0, 0, H * FENCE_Y)
    dim.addColorStop(0, '#050810CC'); dim.addColorStop(1, '#0508101A')
    ctx.fillStyle = dim; ctx.fillRect(0, 0, W, H * FENCE_Y)
    ctx.restore()

    // ── The wall, with the name running along it ──
    /* The wall arcs away from us, deepest through centre — so it dips lower at
       the foul poles and rides higher in the middle of the frame. */
    const fh = H * 0.055
    const fy = H * FENCE_Y
    const bow = H * 0.045                 // how far the corners drop
    const wallTop = (x: number) => fy + bow * Math.pow((x / W - 0.5) * 2, 2)

    ctx.beginPath()
    ctx.moveTo(0, wallTop(0))
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wallTop(x))
    ctx.lineTo(W, wallTop(W) + fh)
    for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, wallTop(x) + fh)
    ctx.closePath()
    ctx.fillStyle = '#0C1420'; ctx.fill()
    ctx.strokeStyle = '#B47CFF50'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, wallTop(0))
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wallTop(x))
    ctx.stroke()

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(0, wallTop(0))
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wallTop(x))
    ctx.lineTo(W, wallTop(W) + fh)
    for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, wallTop(x) + fh)
    ctx.closePath()
    ctx.clip()
    ctx.font = `900 ${Math.round(fh * 0.42)}px var(--font-heading), sans-serif`
    ctx.textBaseline = 'middle'
    const word = 'GRASSROOTS FANTASY   ·   '
    const wordW = ctx.measureText(word).width
    const scroll = (now / 26) % wordW
    ctx.fillStyle = '#B47CFF30'
    for (let x = -wordW - scroll; x < W + wordW; x += wordW) {
      ctx.fillText(word, x, wallTop(Math.max(0, Math.min(W, x + wordW / 2))) + fh * 0.5)
    }
    ctx.restore()

    /* ── The diamond, seen from behind the plate ── */
    /* The pitcher stays where she is so there's time to read the ball, but the
       bases sit further back and wider — closer to a real diamond, where the
       circle is barely a third of the way to second. */
    const homeX = W * 0.5, homeY = H * 0.90
    const secX = W * 0.5,  secY = H * 0.435
    const firstX = W * 0.885, firstY = H * 0.605
    const thirdX = W * 0.115, thirdY = firstY

    ctx.fillStyle = '#8A5A34'
    ctx.beginPath()
    ctx.moveTo(W * 0.01, H * 0.97)
    ctx.quadraticCurveTo(W * -0.01, secY - H * 0.025, W * 0.5, secY - H * 0.045)
    ctx.quadraticCurveTo(W * 1.01, secY - H * 0.025, W * 0.99, H * 0.97)
    ctx.closePath(); ctx.fill()

    ctx.fillStyle = '#1B5E2A'
    ctx.beginPath()
    ctx.moveTo(homeX, homeY - H * 0.012)
    ctx.lineTo(firstX - W * 0.035, firstY)
    ctx.lineTo(secX, secY + H * 0.016)
    ctx.lineTo(thirdX + W * 0.035, thirdY)
    ctx.closePath(); ctx.fill()

    ctx.strokeStyle = '#A9713F'; ctx.lineWidth = Math.max(5, W * 0.014)
    ctx.beginPath()
    ctx.moveTo(homeX, homeY); ctx.lineTo(firstX, firstY)
    ctx.lineTo(secX, secY); ctx.lineTo(thirdX, thirdY)
    ctx.closePath(); ctx.stroke()

    ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = 2
    const EXT = 5
    ctx.beginPath()
    ctx.moveTo(homeX, homeY)
    ctx.lineTo(homeX + (firstX - homeX) * EXT, homeY + (firstY - homeY) * EXT)
    ctx.moveTo(homeX, homeY)
    ctx.lineTo(homeX + (thirdX - homeX) * EXT, homeY + (thirdY - homeY) * EXT)
    ctx.stroke()

    const drawBase = (x: number, y: number, s: number) => {
      ctx.fillStyle = '#F5F1E8'
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.rotate(Math.PI / 4)
      ctx.fillRect(-s, -s, s * 2, s * 2)
      ctx.restore()
    }
    drawBase(firstX, firstY, W * 0.016)
    drawBase(secX, secY, W * 0.015)
    drawBase(thirdX, thirdY, W * 0.016)

    // The eight-foot circle is chalk on the dirt, with the rubber set back in it
    ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(W / 2, H * MOUND_Y, W * 0.105, H * 0.030, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#F5F1E8'
    ctx.fillRect(W / 2 - W * 0.026, H * (MOUND_Y - 0.012), W * 0.052, 3.5)

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
      // Nothing to see until the hand clears the top of the circle — before that
      // the glove has it
      if (!contact.current && t.current > -0.12 && t.current < 1.16) {
        const p = t.current
        const x = W * ZONE.x + breakX.current * W * 0.12 * p * p
        const y = H * MOUND_Y + (H * 0.9 - H * MOUND_Y) * ((p / 1.16) * (p / 1.16) * 0.55 + (p / 1.16) * 0.45)
        const r = 3.5 + p * p * 9
        const kind = pitchKind.current
        ctx.save()
        ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 12 + p * 18
        ctx.fillStyle = '#E8FF3D'
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()

        /* Seams turning the way the pitch does — forward on a drop, backward on
           a rise, over sideways on a curve, and nearly still on a changeup. */
        ctx.save()
        ctx.translate(x, y)
        if (kind.tilt) ctx.rotate(Math.PI / 2)
        const roll = p * kind.spin * 22
        ctx.strokeStyle = '#C41E3A'
        ctx.lineWidth = Math.max(1, r * 0.22)
        for (const off of [0, Math.PI]) {
          const a = roll + off
          // A seam wraps out of sight as it turns, so it fades at the edges
          const face = Math.cos(a)
          if (face <= 0.05) continue
          ctx.globalAlpha = Math.min(1, face * 1.6)
          ctx.beginPath()
          ctx.ellipse(0, 0, r * 0.92 * Math.abs(Math.sin(a)) + r * 0.1, r * 0.92, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.restore()
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

  /* Three seconds to settle before the first one comes in */
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

  function Card({ p, on, onPick, role }: {
    p: Legend; on: boolean; onPick: () => void; role: 'bat' | 'pit'
  }) {
    // A hitter bats right or left; an arm throws it
    const hand = role === 'pit' ? (p.lefty ? 'LHP' : 'RHP') : (p.lefty ? 'LHB' : 'RHB')
    return (
      /* No count and no bar — titles measure availability as much as ability,
         and the best of them missed seasons to rep duty and injury. */
      <button className="bt-pick" data-on={on} onClick={onPick}>
        <span className="bt-face"><span className="bt-mono">{p.grade}</span></span>
        <span className="bt-pn">{caps(p.name)}</span>
        <span className="bt-pm">{hand}</span>
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
        .bt-mono { font-family: var(--font-heading); font-weight: 900; font-size: 26px; color: var(--neon); text-shadow: 0 0 18px color-mix(in srgb, var(--neon) 55%, transparent); }
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
        A selection of Batting Champions and MVPs line up against 10 of the best Pitchers the NFS has
        seen. Titles won stand in for the stats — the more a hitter won, the wider your window; the
        more an arm won, the less time you get.
      </p>

      {phase === 'setup' && (
        <>
          <p className="bt-lbl">In the box · Batting Titles &amp; MVPs</p>
          <div className="bt-strip">
            {batters.map(b => (
              <Card key={b.name + b.grade} p={b} role="bat"
                on={batter.name === b.name} onPick={() => setBatter(b)} />
            ))}
          </div>
          <p className="bt-lbl">On the mound · most pitching titles</p>
          <div className="bt-strip">
            {pitchers.map(p => (
              <Card key={p.name + p.grade} p={p} role="pit"
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