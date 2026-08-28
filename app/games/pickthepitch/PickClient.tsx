'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* You are the runner on second, and the catcher's hand is in plain sight
   between his knees. Nobody tells you the code.

   The trap is that the same shape means two things. A "one" in the pitch
   position is a drop; a "one" in the location position is inside. Only where it
   sits in the sequence tells you which — and where that is, is the thing each
   level hides.

   Every at-bat you only watch ends in a strikeout and costs an out. Three outs
   and the inning is gone with it. Commit, and three straight correct calls wins
   the level — one wrong and the hitter stops looking at you. */

const SHAPES = ['one', 'two', 'three', 'four', 'five', 'thumb', 'pinky'] as const
type Shape = typeof SHAPES[number]

const SHAPE_LABEL: Record<Shape, string> = {
  one: 'One', two: 'Two', three: 'Three', four: 'Four',
  five: 'Open', thumb: 'Thumb', pinky: 'Pinky',
}

/* Two vocabularies, as they're really used. In the first, one and two are the
   main pitches AND the location signals — position is all that separates them.
   In the second, location moves onto the thumb and pinky. */
const SETS = [
  {
    pitches: { one: 'Drop', two: 'Rise', three: 'Curve', four: 'Changeup', pinky: 'Low rise / Screwball' } as Partial<Record<Shape, string>>,
    locShapes: ['one', 'two'] as Shape[],
  },
  {
    pitches: { one: 'Rise', two: 'Drop', three: 'Changeup', four: 'Low rise / Screwball', five: 'High rise' } as Partial<Record<Shape, string>>,
    locShapes: ['thumb', 'pinky'] as Shape[],
  },
]
const LOCATIONS = ['Inside', 'Outside']

const LEVELS = [
  { n: 3, ms: 2500, rule: 'straight', loc: false, pause: true,  brief: 'Three signals. One of them is the pitch.' },
  { n: 4, ms: 2500, rule: 'straight', loc: false, pause: true,  brief: 'Four signals now. One of them is the pitch.' },
  { n: 5, ms: 2200, rule: 'outs',     loc: true,  pause: false, brief: 'Five signals, and you call the location too. Something moves with the outs.' },
  { n: 5, ms: 1800, rule: 'magic',    loc: true,  pause: false, brief: 'Five signals, quicker hands. One signal is the key to the rest.' },
]
const LIVES = 3
const NEED = 3

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

/* Pitches are dealt from a bag rather than picked at random — the runner has to
   find every sign, and five rises in a row teaches nothing. Every pitch in the
   set turns up before any of them comes round again. */
function makeBag<T>(items: T[]) {
  let rest: T[] = []
  return () => {
    if (rest.length === 0) rest = [...items].sort(() => Math.random() - 0.5)
    return rest.pop() as T
  }
}

type Code = {
  setIdx: number
  pitchOf: Partial<Record<Shape, string>>
  locOf: Record<string, string>          // shape -> Inside / Outside
  fixedIndex: number
  magic: Shape | null
  pitchList: string[]
  nextPitch: () => Shape
  nextLoc: () => Shape
}

function makeCode(lv: number): Code {
  const setIdx = lv < 2 ? 0 : Math.floor(Math.random() * SETS.length)
  const S = SETS[setIdx]
  const L = LEVELS[lv]

  // Location meanings flip at random — one might be inside, or outside
  const flipped = Math.random() < 0.5
  const locOf: Record<string, string> = {}
  S.locShapes.forEach((s, i) => { locOf[s] = flipped ? LOCATIONS[1 - i] : LOCATIONS[i] })

  // The magic key is a shape that carries no pitch in this set, so it can't be
  // confused with a real signal
  const spare = SHAPES.filter(s => !S.pitches[s])
  const magic = L.rule === 'magic' ? (spare.length ? pick(spare) : 'five') : null

  return {
    setIdx,
    pitchOf: S.pitches,
    locOf,
    fixedIndex: Math.floor(Math.random() * (L.n - 1)),   // never last — location follows
    magic,
    pitchList: Object.values(S.pitches) as string[],
    nextPitch: makeBag(Object.keys(S.pitches) as Shape[]),
    nextLoc: makeBag(S.locShapes),
  }
}

