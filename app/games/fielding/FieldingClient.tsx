'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import ArcadeShare from '@/components/ArcadeShare'

/* Three lanes, and everything in them is coming at you. You move between the
   lanes and throw; the throw takes time to get there, so you have to start on
   something before it becomes urgent.

   Fielders stand tall and come on slowly. Runners lean into it and come fast.
   Colour is the tier and the health at once — a red takes three throws and
   turns blue then green on the way down.

   Anything that crosses the line ends the level. Twelve levels: fielders,
   then runners, then both, then it just gets harder. */

const LANES = 3
const TARGETS_PER_LEVEL = 12
/* The back half is longer as well as harder — twenty to clear from six on. */
const targetsFor = (lv: number) => (lv >= 6 ? 20 : TARGETS_PER_LEVEL)
const MAX_LEVEL = 12
const LINE_Z = 1.0                 // where they beat you
const ENDLESS_LEVEL = 10           // Endless runs at level 10 forever
const UNLOCK_KEY = 'ked-endless-unlocked'
const HIGH_KEY = 'ked-endless-best'
const THROW_MS = 620               // horizon to the line
const COOLDOWN_MS = 240
const HIT_WINDOW = 0.055

type Species = 'fielder' | 'runner'
type Target = {
  id: number
  lane: number
  z: number
  tier: number                     // 0 common, 1 elite, 2 rare
  start: number
  species: Species
  rate: number
  flash: number
}
type Throw = { id: number; lane: number; z: number }
let nextId = 1

const TIERS = [
  { name: 'Common', colour: '#5CFF6B', points: 10 },
  { name: 'Elite',  colour: '#3FA9FF', points: 25 },
  { name: 'Rare',   colour: '#FF4D4D', points: 60 },
]

/* One level of the ladder. The first three teach; the rest turn it up. */
function levelCfg(lv: number) {
  /* The old ramp topped out at twelve. It now tops out at nine, and eveything
     above that is new ground — faster, tighter, and thick with rares. */
  const t = Math.min(1, (lv - 1) / 8)
  const over = Math.max(0, lv - 9) / 3        // 0 through 1 across 10, 11, 12
  const species: 'fielder' | 'runner' | 'mixed' =
    lv === 1 ? 'fielder' : lv === 2 ? 'runner' : 'mixed'
  return {
    species,
    speed: 0.000150 + t * 0.000165 + over * 0.000120,
    gap: 1600 - t * 780 - over * 300,
    rare: lv < 3 ? 0.04 : 0.05 + t * 0.26 + over * 0.24,
    elite: lv < 3 ? 0.18 : 0.20 + t * 0.16,
  }
}

export default function FieldingClient() {
  const [phase, setPhase] = useState<'ready' | 'live' | 'lost' | 'cleared' | 'won'>('ready')
  const [level, setLevel] = useState(1)
  const [endless, setEndless] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [endlessBest, setEndlessBest] = useState(0)
  const endlessRef = useRef(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [done, setDone] = useState(0)
  const [flash, setFlash] = useState<{ text: string; colour: string } | null>(null)
  const [laneUi, setLaneUi] = useState(1)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const lane = useRef(1)
  const facing = useRef(1)
  const targets = useRef<Target[]>([])
  const throws = useRef<Throw[]>([])
  const pops = useRef<{ id: number; x: number; y: number; text: string; colour: string; life: number }[]>([])
  const lastFrame = useRef(0)
  const spawnTimer = useRef(900)
  const spawned = useRef(0)
  const cleared = useRef(0)
  const cooldown = useRef(0)
  const arm = useRef(0)
  const levelRef = useRef(1)
  /* The unlock and the endless record live on the device — it's a game unlock,
     not a record worth protecting, and it works for signed-out visitors. */
  useEffect(() => {
    try {
      if (localStorage.getItem(UNLOCK_KEY) === '1') setUnlocked(true)
      const h = parseInt(localStorage.getItem(HIGH_KEY) ?? '0', 10)
      if (h > 0) setEndlessBest(h)
    } catch { /* storage blocked */ }
  }, [])
  const reset = useCallback((lv: number) => {
    lane.current = 1; facing.current = 1
    targets.current = []; throws.current = []; pops.current = []
    spawnTimer.current = 900
    spawned.current = 0
    cleared.current = 0
    cooldown.current = 0
    arm.current = 0
    levelRef.current = lv
    setLaneUi(1); setDone(0); setFlash(null)
  }, [])

  const fire = useCallback(() => {
    if (cooldown.current > 0) return
    cooldown.current = COOLDOWN_MS
    arm.current = 180
    throws.current.push({ id: nextId++, lane: lane.current, z: 1 })
  }, [])

  const spawn = useCallback(() => {
    const cfg = levelCfg(levelRef.current)
    const species: Species = cfg.species === 'mixed'
      ? (Math.random() < 0.5 ? 'runner' : 'fielder')
      : cfg.species

    /* Runners are mostly common — a rare runner is fast and takes three, which
       is the worst thing the game can deal you, so it stays uncommon. */
    const r = Math.random()
    let tier = 0
    if (species === 'runner') {
      if (r < cfg.rare * 0.35) tier = 2
      else if (r < cfg.rare * 0.35 + cfg.elite * 0.6) tier = 1
    } else {
      if (r < cfg.rare) tier = 2
      else if (r < cfg.rare + cfg.elite) tier = 1
    }

    // Never stack two things at the same depth in one lane
    const open = [0, 1, 2].filter(l =>
      !targets.current.some(t => t.lane === l && t.z < 0.22))
    if (open.length === 0) return
    const pick = open[Math.floor(Math.random() * open.length)]

    targets.current.push({
      id: nextId++, lane: pick, z: 0, tier, start: tier, species,
      rate: species === 'runner' ? 1.55 : 1,
      flash: 0,
    })
    spawned.current += 1
  }, [])

  const step = useCallback((now: number) => {
    if (lastFrame.current === 0) lastFrame.current = now
    const dt = Math.min(now - lastFrame.current, 48)
    lastFrame.current = now
    const cfg = levelCfg(levelRef.current)

    facing.current += (lane.current - facing.current) * Math.min(1, dt / 80)
    if (cooldown.current > 0) cooldown.current -= dt
    if (arm.current > 0) arm.current -= dt

    if (spawned.current < targetsFor(levelRef.current)) {
      spawnTimer.current -= dt
      if (spawnTimer.current <= 0) {
        spawn()
        spawnTimer.current = cfg.gap + Math.random() * cfg.gap * 0.45
      }
    }

    for (const t of targets.current) {
      t.z += cfg.speed * dt * t.rate
      if (t.flash > 0) t.flash -= dt
    }
    for (const th of throws.current) th.z -= dt / THROW_MS

    // A throw takes the nearest thing in its lane
    for (const th of throws.current) {
      if (th.z > 1.02 || th.z < -0.05) continue
      let best: Target | null = null
      for (const t of targets.current) {
        if (t.lane !== th.lane || t.z > 1.2) continue
        if (Math.abs(t.z - th.z) > HIT_WINDOW) continue
        if (!best || t.z > best.z) best = t
      }
      if (!best) continue
      th.z = -99
      best.flash = 200
      if (best.tier > 0) {
        best.tier -= 1
      } else {
        const meta = TIERS[best.start]
        best.z = 99
        cleared.current += 1
        setDone(cleared.current)
        setScore(v => v + meta.points)
        pops.current.push({
          id: nextId++, x: best.lane, y: best.z, life: 800,
          text: `+${meta.points}`, colour: meta.colour,
        })
        if (best.start === 2) {
          setFlash({ text: 'RARE DOWN', colour: TIERS[2].colour })
          setTimeout(() => setFlash(null), 900)
        }
      }
    }

    throws.current = throws.current.filter(t => t.z > -0.05)

    // Anything over the line ends it
    for (const t of targets.current) {
      if (t.z >= LINE_Z && t.z < 90) {
        setPhase('lost')
        setScore(s => {
          setBest(b => Math.max(b, s))
          if (endlessRef.current) bankEndless(s)
          return s
        })
        return
      }
    }

    targets.current = targets.current.filter(t => t.z < 90)
    for (const p of pops.current) p.life -= dt
    pops.current = pops.current.filter(p => p.life > 0)

    /* Endless never ends by clearing — it just keeps dealing at level 10. */
    if (!endlessRef.current && cleared.current >= targetsFor(levelRef.current)) {
      setScore(s => { setBest(b => Math.max(b, s)); return s })
      if (levelRef.current >= MAX_LEVEL) {
        try { localStorage.setItem(UNLOCK_KEY, '1') } catch { /* blocked */ }
        setUnlocked(true)
        setPhase('won')
      } else {
        setPhase('cleared')
      }
      return
    }
    if (endlessRef.current && spawned.current >= targetsFor(levelRef.current)) {
      spawned.current = 0
    }

    draw()
    raf.current = requestAnimationFrame(step)
  }, [spawn])

  /* ── Drawing ── */

  const draw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height
    const HORIZON = H * 0.29

    const persp = (z: number) => Math.pow(Math.max(0, z), 2.0)
    const yAt = (z: number) => HORIZON + (H - HORIZON) * persp(z)
    const halfAt = (z: number) => W * (0.022 + 0.40 * persp(z))
    const xAt = (l: number, z: number) => W / 2 + (l - 1) * halfAt(z)
    const hAt = (z: number) => H * (0.030 + 0.300 * persp(z))

    // Sky, towers, fence
    ctx.fillStyle = '#0B1119'; ctx.fillRect(0, 0, W, HORIZON)
    ctx.fillStyle = '#101A2B'; ctx.fillRect(0, HORIZON - H * 0.09, W, H * 0.09)
    for (const fx of [W * 0.16, W * 0.84]) {
      ctx.fillStyle = '#26314A'; ctx.fillRect(fx - 21, H * 0.055, 42, H * 0.040)
      ctx.fillStyle = '#1B2436'; ctx.fillRect(fx - 2.5, H * 0.095, 5, HORIZON - H * 0.095)
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        ctx.fillStyle = '#F3ECCB'
        ctx.beginPath()
        ctx.arc(fx - 11 + c * 11, H * 0.068 + r * H * 0.016, 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.fillStyle = '#5CFF6B33'; ctx.fillRect(0, HORIZON - H * 0.095, W, 3)

    // Grass and mown bands
    ctx.fillStyle = '#123320'; ctx.fillRect(0, HORIZON, W, H - HORIZON)
    for (let i = 1; i < 7; i += 2) {
      const z0 = i / 7, z1 = (i + 1) / 7
      ctx.fillStyle = '#16401F'
      ctx.fillRect(0, yAt(z0), W, yAt(z1) - yAt(z0))
    }

    // Lane chalk
    ctx.strokeStyle = '#F5F1E82B'; ctx.lineWidth = 2
    for (const edge of [-1.5, -0.5, 0.5, 1.5]) {
      ctx.beginPath()
      ctx.moveTo(W / 2 + edge * halfAt(0), yAt(0))
      ctx.lineTo(W / 2 + edge * halfAt(1.05), yAt(1.05))
      ctx.stroke()
    }

    // The line they must not cross
    ctx.save()
    ctx.setLineDash([16, 11])
    ctx.strokeStyle = '#FF4D4D8C'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, yAt(LINE_Z)); ctx.lineTo(W, yAt(LINE_Z)); ctx.stroke()
    ctx.restore()

    // Targets, far ones first
    const sorted = [...targets.current].filter(t => t.z < 1.2).sort((a, b) => a.z - b.z)
    for (const t of sorted) {
      const x = xAt(t.lane, t.z)
      const g = yAt(t.z)
      const h = hAt(t.z)
      const col = t.flash > 0 ? '#FFFFFF' : TIERS[t.tier].colour
      if (t.species === 'runner') drawRunner(ctx, x, g, h, col)
      else drawFielder(ctx, x, g, h, col)
    }

    // Throws in flight
    for (const th of throws.current) {
      if (th.z < 0 || th.z > 1.05) continue
      const x = xAt(th.lane, th.z)
      const y = yAt(th.z) - hAt(th.z) * 0.55
      const r = Math.max(2.5, 9 * (0.2 + persp(th.z)))
      ctx.save()
      ctx.shadowColor = '#E8FF3D'; ctx.shadowBlur = 16
      ctx.fillStyle = '#E8FF3D'
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    // The thrower
    const px = xAt(facing.current, 1.06)
    const py = yAt(1.06)
    drawThrower(ctx, px, py, H * 0.34, arm.current > 0)

    // Points off the play
    for (const p of pops.current) {
      const k = 1 - p.life / 800
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - k * k)
      ctx.font = `900 ${Math.round(H * 0.250)}px var(--font-heading), sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = p.colour
      ctx.shadowColor = p.colour; ctx.shadowBlur = 40
      ctx.fillText(p.text, xAt(p.x, 0.8), yAt(0.8) - k * H * 0.12)
      ctx.restore()
    }
  }, [])

  /* A fielder: square on, glove out, waiting on the throw. */
  function drawFielder(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, col: string) {
    const u = h / 100
    ctx.save()
    ctx.fillStyle = '#00000070'
    ctx.beginPath(); ctx.ellipse(x, y, 21 * u, 5.5 * u, 0, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = '#D8D2C4'
    ctx.fillRect(x - 11 * u, y - 42 * u, 8 * u, 39 * u)
    ctx.fillRect(x + 3 * u, y - 42 * u, 8 * u, 39 * u)
    ctx.fillStyle = '#12161C'
    ctx.fillRect(x - 13 * u, y - 5 * u, 13 * u, 5 * u)
    ctx.fillRect(x + 1 * u, y - 5 * u, 13 * u, 5 * u)

    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(x - 16 * u, y - 78 * u); ctx.lineTo(x + 16 * u, y - 78 * u)
    ctx.lineTo(x + 13 * u, y - 40 * u); ctx.lineTo(x - 13 * u, y - 40 * u)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#D8D2C4'; ctx.fillRect(x - 14 * u, y - 45 * u, 28 * u, 5 * u)

    ctx.fillStyle = col
    ctx.fillRect(x - 24 * u, y - 74 * u, 9 * u, 22 * u)
    ctx.fillRect(x + 15 * u, y - 74 * u, 9 * u, 22 * u)

    ctx.fillStyle = '#8A5A2E'
    ctx.beginPath(); ctx.ellipse(x - 26 * u, y - 50 * u, 9 * u, 10.5 * u, 0, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = '#E0AC7E'
    ctx.beginPath(); ctx.arc(x, y - 88 * u, 9 * u, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(x, y - 90 * u, 9 * u, Math.PI, 0); ctx.fill()
    ctx.fillRect(x + 4 * u, y - 92 * u, 11 * u, 3.5 * u)
    ctx.restore()
  }

  /* A runner: leaning into the stride, helmet on, no glove. */
  function drawRunner(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, col: string) {
    const u = h / 100
    ctx.save()
    ctx.fillStyle = '#00000070'
    ctx.beginPath(); ctx.ellipse(x, y, 22 * u, 6 * u, 0, 0, Math.PI * 2); ctx.fill()
    ctx.translate(x, y)
    ctx.rotate(-0.15)

    ctx.fillStyle = '#D8D2C4'
    ctx.beginPath()
    ctx.moveTo(-6 * u, -44 * u); ctx.lineTo(4 * u, -41 * u)
    ctx.lineTo(-13 * u, -3 * u); ctx.lineTo(-23 * u, -8 * u)
    ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(6 * u, -43 * u); ctx.lineTo(16 * u, -38 * u)
    ctx.lineTo(20 * u, -4 * u); ctx.lineTo(9 * u, -3 * u)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#12161C'
    ctx.fillRect(-27 * u, -10 * u, 15 * u, 6 * u)
    ctx.fillRect(8 * u, -5 * u, 15 * u, 6 * u)

    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(-13 * u, -84 * u); ctx.lineTo(15 * u, -87 * u)
    ctx.lineTo(18 * u, -42 * u); ctx.lineTo(-10 * u, -40 * u)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#D8D2C4'; ctx.fillRect(-12 * u, -46 * u, 30 * u, 5 * u)

    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(-14 * u, -81 * u); ctx.lineTo(-25 * u, -60 * u)
    ctx.lineTo(-16 * u, -55 * u); ctx.lineTo(-6 * u, -76 * u)
    ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(16 * u, -83 * u); ctx.lineTo(31 * u, -73 * u)
    ctx.lineTo(24 * u, -65 * u); ctx.lineTo(11 * u, -75 * u)
    ctx.closePath(); ctx.fill()

    ctx.fillStyle = '#E0AC7E'
    ctx.beginPath(); ctx.arc(1 * u, -95 * u, 10 * u, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(1 * u, -96 * u, 10.5 * u, Math.PI, 0); ctx.fill()
    ctx.fillRect(-9.5 * u, -96 * u, 21 * u, 4 * u)
    ctx.beginPath(); ctx.ellipse(9 * u, -90 * u, 4 * u, 6 * u, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  /* You, seen from behind, ball cocked. */
  function drawThrower(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, throwing: boolean) {
    const u = h / 100
    ctx.save()
    ctx.fillStyle = '#00000080'
    ctx.beginPath(); ctx.ellipse(x, y, 26 * u, 6.5 * u, 0, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = '#D8D2C4'
    ctx.fillRect(x - 13 * u, y - 44 * u, 9 * u, 41 * u)
    ctx.fillRect(x + 4 * u, y - 44 * u, 9 * u, 41 * u)
    ctx.fillStyle = '#12161C'
    ctx.fillRect(x - 15 * u, y - 5 * u, 14 * u, 5 * u)
    ctx.fillRect(x + 2 * u, y - 5 * u, 14 * u, 5 * u)

    ctx.fillStyle = '#0F1720'
    ctx.beginPath()
    ctx.moveTo(x - 17 * u, y - 80 * u); ctx.lineTo(x + 17 * u, y - 80 * u)
    ctx.lineTo(x + 14 * u, y - 42 * u); ctx.lineTo(x - 14 * u, y - 42 * u)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#5CFF6B'; ctx.fillRect(x - 17 * u, y - 80 * u, 34 * u, 8 * u)
    ctx.fillStyle = '#D8D2C4'; ctx.fillRect(x - 15 * u, y - 47 * u, 30 * u, 5 * u)

    ctx.fillStyle = '#0F1720'
    ctx.fillRect(x - 26 * u, y - 76 * u, 10 * u, 20 * u)
    ctx.beginPath(); ctx.ellipse(x - 29 * u, y - 52 * u, 11 * u, 13 * u, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#5CFF6B'; ctx.lineWidth = 2 * u; ctx.stroke()

    const ax = throwing ? 30 : 22
    const ay = throwing ? -88 : -78
    ctx.fillStyle = '#0F1720'
    ctx.save()
    ctx.translate(x + 16 * u, y - 76 * u)
    ctx.rotate(throwing ? -0.9 : -0.5)
    ctx.fillRect(0, -5 * u, 20 * u, 10 * u)
    ctx.restore()
    ctx.fillStyle = '#E8FF3D'
    ctx.beginPath(); ctx.arc(x + ax * u, y + ay * u, 6 * u, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = '#E0AC7E'
    ctx.beginPath(); ctx.arc(x, y - 90 * u, 10 * u, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#5CFF6B'
    ctx.beginPath(); ctx.arc(x, y - 92 * u, 10 * u, Math.PI, 0); ctx.fill()
    ctx.fillRect(x - 14 * u, y - 94 * u, 11 * u, 3.5 * u)
    ctx.restore()
  }

  /* ── Wiring ── */

  useEffect(() => {
    if (phase !== 'live') { draw(); return }
    lastFrame.current = 0
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [phase, step, draw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        e.preventDefault(); lane.current = Math.max(0, lane.current - 1); setLaneUi(lane.current)
      }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        e.preventDefault(); lane.current = Math.min(LANES - 1, lane.current + 1); setLaneUi(lane.current)
      }
      if (e.code === 'Space' || ['ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault(); fire()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fire])

  /* Swipe across the canvas to change lanes, tap anywhere on it to throw. A
     tap is anything that doesn't travel far enough to be a swipe. */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    let sx = 0, sy = 0, moved = false
    const start = (e: TouchEvent) => {
      sx = e.touches[0].clientX
      sy = e.touches[0].clientY
      moved = false
    }
    const move = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - sx
      const dy = e.touches[0].clientY - sy
      if (!moved && Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        moved = true
        lane.current = dx > 0
          ? Math.min(LANES - 1, lane.current + 1)
          : Math.max(0, lane.current - 1)
        setLaneUi(lane.current)
      }
    }
    const end = () => { if (!moved) fire() }
    cv.addEventListener('touchstart', start, { passive: true })
    cv.addEventListener('touchmove', move, { passive: true })
    cv.addEventListener('touchend', end, { passive: true })
    return () => {
      cv.removeEventListener('touchstart', start)
      cv.removeEventListener('touchmove', move)
      cv.removeEventListener('touchend', end)
    }
  }, [fire])
    lane.current = Math.max(0, Math.min(LANES - 1, l))
    setLaneUi(lane.current)
  }

  function beginLevel(lv: number) {
    endlessRef.current = false
    setEndless(false)
    reset(lv)
    setLevel(lv)
    setScore(0)
    setPhase('live')
  }

  /* Endless holds at level ten and never stops dealing. Its record is its own. */
  function beginEndless() {
    endlessRef.current = true
    setEndless(true)
    reset(ENDLESS_LEVEL)
    setLevel(ENDLESS_LEVEL)
    setScore(0)
    setPhase('live')
  }

  function bankEndless(final: number) {
    if (final > endlessBest) {
      setEndlessBest(final)
      try { localStorage.setItem(HIGH_KEY, String(final)) } catch { /* blocked */ }
    }
  }

  const cfg = levelCfg(level)
  const stage = cfg.species === 'fielder' ? 'Fielders only'
    : cfg.species === 'runner' ? 'Runners only' : 'Both, mixed'

  return (
    <>
      <style>{`
        .fd-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 18px; }
        .fd-hud { display: flex; align-items: stretch; gap: 1px; margin-bottom: 12px; background: #ffffff10; border: 1px solid #ffffff12; }
        .fd-stat { flex: 1; background: #07080D; padding: 10px 6px; text-align: center; }
        .fd-stat span { display: block; font-size: 8px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #4E5A6A; }
        .fd-stat b { display: block; font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-top: 3px; }
        .fd-stage { position: relative; }
        .fd-canvas {
          width: 100%; height: auto; display: block; touch-action: none;
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .fd-flash { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
        .fd-flash p {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(20px, 5.5vw, 36px); transform: skewX(-7deg);
          animation: fd-slam 320ms cubic-bezier(.2,1.7,.4,1);
        }
        @keyframes fd-slam { from { transform: skewX(-7deg) scale(1.8); opacity: 0; } }
        .fd-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060AF0; padding: 22px;
        }
        .fd-ghost { background: transparent; color: var(--neon); border: 1px solid var(--neon); box-shadow: none; }

        .fd-pad { display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap: 6px; margin-top: 12px; }
        .fd-key {
          background: #10141F; border: 1px solid #ffffff18; color: #F5F1E8; cursor: pointer;
          font-family: var(--font-heading); font-weight: 900; font-size: 12px;
          padding: 17px 4px; text-align: center; touch-action: manipulation;
        }
        .fd-key:active { background: color-mix(in srgb, var(--neon) 26%, transparent); border-color: var(--neon); }
        .fd-key[data-fire="true"] { color: var(--neon); border-color: color-mix(in srgb, var(--neon) 45%, transparent); }

        .fd-hint { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 12px; }
        .fd-legend { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 6px; margin-top: 18px; }
        .fd-item { border: 1px solid #ffffff12; background: #ffffff05; padding: 10px 6px; text-align: center; }
        .fd-pip { display: block; width: 13px; height: 13px; border-radius: 50%; margin: 0 auto 6px; }
        .fd-item b { display: block; font-size: 10px; font-weight: 900; color: #B8C4D2; }
        .fd-item i { display: block; font-style: normal; font-size: 9px; color: #5C6878; margin-top: 2px; }

        .fd-ladder { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-top: 20px; }
        .fd-rung {
          border: 1px solid #ffffff12; background: #ffffff05; padding: 8px 2px;
          text-align: center; font-family: var(--font-heading); font-weight: 900;
          font-size: 12px; color: #4E5A6A;
        }
        .fd-rung[data-on="true"] { border-color: var(--neon); color: #F5F1E8; background: color-mix(in srgb, var(--neon) 12%, transparent); }
        .fd-rung[data-done="true"] { color: #5CFF6B; }
      `}</style>

      <p className="fd-lede">
        Three lanes, and everything in them is coming for the line. Move across, throw, and remember
        the throw takes time to get there. Fielders come on steady. Runners come fast. Red takes
        three, blue takes two, green takes one — and they change colour on the way down.
      </p>

      <div className="fd-hud">
        <span className="fd-stat"><span>Level</span><b style={{ color: 'var(--neon)' }}>{level}</b></span>
        <span className="fd-stat"><span>Down</span><b>{done}/{targetsFor(level)}</b></span>
        <span className="fd-stat"><span>Score</span><b>{score}</b></span>
        <span className="fd-stat"><span>Best</span><b>{best}</b></span>
      </div>

      <div className="fd-stage">
        <canvas ref={canvasRef} className="fd-canvas" width={600} height={480} />

        {flash && (
          <div className="fd-flash">
            <p style={{ color: flash.colour, textShadow: `0 0 26px ${flash.colour}90` }}>{flash.text}</p>
          </div>
        )}

        {phase === 'ready' && (
          <div className="fd-overlay">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--neon)' }}>
              Level {level} · {stage}
            </p>
            <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '32ch', lineHeight: 1.6, marginTop: '6px' }}>
              {targetsFor(level)} of them. Not one gets past the line.
            </p>
            <button className="ar-btn" onClick={() => beginLevel(level)} style={{ marginTop: '16px' }}>
              <span>Take the field</span>
            </button>
            {level > 1 && (
              <button className="ar-btn fd-ghost" onClick={() => beginLevel(1)} style={{ marginTop: '10px' }}>
                <span>Back to level 1</span>
              </button>
            )}
            {unlocked ? (
              <button className="ar-btn fd-ghost" onClick={beginEndless} style={{ marginTop: '10px' }}>
                <span>Endless{endlessBest > 0 ? ` · best ${endlessBest}` : ''}</span>
              </button>
            ) : (
              <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.2em',
                          textTransform: 'uppercase', color: '#4E5A6A', marginTop: '14px' }}>
                Endless mode unlocks at level 12
              </p>
            )}
          </div>
        )}

        {phase === 'lost' && (
          <div className="fd-overlay">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.34em', textTransform: 'uppercase', color: '#FF4D4D' }}>
              One got through
            </p>
            <p className="ar-num" style={{ fontSize: '48px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>
              {done}/{targetsFor(level)}
            </p>
            <p style={{ fontSize: '12px', color: '#7D8B9C', maxWidth: '30ch', lineHeight: 1.6 }}>
              {endless
                ? `${score} down${endlessBest > 0 ? ` · best ${endlessBest}` : ''}. Level ten never lets up.`
                : `Level ${level} again — you pick up where you fell.`}
            </p>
            <button className="ar-btn" onClick={() => endless ? beginEndless() : beginLevel(level)} style={{ marginTop: '16px' }}>
              <span>Back out there</span>
            </button>
            {!endless && level > 1 && (
              <button className="ar-btn fd-ghost" onClick={() => beginLevel(1)} style={{ marginTop: '10px' }}>
                <span>Back to level 1</span>
              </button>
            )}
            {(endless || level >= 6) && (
              <div style={{ marginTop: '10px' }}>
                <ArcadeShare lines={[endless
                ? `Knock 'em Down — Endless, ${score}`
                : `Knock 'em Down — level ${level} of ${MAX_LEVEL}`]} />
              </div>
            )}
          </div>
        )}

        {phase === 'cleared' && (
          <div className="fd-overlay">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.34em', textTransform: 'uppercase', color: '#5CFF6B' }}>
              Side away
            </p>
            <p className="ar-num" style={{ fontSize: '48px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>
              {score}
            </p>
            <p style={{ fontSize: '12px', color: '#7D8B9C', maxWidth: '30ch', lineHeight: 1.6 }}>
              Level {level + 1} · {levelCfg(level + 1).species === 'runner' ? 'runners only, and they come quicker' : levelCfg(level + 1).species === 'mixed' ? 'both kinds now' : 'fielders'}.
            </p>
            <button className="ar-btn" onClick={() => beginLevel(level + 1)} style={{ marginTop: '16px' }}>
              <span>Level {level + 1}</span>
            </button>
            {level >= 6 && (
              <div style={{ marginTop: '10px' }}>
                <ArcadeShare lines={[`Knock 'em Down — cleared level ${level} of ${MAX_LEVEL}`]} />
              </div>
            )}
          </div>
        )}

        {phase === 'won' && (
          <div className="fd-overlay">
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase',
                        fontSize: 'clamp(24px, 7vw, 42px)', color: '#5CFF6B', transform: 'skewX(-7deg)',
                        textShadow: '0 0 36px #5CFF6B90' }}>
              Golden Arm!
            </p>
            <p style={{ fontSize: '12px', color: '#B8C4D2', maxWidth: '30ch', lineHeight: 1.7, marginTop: '10px' }}>
              Twelve levels and not one of them got past you. Well done!
            </p>
            <div style={{ marginTop: '16px' }}>
              <ArcadeShare lines={[`Knock 'em Down — all ${MAX_LEVEL} levels, nothing past me`]} />
            </div>
            <button className="ar-btn fd-ghost" onClick={() => beginLevel(1)} style={{ marginTop: '10px' }}>
              <span>Start again</span>
            </button>
          </div>
        )}
      </div>

      <div className="fd-pad">
        <button className="fd-key" onPointerDown={e => { e.preventDefault(); moveTo(lane.current - 1) }}>◀</button>
        <button className="fd-key" data-fire="true" onPointerDown={e => { e.preventDefault(); fire() }}>THROW</button>
        <button className="fd-key" onPointerDown={e => { e.preventDefault(); moveTo(lane.current + 1) }}>▶</button>
      </div>

      <p className="fd-hint">Arrows or A / D to move · space to throw · lane {laneUi + 1}</p>

      <div className="fd-legend">
        {TIERS.map((t, i) => (
          <span key={t.name} className="fd-item">
            <span className="fd-pip" style={{ background: t.colour, boxShadow: `0 0 10px ${t.colour}` }} />
            <b>{t.name}</b>
            <i>{i + 1} {i === 0 ? 'throw' : 'throws'} · {t.points}</i>
          </span>
        ))}
      </div>

      <div className="fd-ladder">
        {Array.from({ length: MAX_LEVEL }).map((_, i) => (
          <span key={i} className="fd-rung" data-on={i + 1 === level} data-done={i + 1 < level}>
            {i + 1}
          </span>
        ))}
      </div>
    </>
  )
}