function buildSequence(lv: number, code: Code, outs: number) {
  const L = LEVELS[lv]
  const S = SETS[code.setIdx]

  const pitchShape = code.nextPitch()
  const pitch = S.pitches[pitchShape]!
  const locShape = code.nextLoc()
  const location = code.locOf[locShape]

  let pi: number
  if (L.rule === 'outs') pi = Math.min(outs, L.n - 2)
  else if (L.rule === 'magic') pi = 1 + Math.floor(Math.random() * (L.n - 2))
  else pi = code.fixedIndex
  const li = pi + 1

  // Decoys are any shape at all — a stray one or two looks like a location and
  // isn't, which is exactly the confusion the real system creates
  const decoyPool = SHAPES.filter(s => s !== code.magic)
  const seq: Shape[] = Array.from({ length: L.n }, () => pick(decoyPool))
  seq[pi] = pitchShape
  seq[li] = locShape
  if (L.rule === 'magic' && code.magic && pi > 0) seq[pi - 1] = code.magic

  return { seq, pitch, location }
}

function describe(lv: number, code: Code): string {
  const L = LEVELS[lv]
  const where = L.rule === 'outs'
    ? 'The pitch sat at the number of outs — first signal with none, second with one, third with two.'
    : L.rule === 'magic'
      ? `The pitch was always the signal straight after the ${SHAPE_LABEL[code.magic!].toLowerCase()}.`
      : `The pitch was signal ${code.fixedIndex + 1} of ${L.n}, every time.`
  const pitches = (Object.entries(code.pitchOf) as [Shape, string][])
    .map(([s, p]) => `${SHAPE_LABEL[s]} = ${p}`).join(' · ')
  const locs = Object.entries(code.locOf)
    .map(([s, p]) => `${SHAPE_LABEL[s as Shape]} = ${p}`).join(' · ')
  return `${where}\nLocation followed it.\n\n${pitches}\n${locs}`
}

/* ── The hand, fingers down ── */
function Hand({ shape, size = 1 }: { shape: Shape | null; size?: number }) {
  const SKIN = '#E8C9A0'
  const EDGE = '#B08D5E'
  if (!shape) return <svg viewBox="0 0 120 160" style={{ width: '100%', height: '100%', opacity: 0.12 }} />
  const f = (x: number, len: number, w = 16) => (
    <rect key={x} x={x} y={78} width={w} height={len} rx={w / 2} fill={SKIN} stroke={EDGE} strokeWidth="2" />
  )
  const fingers: React.ReactNode[] = []
  if (shape === 'one') fingers.push(f(34, 50))
  if (shape === 'two') { fingers.push(f(26, 46), f(50, 54)) }
  if (shape === 'three') { fingers.push(f(20, 42), f(44, 54), f(68, 46)) }
  if (shape === 'four' || shape === 'five') {
    fingers.push(f(16, 40), f(36, 52), f(56, 52), f(76, 38))
  }
  if (shape === 'pinky') fingers.push(f(76, 36))
  const thumb = shape === 'thumb' || shape === 'five'

  return (
    <svg viewBox="0 0 120 160" style={{ width: '100%', height: '100%' }}>
    <g transform="translate(120,0) scale(-1,1)">
      <rect x="34" y="0" width="52" height="38" rx="16" fill={SKIN} stroke={EDGE} strokeWidth="2" />
      <rect x="12" y="30" width="96" height="54" rx="18" fill={SKIN} stroke={EDGE} strokeWidth="2.5" />
      {fingers}
      {thumb && (
        <rect x="-4" y="48" width="19" height="42" rx="9.5" fill={SKIN} stroke={EDGE} strokeWidth="2"
          transform={`rotate(${size ? 26 : 26} 6 68)`} />
      )}
    </g>
    </svg>
  )
}

type Phase = 'idle' | 'signals' | 'pick' | 'pitching' | 'result' | 'strikeout' | 'failed' | 'demoted' | 'passed'

export default function PickClient() {
  const [level, setLevel] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [code, setCode] = useState<Code>(() => makeCode(0))

  const [phase, setPhase] = useState<Phase>('idle')
  const [committed, setCommitted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [replays, setReplays] = useState(0)      // used on the current pitch
  const [streak, setStreak] = useState(0)
  const [balls, setBalls] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [outs, setOuts] = useState(0)
  const [threeTwo, setThreeTwo] = useState(false)
  const [lefty, setLefty] = useState(false)

  const [seq, setSeq] = useState<Shape[]>([])
  const [shownIdx, setShownIdx] = useState(-1)
  const [truth, setTruth] = useState<{ pitch: string; location: string } | null>(null)
  const [pickPitch, setPickPitch] = useState<string | null>(null)
  const [pickLoc, setPickLoc] = useState<string | null>(null)
  const [result, setResult] = useState<{ text: string; sub: string; colour: string } | null>(null)
  const [reveal, setReveal] = useState<string | null>(null)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const after = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => clearAll, [])

  const L = LEVELS[level]
  const needsLoc = L.loc

  const runPitch = useCallback((atOuts: number, isCommitted: boolean) => {
    const built = buildSequence(level, code, atOuts)
    setSeq(built.seq)
    setTruth({ pitch: built.pitch, location: built.location })
    setPickPitch(null); setPickLoc(null)
    setReplays(0)
    setShownIdx(-1)
    setPhase('signals')

    built.seq.forEach((_, i) => {
      after(400 + i * L.ms, () => setShownIdx(i))
      after(400 + i * L.ms + L.ms * 0.7, () => setShownIdx(-1))
    })
    after(400 + built.seq.length * L.ms, () => {
      if (isCommitted) setPhase('pick')       // no clock — take the time, it costs a life
      else after(650, () => setPhase('pitching'))
    })
  }, [level, code, L.ms])

  const advanceCount = useCallback(() => {
    if (strikes < 2) { setStrikes(strikes + 1); return false }
    if (balls < 2) { setBalls(balls + 1); return false }
    if (balls === 2 && !threeTwo && Math.random() < 0.5) { setBalls(3); setThreeTwo(true); return false }
    return true
  }, [balls, strikes, threeTwo])

  /* Once you're calling them, the hitter lays off — every pitch he knows is
     coming goes for a ball. The count runs up and holds at 3-2. */
  const nextPitch = useCallback((isCommitted: boolean) => {
    if (isCommitted) {
      setBalls(b => Math.min(3, b + 1))
      if (balls >= 2) setThreeTwo(true)
      runPitch(outs, true)
      return
    }
    const struckOut = advanceCount()
    if (!struckOut) { runPitch(outs, isCommitted); return }

    // Strikeout — hold on it, because otherwise it flies past
    const nextOuts = outs + 1
    setBalls(0); setStrikes(0); setThreeTwo(false)
    setPhase('strikeout')
    after(1900, () => {
      setLefty(Math.random() < 0.5)
      if (nextOuts >= 3) { setOuts(3); loseLife(); return }
      setOuts(nextOuts)
      runPitch(nextOuts, isCommitted)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceCount, outs, balls, runPitch])

  function loseLife() {
    clearAll()
    const left = lives - 1
    setCommitted(false); setStreak(0); setPaused(false)
    if (left <= 0) { setPhase('demoted'); return }
    setLives(left)
    setPhase('failed')
  }

  function retry() {
    clearAll()
    setCode(makeCode(level))
    setBalls(0); setStrikes(0); setOuts(0); setThreeTwo(false)
    setCommitted(false); setStreak(0); setResult(null); setReveal(null); setPaused(false)
    setPhase('idle')
  }

  function restartAll() {
    clearAll()
    setLevel(0); setLives(LIVES); setCode(makeCode(0))
    setBalls(0); setStrikes(0); setOuts(0); setThreeTwo(false)
    setCommitted(false); setStreak(0); setResult(null); setReveal(null); setPaused(false)
    setPhase('idle')
  }

  function begin() {
    setBalls(0); setStrikes(0); setOuts(0); setThreeTwo(false)
    setResult(null); setReveal(null)
    runPitch(0, false)
  }

  /* Committing stops whatever is mid-flight and re-runs that same pitch from
     the first signal, now for real. Calling a sequence you only half saw would
     be a rough way to lose a life. */
  function commit() {
    clearAll()
    setCommitted(true)
    setStreak(0)
    setPaused(false)
    setShownIdx(-1)
    setResult(null)
    runPitch(outs, true)
  }

  function lockIn() {
    if (!pickPitch || (needsLoc && !pickLoc)) return
    setPhase('pitching')
  }

  useEffect(() => {
    if (phase !== 'pitching' || !truth) return
    after(700, () => {
      if (!committed) {
        setResult({ text: `${truth.pitch}, ${truth.location}`, sub: 'Strike', colour: '#FF4D4D' })
        setPhase('result')
        after(1800, () => { setResult(null); nextPitch(false) })
        return
      }
      const right = pickPitch === truth.pitch && (!needsLoc || pickLoc === truth.location)
      if (!right) {
        setResult({ text: `${truth.pitch}, ${truth.location}`, sub: 'You called it wrong', colour: '#FF4D4D' })
        setPhase('result')
        after(2100, () => { setResult(null); loseLife() })
        return
      }
      const run = streak + 1
      setStreak(run)
      if (run >= NEED) {
        // The hitter knew what was coming, and the winning run was on second
        setResult({ text: `${truth.pitch}, ${truth.location}`, sub: 'HOME RUN', colour: '#FFD700' })
        setPhase('result')
        after(2400, () => { setResult(null); setReveal(describe(level, code)); setPhase('passed') })
        return
      }
      setResult({ text: `${truth.pitch}, ${truth.location}`, sub: `Called it — ${run} of ${NEED}`, colour: '#39FF9E' })
      setPhase('result')
      after(1800, () => { setResult(null); nextPitch(true) })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function nextLevel() {
    const lv = level + 1
    if (lv >= LEVELS.length) { setPhase('passed'); return }
    clearAll()
    setLevel(lv); setLives(LIVES); setCode(makeCode(lv))
    setBalls(0); setStrikes(0); setOuts(0); setThreeTwo(false)
    setCommitted(false); setStreak(0); setResult(null); setReveal(null); setPaused(false)
    setPhase('idle')
  }

  /* Show the same sequence again. Free on the first two levels, once a pitch
     after that — at five signals the holding of them is the game. */
  const replayCap = L.pause ? Infinity : 1
  function replay() {
    if (replays >= replayCap) return
    if (phase !== 'signals' && phase !== 'pick') return
    clearAll()
    setReplays(r => r + 1)
    setShownIdx(-1)
    setPhase('signals')
    seq.forEach((_, i) => {
      after(300 + i * L.ms, () => setShownIdx(i))
      after(300 + i * L.ms + L.ms * 0.7, () => setShownIdx(-1))
    })
    after(300 + seq.length * L.ms, () => {
      if (committed) setPhase('pick')
      else after(650, () => setPhase('pitching'))
    })
  }

  function togglePause() {
    if (!L.pause || committed) return
    if (paused) { setPaused(false); runPitch(outs, false) }
    else { clearAll(); setShownIdx(-1); setResult(null); setPaused(true) }
  }

  const bulb = (on: boolean) => ({
    width: '11px', height: '11px', borderRadius: '50%',
    background: on ? '#FF3B1F' : '#5A1A10',
    boxShadow: on ? '0 0 8px #FF3B1F' : 'none',
    border: '1px solid #00000040',
  })
  const finished = phase === 'passed' && level >= LEVELS.length - 1 && reveal
  const live = phase === 'signals' || phase === 'pick' || phase === 'pitching' || phase === 'result' || phase === 'strikeout'

  return (
    <>
      <style>{`
        .pk-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 18px; }
        .pk-board { background: #1E5B2E; border: 5px solid #E8E4DC; border-radius: 4px; padding: 11px 14px 12px; margin-bottom: 14px; box-shadow: 0 14px 34px #00000090; }
        .pk-top { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
        .pk-team { font-size: 21px; font-weight: 900; color: #F5F1E8; line-height: 1; }
        .pk-run { font-family: ui-monospace, monospace; font-size: 38px; font-weight: 900; color: #FF3B1F; line-height: 1; text-shadow: 0 0 16px #FF3B1F90; }
        .pk-inn { font-family: ui-monospace, monospace; font-size: 28px; font-weight: 900; color: #FF3B1F; line-height: 1; text-shadow: 0 0 14px #FF3B1F90; }
        .pk-counts { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 9px; padding-top: 9px; border-top: 2px solid #ffffff25; }
        .pk-cl { font-size: 14px; font-weight: 900; color: #F5F1E8; letter-spacing: .05em; }
        .pk-bulbs { display: flex; gap: 6px; justify-content: center; margin-top: 5px; }

        .pk-field {
          position: relative; height: 360px; overflow: hidden;
          background: linear-gradient(180deg, #0B1420 0%, #12301C 44%, #0A1A10 100%);
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .pk-dirt { position: absolute; left: 50%; bottom: -40px; transform: translateX(-50%); width: 122%; height: 116px; border-radius: 50%; background: #2A1D14; opacity: .8; }
        /* Home plate and a suggestion of the box, painted on the dirt behind
           both figures — the batter's feet cross it, which is what feet do. */
        .pk-plate { position: absolute; left: 50%; bottom: 15%; transform: translateX(-50%); width: 30%; height: 46px; pointer-events: none; opacity: .5; }
        .pk-catcher {
          position: absolute; left: 50%; bottom: 20%; transform: translateX(-50%);
          height: 60%; max-width: 48%; width: auto; object-fit: contain;
          filter: brightness(0.62) contrast(1.15) drop-shadow(0 0 22px #00000090);
        }
        /* The batter stands upright next to a crouching catcher, so he reads
           taller — scaled to match a real standing figure beside a crouch. */
        /* Both figures lift off the dark field, and the batter is held back
           from the middle so he can't crowd the catcher on a narrow screen. */
        .pk-batter {
          position: absolute; bottom: 6px; height: 96%; max-width: 46%; width: auto; object-fit: contain;
          filter: brightness(0.55) contrast(1.2) drop-shadow(0 0 16px #00000090);
        }
        .pk-hand { position: absolute; left: 50%; bottom: 28%; transform: translateX(-50%); width: 44px; height: 60px; filter: drop-shadow(0 0 12px #00000090); }
        .pk-status { position: absolute; left: 0; right: 0; bottom: 0; padding: 8px; text-align: center; background: #05060Ad9; }
        .pk-status span { font-size: 9px; font-weight: 900; letter-spacing: .28em; text-transform: uppercase; color: var(--neon); }
        .pk-pop { position: absolute; top: 12px; right: 12px; background: #05060Aee; padding: 9px 14px; text-align: right; animation: pk-in 240ms ease; }
        @keyframes pk-in { from { opacity: 0; transform: translateY(-8px); } }
        .pk-pop b { display: block; font-size: 7px; font-weight: 900; letter-spacing: .24em; }
        .pk-pop i { display: block; font-style: normal; font-size: 15px; font-weight: 900; color: #F5F1E8; margin-top: 3px; }
        .pk-banner {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; background: #05060Ac9; pointer-events: none;
        }
        .pk-banner p {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(30px, 9vw, 54px); color: #FF4D4D; transform: skewX(-7deg);
          text-shadow: 0 0 30px #FF4D4D90; animation: pk-slam 380ms cubic-bezier(.2,1.7,.4,1);
        }
        @keyframes pk-slam { from { transform: skewX(-7deg) scale(2); opacity: 0; } }
        .pk-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; text-align: center;
          background: #05060Aee; padding: 22px;
        }
        .pk-verdict { font-family: var(--font-heading); font-weight: 900; text-transform: uppercase; font-size: clamp(22px, 6vw, 36px); transform: skewX(-7deg); }

        .pk-lbl { font-size: 9px; font-weight: 900; letter-spacing: .28em; text-transform: uppercase; color: #4E5A6A; margin: 16px 0 8px; }
        .pk-opts { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 7px; }
        .pk-loc { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
        .pk-opt {
          background: #10141F; border: 1px solid #ffffff18; color: #F5F1E8; cursor: pointer;
          font-family: var(--font-heading); font-weight: 900; font-size: 11px; line-height: 1.2;
          padding: 13px 4px; text-align: center; transition: background 120ms ease, border-color 120ms ease;
        }
        .pk-opt:hover:not(:disabled) { border-color: #ffffff45; }
        .pk-opt[data-on="true"] { background: var(--neon); border-color: var(--neon); color: #05060A; }
        .pk-opt:disabled { opacity: .35; cursor: default; }

        /* The key rides beside the field so the shapes are next to the hand
           you're reading, not a scroll away from it. */
        .pk-stage { display: block; }
        .pk-key { display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 4px; }
        .pk-keyitem { background: #0C0F16; border: 1px solid #ffffff12; padding: 5px 1px 4px; text-align: center; }
        .pk-keyitem svg { height: 34px; width: 100%; }
        .pk-keyitem span { display: block; font-size: 7px; font-weight: 900; color: #7D8B9C; margin-top: 2px; line-height: 1.1; }
        @media (max-width: 560px) { .pk-keyitem svg { height: 26px; } }

        .pk-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
        .pk-lives { display: flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 900; letter-spacing: .24em; text-transform: uppercase; color: #5C6878; }
        .pk-life { width: 11px; height: 11px; border-radius: 50%; background: var(--neon); }
        .pk-life[data-gone="true"] { background: #ffffff14; }
        .pk-run3 { display: flex; gap: 5px; }
        .pk-tick { width: 30px; height: 5px; background: #ffffff14; }

        .pk-ladder { display: flex; flex-direction: column; gap: 6px; margin-top: 20px; }
        .pk-rung { display: flex; align-items: center; gap: 11px; padding: 10px 13px; border: 1px solid #ffffff12; background: #ffffff05; font-size: 11px; color: #7D8B9C; }
        .pk-rung[data-on="true"] { border-color: var(--neon); color: #F5F1E8; background: color-mix(in srgb, var(--neon) 10%, transparent); }
        .pk-rung[data-done="true"] { color: #39FF9E; }
        .pk-n { font-family: var(--font-heading); font-weight: 900; color: #3E4A58; width: 14px; }
        .pk-code { white-space: pre-line; font-size: 12px; line-height: 1.7; color: #B8C4D2; max-width: 34ch; }
      `}</style>

      <p className="pk-lede">
        Bottom of the seventh, tied, and you&apos;re the winning run standing on second. The catcher&apos;s hand is in
        plain sight — nobody is going to tell you what it means. The same shape can be the pitch or the
        location; only where it sits in the sequence says which.
      </p>

      <div className="pk-board">
        <div className="pk-top">
          <div><div className="pk-team">HOME</div><div className="pk-run">1</div></div>
          <div style={{ textAlign: 'center' }}>
            <div className="pk-inn">7</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#F5F1E8', letterSpacing: '.06em', marginTop: '2px' }}>INNING</div>
            <div style={{ fontSize: '9px', fontWeight: 900, color: '#F5F1E8', opacity: .7, letterSpacing: '.22em' }}>BOTTOM</div>
          </div>
          <div style={{ textAlign: 'right' }}><div className="pk-team">GUEST</div><div className="pk-run">1</div></div>
        </div>
        <div className="pk-counts">
          <div style={{ textAlign: 'center' }}>
            <div className="pk-cl">BALL</div>
            <div className="pk-bulbs"><i style={bulb(balls >= 1)} /><i style={bulb(balls >= 2)} /><i style={bulb(balls >= 3)} /></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="pk-cl">STRIKE</div>
            <div className="pk-bulbs"><i style={bulb(strikes >= 1)} /><i style={bulb(strikes >= 2)} /></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="pk-cl">OUT</div>
            <div className="pk-bulbs"><i style={bulb(outs >= 1)} /><i style={bulb(outs >= 2)} /></div>
          </div>
        </div>
      </div>

      <div className="pk-stage">
      <div className="pk-field">
        <span className="pk-dirt" />
        {/* Home plate and the box, painted on the dirt behind both figures */}
        <svg className="pk-plate" viewBox="0 0 200 60" aria-hidden="true">
          <polygon points="78,14 122,14 130,28 100,44 70,28" fill="#EFEADC" />
          <path d="M14 8 L14 54" stroke="#EFEADC" strokeWidth="3" fill="none" opacity=".55" />
          <path d="M186 8 L186 54" stroke="#EFEADC" strokeWidth="3" fill="none" opacity=".55" />
          <path d="M14 54 L186 54" stroke="#EFEADC" strokeWidth="3" fill="none" opacity=".35" />
        </svg>
        {/* Batter stands on the side he bats from, facing the plate in the middle */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pk-batter" alt=""
          src={lefty ? '/batter-lh-pick.png' : '/batter-rh-pick.png'}
          style={lefty
            ? { left: '1%' }
            : { right: '1%' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pk-catcher" src="/catcher-pick.png" alt="" />
        <span className="pk-hand"><Hand shape={shownIdx >= 0 ? seq[shownIdx] ?? null : null} /></span>
        {phase === 'signals' && !paused && (
          <div className="pk-status"><span>{shownIdx >= 0 ? `Signal ${shownIdx + 1} of ${seq.length}` : '·'}</span></div>
        )}
        {phase === 'pick' && (
          <div className="pk-status"><span style={{ color: '#39FF9E' }}>Call it — {NEED - streak} to go</span></div>
        )}

        {result && (
          <div className="pk-pop" style={{ border: `1px solid ${result.colour}80` }}>
            <b style={{ color: result.colour }}>PITCH THROWN</b>
            <i>{result.text}</i>
            <b style={{ color: result.colour, marginTop: '5px' }}>{result.sub}</b>
          </div>
        )}

        {phase === 'strikeout' && (
          <div className="pk-banner">
            <p>STRIKE OUT</p>
            <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase', color: '#8FA0B4', marginTop: '10px' }}>
              {outs + 1 >= 3 ? 'Side away' : `${outs + 1} down`}
            </span>
          </div>
        )}

        {paused && (
          <div className="pk-banner">
            <p style={{ color: 'var(--neon)', textShadow: '0 0 30px #FFD40090' }}>PAUSED</p>
          </div>
        )}

        {phase === 'idle' && (
          <div className="pk-overlay">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--neon)' }}>
              Level {level + 1} · {L.n} signals
            </p>
            <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '32ch', lineHeight: 1.6, marginTop: '6px' }}>
              {L.brief}
            </p>
            <button className="ar-btn" onClick={begin} style={{ marginTop: '16px' }}><span>Runner on 2 — ready?</span></button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="pk-overlay">
            <p className="pk-verdict" style={{ color: '#FF4D4D' }}>Inning gone</p>
            <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '32ch', lineHeight: 1.6, marginTop: '8px' }}>
              New code, and {lives} {lives === 1 ? 'life' : 'lives'} left at this level.
            </p>
            <button className="ar-btn" onClick={retry} style={{ marginTop: '16px' }}><span>Go again</span></button>
          </div>
        )}

        {phase === 'demoted' && (
          <div className="pk-overlay">
            <p className="pk-verdict" style={{ color: '#FF4D4D' }}>Back to the start</p>
            <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '32ch', lineHeight: 1.6, marginTop: '8px' }}>
              Three goes at level {level + 1} and the signs beat you. Everything reshuffles.
            </p>
            <button className="ar-btn" onClick={restartAll} style={{ marginTop: '16px' }}><span>Start again</span></button>
          </div>
        )}

        {phase === 'passed' && reveal && (
          <div className="pk-overlay" style={{ justifyContent: 'flex-start', paddingTop: '24px', overflowY: 'auto' }}>
            <p className="pk-verdict" style={{ color: '#FFD700', textShadow: '0 0 34px #FFD70080' }}>
              Home team win!
            </p>
            <p style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase', color: '#39FF9E', marginTop: '4px' }}>
              {finished ? 'All four cracked' : 'Signs cracked'}
            </p>
            <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--neon)', marginTop: '10px' }}>The code was</p>
            <p className="pk-code">{reveal}</p>
            {finished
              ? <button className="ar-btn" onClick={restartAll} style={{ marginTop: '14px' }}><span>Start again</span></button>
              : <button className="ar-btn" onClick={nextLevel} style={{ marginTop: '14px' }}><span>Level {level + 2}</span></button>}
          </div>
        )}
      </div>

      </div>

      {committed ? (
        <>
          <p className="pk-lbl">The pitch</p>
          <div className="pk-opts">
            {code.pitchList.map(p => (
              <button key={p} className="pk-opt" data-on={pickPitch === p}
                disabled={phase !== 'signals' && phase !== 'pick'}
                onClick={() => setPickPitch(p)}>{p}</button>
            ))}
          </div>
          {needsLoc && (
            <>
              <p className="pk-lbl">Location</p>
              <div className="pk-loc">
                {LOCATIONS.map(l => (
                  <button key={l} className="pk-opt" data-on={pickLoc === l}
                    disabled={phase !== 'signals' && phase !== 'pick'}
                    onClick={() => setPickLoc(l)}>{l}</button>
                ))}
              </div>
            </>
          )}
          <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="ar-btn" onClick={lockIn}
              disabled={phase !== 'pick' || !pickPitch || (needsLoc && !pickLoc)}>
              <span>Lock it in</span>
            </button>
            <button className="ar-btn" onClick={replay}
              disabled={replays >= replayCap || (phase !== 'signals' && phase !== 'pick')}
              style={{ background: 'transparent', color: 'var(--neon)', border: '1px solid var(--neon)', boxShadow: 'none' }}>
              <span>{replayCap === Infinity ? 'Show again' : `Show again (${replayCap - replays})`}</span>
            </button>
            <p style={{ fontSize: '10px', color: '#FF6B6B', fontWeight: 700, marginTop: '9px' }}>
              One wrong and the hitter stops looking
            </p>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="ar-btn" onClick={commit} disabled={!live}>
            <span>I&apos;ve got the signs</span>
          </button>
          {L.pause && live && (
            <button className="ar-btn" onClick={togglePause}
              style={{ background: 'transparent', color: 'var(--neon)', border: '1px solid var(--neon)', boxShadow: 'none' }}>
              <span>{paused ? 'Resume' : 'Pause'}</span>
            </button>
          )}
          {(phase === 'signals' || phase === 'pick') && (
            <button className="ar-btn" onClick={replay} disabled={replays >= replayCap}
              style={{ background: 'transparent', color: 'var(--neon)', border: '1px solid var(--neon)', boxShadow: 'none' }}>
              <span>{replayCap === Infinity ? 'Show again' : `Show again (${replayCap - replays})`}</span>
            </button>
          )}
        </div>
      )}
      {!committed && (
        <p style={{ fontSize: '10px', color: '#5C6878', marginTop: '9px', textAlign: 'center' }}>
          {L.n} signals a pitch · the location always follows the pitch signal
        </p>
      )}

      <div className="pk-meta">
        <span className="pk-lives">
          Lives
          {Array.from({ length: LIVES }).map((_, i) => <i key={i} className="pk-life" data-gone={i >= lives} />)}
        </span>
        <span className="pk-run3">
          {Array.from({ length: NEED }).map((_, i) => (
            <i key={i} className="pk-tick" style={i < streak ? { background: '#39FF9E' } : undefined} />
          ))}
        </span>
      </div>

      {/* Reference only — needed for the first couple of pitches, then never
          again, so it sits out of the way of the calling buttons. */}
      <p className="pk-lbl">The hand</p>
      <div className="pk-key">
        {SHAPES.map(s => (
          <span key={s} className="pk-keyitem">
            <Hand shape={s} />
            <span>{SHAPE_LABEL[s]}</span>
          </span>
        ))}
      </div>

      <div className="pk-ladder">
        {LEVELS.map((lv, i) => (
          <span key={i} className="pk-rung" data-on={i === level} data-done={i < level}>
            <span className="pk-n">{i + 1}</span>
            {lv.n} signals
            <span style={{ marginLeft: 'auto', fontSize: '10px', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              {i < level ? 'Cracked' : lv.loc ? 'Pitch + location' : 'Pitch only'}
            </span>
          </span>
        ))}
      </div>
    </>
  )
}