'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* You are the runner on second, and you can see the catcher's hand between his
   knees. The code isn't given to you — you watch, you correlate, you work it
   out. Every at-bat you only watch ends in a strikeout and costs an out.

   Press the button and you're committed: three consecutive correct calls wins
   the level, one wrong and the hitter stops looking at you.

   Location always sits in the sequence immediately after the pitch signal, but
   you aren't asked to call it until level three. */

const SHAPES = ['one', 'two', 'three', 'four', 'five', 'fist', 'thumb', 'pinky'] as const
type Shape = typeof SHAPES[number]

const ALL_PITCHES = ['Drop', 'Rise', 'Curve', 'Changeup', 'Low rise / Screwball', 'Pickoff']
const LOCATIONS = ['Inside', 'Outside']

const LEVELS = [
  { n: 3, ms: 1500, rule: 'straight',   loc: false, pitches: 6, brief: 'Three signals. One is the pitch.' },
  { n: 4, ms: 1500, rule: 'straight',   loc: false, pitches: 6, brief: 'Four signals now. One is the pitch.' },
  { n: 5, ms: 1300, rule: 'outs',       loc: true,  pitches: 6, brief: 'Five signals, and the location matters. Something changes with the outs.' },
  { n: 5, ms: 1000, rule: 'magic',      loc: true,  pitches: 5, brief: 'Five signals, faster hands. One signal is the key to the rest.' },
]
const LIVES = 3
const NEED = 3           // correct calls in a row to pass

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)

type Code = {
  pitchOf: Record<string, string>      // shape -> pitch
  locOf: Record<string, string>        // shape -> location
  fixedIndex: number                   // where the pitch sits, for the straight rule
  magic: Shape | null
  pitchList: string[]
}

function makeCode(lv: number): Code {
  const L = LEVELS[lv]
  const bag = shuffle([...SHAPES])
  const pitchList = ALL_PITCHES.slice(0, L.pitches)
  const pitchShapes = bag.slice(0, pitchList.length)
  const locShapes = bag.slice(pitchList.length, pitchList.length + 2)
  const magic = L.rule === 'magic' ? bag[pitchList.length + 2] ?? bag[0] : null

  const pitchOf: Record<string, string> = {}
  pitchShapes.forEach((s, i) => { pitchOf[s] = pitchList[i] })
  const locOf: Record<string, string> = {}
  locShapes.forEach((s, i) => { locOf[s] = LOCATIONS[i] })

  // The pitch never sits last — location always follows it
  const fixedIndex = Math.floor(Math.random() * (L.n - 1))
  return { pitchOf, locOf, fixedIndex, magic, pitchList }
}

function buildSequence(lv: number, code: Code, outs: number) {
  const L = LEVELS[lv]
  const pitch = code.pitchList[Math.floor(Math.random() * code.pitchList.length)]
  const location = LOCATIONS[Math.floor(Math.random() * 2)]
  const pitchShape = Object.keys(code.pitchOf).find(s => code.pitchOf[s] === pitch)! as Shape
  const locShape = Object.keys(code.locOf).find(s => code.locOf[s] === location)! as Shape

  let pi: number
  if (L.rule === 'outs') pi = Math.min(outs, L.n - 2)
  else if (L.rule === 'magic') pi = 1 + Math.floor(Math.random() * (L.n - 2))
  else pi = code.fixedIndex
  const li = pi + 1

  // Decoys can be anything except the magic key, which must appear only once
  const decoyPool = SHAPES.filter(s => s !== code.magic)
  const seq: Shape[] = Array.from({ length: L.n },
    () => decoyPool[Math.floor(Math.random() * decoyPool.length)])
  seq[pi] = pitchShape
  seq[li] = locShape
  if (L.rule === 'magic' && code.magic) seq[pi - 1] = code.magic

  return { seq, pitch, location }
}

function describe(lv: number, code: Code): string {
  const L = LEVELS[lv]
  const where = L.rule === 'outs'
    ? 'the pitch is the signal at the number of outs — first with none, second with one, third with two'
    : L.rule === 'magic'
      ? `the pitch is the signal straight after the ${label(code.magic!)}`
      : `the pitch is signal ${code.fixedIndex + 1} of ${L.n}`
  const pitches = Object.entries(code.pitchOf).map(([s, p]) => `${label(s as Shape)} = ${p}`).join(' · ')
  const locs = Object.entries(code.locOf).map(([s, p]) => `${label(s as Shape)} = ${p}`).join(' · ')
  return `${where}, and the location follows it.\n${pitches}\n${locs}`
}

const label = (s: Shape) => ({
  one: 'one finger', two: 'two', three: 'three', four: 'four',
  five: 'open hand', fist: 'fist', thumb: 'thumb', pinky: 'pinky',
}[s])

/* ── The hand, fingers pointing down ── */
function Hand({ shape }: { shape: Shape | null }) {
  const SKIN = '#E8C9A0'
  const SHADE = '#C9A87A'
  if (!shape) return <svg viewBox="0 0 110 150" style={{ width: '100%', height: '100%', opacity: 0.18 }} />
  const finger = (x: number, len: number, w = 15) =>
    <rect key={x} x={x} y={72} width={w} height={len} rx={w / 2} fill={SKIN} stroke={SHADE} strokeWidth="1.5" />
  const fingers: React.ReactNode[] = []
  if (shape === 'one') fingers.push(finger(28, 48))
  if (shape === 'two') { fingers.push(finger(24, 44), finger(44, 52)) }
  if (shape === 'three') { fingers.push(finger(20, 40), finger(40, 52), finger(60, 44)) }
  if (shape === 'four' || shape === 'five') {
    fingers.push(finger(16, 38), finger(34, 50), finger(52, 50), finger(70, 36))
  }
  if (shape === 'pinky') fingers.push(finger(70, 34))
  const showThumb = shape === 'thumb' || shape === 'five'
  const isFist = shape === 'fist'

  return (
    <svg viewBox="0 0 110 150" style={{ width: '100%', height: '100%' }}>
      {/* forearm */}
      <rect x="30" y="0" width="46" height="34" rx="14" fill={SKIN} stroke={SHADE} strokeWidth="1.5" />
      {/* palm */}
      <rect x="12" y="26" width="82" height={isFist ? 56 : 52} rx={isFist ? 22 : 16}
        fill={SKIN} stroke={SHADE} strokeWidth="2" />
      {isFist && (
        <g stroke={SHADE} strokeWidth="2.5" strokeLinecap="round">
          <path d="M24 52h62M24 66h62" />
        </g>
      )}
      {fingers}
      {showThumb && (
        <rect x="-2" y="44" width="17" height="36" rx="8.5" fill={SKIN} stroke={SHADE} strokeWidth="1.5"
          transform="rotate(24 6 62)" />
      )}
    </svg>
  )
}

type Phase = 'idle' | 'signals' | 'pick' | 'pitching' | 'result' | 'passed' | 'failed' | 'demoted'

export default function PickClient() {
  const [level, setLevel] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [code, setCode] = useState<Code>(() => makeCode(0))

  const [phase, setPhase] = useState<Phase>('idle')
  const [committed, setCommitted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [balls, setBalls] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [outs, setOuts] = useState(0)
  const [threeTwo, setThreeTwo] = useState(false)     // the coin flip already went long
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

  /* ── One pitch: flash the signals, then either wait for a call or throw it ── */
  const runPitch = useCallback((atOuts: number, isCommitted: boolean) => {
    const built = buildSequence(level, code, atOuts)
    setSeq(built.seq)
    setTruth({ pitch: built.pitch, location: built.location })
    setPickPitch(null); setPickLoc(null)
    setShownIdx(-1)
    setPhase('signals')

    built.seq.forEach((_, i) => {
      after(300 + i * L.ms, () => setShownIdx(i))
      after(300 + i * L.ms + L.ms * 0.72, () => setShownIdx(-1))
    })
    after(300 + built.seq.length * L.ms, () => {
      if (isCommitted) setPhase('pick')
      else after(700, () => setPhase('pitching'))
    })
  }, [level, code, L.ms])

  /* ── Resolve the count after a pitch, and roll the at-bat on ── */
  const advanceCount = useCallback(() => {
    // 0-0 → 0-1 → 0-2 → 1-2 → 2-2 → (K or 3-2 → K)
    if (strikes < 2) { setStrikes(strikes + 1); return false }
    if (balls < 2) { setBalls(balls + 1); return false }
    if (balls === 2 && !threeTwo && Math.random() < 0.5) { setBalls(3); setThreeTwo(true); return false }
    return true      // strike three
  }, [balls, strikes, threeTwo])

  const nextPitch = useCallback((isCommitted: boolean) => {
    const struckOut = advanceCount()
    if (!struckOut) { runPitch(outs, isCommitted); return }

    // Strikeout — the hitter had nothing to go on
    const nextOuts = outs + 1
    setBalls(0); setStrikes(0); setThreeTwo(false)
    setLefty(Math.random() < 0.5)
    if (nextOuts >= 3) { setOuts(3); loseLife(); return }
    setOuts(nextOuts)
    after(500, () => runPitch(nextOuts, isCommitted))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceCount, outs, runPitch])

  function loseLife() {
    clearAll()
    const left = lives - 1
    setCommitted(false); setStreak(0)
    if (left <= 0) {
      setPhase('demoted')
      return
    }
    setLives(left)
    setPhase('failed')
  }

  function retry() {
    clearAll()
    setCode(makeCode(level))
    setBalls(0); setStrikes(0); setOuts(0); setThreeTwo(false)
    setCommitted(false); setStreak(0); setResult(null); setReveal(null)
    setPhase('idle')
  }

  function restartAll() {
    clearAll()
    setLevel(0); setLives(LIVES); setCode(makeCode(0))
    setBalls(0); setStrikes(0); setOuts(0); setThreeTwo(false)
    setCommitted(false); setStreak(0); setResult(null); setReveal(null)
    setPhase('idle')
  }

  function begin() {
    setBalls(0); setStrikes(0); setOuts(0); setThreeTwo(false)
    setResult(null); setReveal(null)
    runPitch(0, false)
  }

  function commit() {
    setCommitted(true)
    setStreak(0)
  }

  function lockIn() {
    if (!pickPitch) return
    if (needsLoc && !pickLoc) return
    setPhase('pitching')
  }

  /* ── The pitch lands ── */
  useEffect(() => {
    if (phase !== 'pitching' || !truth) return
    after(650, () => {
      const right = committed
        && pickPitch === truth.pitch
        && (!needsLoc || pickLoc === truth.location)

      if (!committed) {
        setResult({ text: `${truth.pitch}, ${truth.location}`, sub: 'Strike', colour: '#FF4D4D' })
        setPhase('result')
        after(1700, () => { setResult(null); nextPitch(false) })
        return
      }

      if (!right) {
        setResult({
          text: `${truth.pitch}, ${truth.location}`,
          sub: 'You called it wrong',
          colour: '#FF4D4D',
        })
        setPhase('result')
        after(2000, () => { setResult(null); loseLife() })
        return
      }

      const run = streak + 1
      setStreak(run)
      if (run >= NEED) {
        const hit = ['HOME RUN', 'SINGLE', 'WALK'][Math.floor(Math.random() * 3)]
        setResult({ text: `${truth.pitch}, ${truth.location}`, sub: hit, colour: '#39FF9E' })
        setPhase('result')
        after(2100, () => {
          setResult(null)
          setReveal(describe(level, code))
          setPhase('passed')
        })
        return
      }
      setResult({ text: `${truth.pitch}, ${truth.location}`, sub: `Called it — ${run} of ${NEED}`, colour: '#39FF9E' })
      setPhase('result')
      after(1700, () => { setResult(null); nextPitch(true) })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function nextLevel() {
    const lv = level + 1
    if (lv >= LEVELS.length) { setPhase('passed'); return }
    clearAll()
    setLevel(lv); setLives(LIVES); setCode(makeCode(lv))
    setBalls(0); setStrikes(0); setOuts(0); setThreeTwo(false)
    setCommitted(false); setStreak(0); setResult(null); setReveal(null)
    setPhase('idle')
  }

  const bulb = (on: boolean) => ({
    width: '11px', height: '11px', borderRadius: '50%',
    background: on ? '#FF3B1F' : '#5A1A10',
    boxShadow: on ? '0 0 8px #FF3B1F' : 'none',
    border: '1px solid #00000040',
  })

  const finished = phase === 'passed' && level >= LEVELS.length - 1 && reveal

  return (
    <>
      <style>{`
        .pk-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 18px; }
        .pk-board {
          background: #1E5B2E; border: 5px solid #E8E4DC; border-radius: 4px;
          padding: 11px 14px 12px; margin-bottom: 14px; box-shadow: 0 14px 34px #00000090;
        }
        .pk-top { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
        .pk-team { font-size: 22px; font-weight: 900; color: #F5F1E8; line-height: 1; }
        .pk-run { font-family: ui-monospace, monospace; font-size: 40px; font-weight: 900; color: #FF3B1F; line-height: 1; text-shadow: 0 0 16px #FF3B1F90; }
        .pk-inn { font-family: ui-monospace, monospace; font-size: 30px; font-weight: 900; color: #FF3B1F; line-height: 1; text-shadow: 0 0 14px #FF3B1F90; }
        .pk-counts { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 9px; padding-top: 9px; border-top: 2px solid #ffffff25; }
        .pk-cl { font-size: 14px; font-weight: 900; color: #F5F1E8; letter-spacing: .05em; }
        .pk-bulbs { display: flex; gap: 6px; justify-content: center; margin-top: 5px; }

        .pk-field {
          position: relative; height: 340px; overflow: hidden;
          background: linear-gradient(180deg, #0B1420 0%, #12301C 44%, #0A1A10 100%);
          border: 1px solid color-mix(in srgb, var(--neon) 34%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .pk-dirt { position: absolute; left: 50%; bottom: -34px; transform: translateX(-50%); width: 118%; height: 108px; border-radius: 50%; background: #2A1D14; opacity: .8; }
        .pk-catcher { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); height: 86%; width: auto; filter: brightness(0) drop-shadow(0 0 22px #00000090); }
        .pk-batter { position: absolute; bottom: 10px; height: 74%; width: auto; filter: brightness(0.12) contrast(1.4) drop-shadow(0 0 16px #00000080); }
        .pk-hand {
          position: absolute; left: 50%; bottom: 15%; transform: translateX(-50%);
          width: 74px; height: 100px;
          filter: drop-shadow(0 0 16px #00000090);
        }
        .pk-status { position: absolute; left: 0; right: 0; bottom: 0; padding: 8px; text-align: center; background: #05060Ad9; }
        .pk-status span { font-size: 9px; font-weight: 900; letter-spacing: .28em; text-transform: uppercase; color: var(--neon); }
        .pk-pop {
          position: absolute; top: 12px; right: 12px; background: #05060Aee;
          padding: 9px 14px; text-align: right; animation: pk-in 240ms ease;
        }
        @keyframes pk-in { from { opacity: 0; transform: translateY(-8px); } }
        .pk-pop b { display: block; font-size: 7px; font-weight: 900; letter-spacing: .24em; }
        .pk-pop i { display: block; font-style: normal; font-size: 15px; font-weight: 900; color: #F5F1E8; margin-top: 3px; }

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
          padding: 13px 4px; text-align: center;
          transition: background 120ms ease, border-color 120ms ease;
        }
        .pk-opt:hover:not(:disabled) { border-color: #ffffff45; }
        .pk-opt[data-on="true"] { background: var(--neon); border-color: var(--neon); color: #05060A; }
        .pk-opt:disabled { opacity: .35; cursor: default; }

        .pk-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
        .pk-lives { display: flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 900; letter-spacing: .24em; text-transform: uppercase; color: #5C6878; }
        .pk-life { width: 11px; height: 11px; border-radius: 50%; background: var(--neon); }
        .pk-life[data-gone="true"] { background: #ffffff14; }
        .pk-run3 { display: flex; gap: 5px; }
        .pk-tick { width: 30px; height: 5px; background: #ffffff14; }

        .pk-ladder { display: flex; flex-direction: column; gap: 6px; margin-top: 20px; }
        .pk-rung {
          display: flex; align-items: center; gap: 11px; padding: 10px 13px;
          border: 1px solid #ffffff12; background: #ffffff05; font-size: 11px; color: #7D8B9C;
        }
        .pk-rung[data-on="true"] { border-color: var(--neon); color: #F5F1E8; background: color-mix(in srgb, var(--neon) 10%, transparent); }
        .pk-rung[data-done="true"] { color: #39FF9E; }
        .pk-n { font-family: var(--font-heading); font-weight: 900; color: #3E4A58; width: 14px; }
        .pk-code { white-space: pre-line; font-size: 12px; line-height: 1.7; color: #B8C4D2; }
      `}</style>

      <p className="pk-lede">
        Bottom of the seventh, tied, and you&apos;re the winning run on second. The catcher&apos;s hand is in
        plain sight — nobody is going to tell you what it means. Watch until you&apos;re sure. Every at-bat
        you only watch is a strikeout, and three of those and the inning is gone.
      </p>

      {/* ── Scoreboard ── */}
      <div className="pk-board">
        <div className="pk-top">
          <div>
            <div className="pk-team">HOME</div>
            <div className="pk-run">1</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="pk-inn">7</div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#F5F1E8', letterSpacing: '.06em', marginTop: '2px' }}>INNING</div>
            <div style={{ fontSize: '9px', fontWeight: 900, color: '#F5F1E8', opacity: .7, letterSpacing: '.22em' }}>BOTTOM</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="pk-team">GUEST</div>
            <div className="pk-run">1</div>
          </div>
        </div>
        <div className="pk-counts">
          <div style={{ textAlign: 'center' }}>
            <div className="pk-cl">BALL</div>
            <div className="pk-bulbs">
              <i style={bulb(balls >= 1)} /><i style={bulb(balls >= 2)} /><i style={bulb(balls >= 3)} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="pk-cl">STRIKE</div>
            <div className="pk-bulbs">
              <i style={bulb(strikes >= 1)} /><i style={bulb(strikes >= 2)} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="pk-cl">OUT</div>
            <div className="pk-bulbs">
              <i style={bulb(outs >= 1)} /><i style={bulb(outs >= 2)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── The field ── */}
      <div className="pk-field">
        <span className="pk-dirt" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pk-batter" alt=""
          src={lefty ? '/batter-lh-pick.png' : '/batter-rh-pick.png'}
          style={lefty ? { right: '2%' } : { left: '2%' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pk-catcher" src="/catcher-pick.png" alt="" />
        <span className="pk-hand">
          <Hand shape={shownIdx >= 0 ? seq[shownIdx] ?? null : null} />
        </span>

        {(phase === 'signals') && (
          <div className="pk-status">
            <span>{shownIdx >= 0 ? `Signal ${shownIdx + 1} of ${seq.length}` : '·'}</span>
          </div>
        )}
        {phase === 'pick' && (
          <div className="pk-status">
            <span style={{ color: '#39FF9E' }}>Call it — {NEED - streak} to go</span>
          </div>
        )}

        {result && (
          <div className="pk-pop" style={{ border: `1px solid ${result.colour}80` }}>
            <b style={{ color: result.colour }}>PITCH THROWN</b>
            <i>{result.text}</i>
            <b style={{ color: result.colour, marginTop: '5px' }}>{result.sub}</b>
          </div>
        )}

        {phase === 'idle' && (
          <div className="pk-overlay">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--neon)' }}>
              Level {level + 1} · {LEVELS[level].n} signals
            </p>
            <p style={{ fontSize: '12px', color: '#8FA0B4', maxWidth: '32ch', lineHeight: 1.6, marginTop: '6px' }}>
              {L.brief}{needsLoc ? ' You call the location too.' : ''}
            </p>
            <button className="ar-btn" onClick={begin} style={{ marginTop: '16px' }}><span>Take your lead</span></button>
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
          <div className="pk-overlay" style={{ justifyContent: 'flex-start', paddingTop: '26px', overflowY: 'auto' }}>
            <p className="pk-verdict" style={{ color: '#39FF9E' }}>
              {finished ? 'All four cracked' : 'Signs cracked'}
            </p>
            <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--neon)', marginTop: '10px' }}>
              The code was
            </p>
            <p className="pk-code">{reveal}</p>
            {finished
              ? <button className="ar-btn" onClick={restartAll} style={{ marginTop: '14px' }}><span>Start again</span></button>
              : <button className="ar-btn" onClick={nextLevel} style={{ marginTop: '14px' }}><span>Level {level + 2}</span></button>}
          </div>
        )}
      </div>

      {/* ── The call ── */}
      {committed ? (
        <>
          <p className="pk-lbl">The pitch</p>
          <div className="pk-opts">
            {code.pitchList.map(p => (
              <button key={p} className="pk-opt" data-on={pickPitch === p}
                disabled={phase !== 'pick'}
                onClick={() => setPickPitch(p)}>{p}</button>
            ))}
          </div>
          {needsLoc && (
            <>
              <p className="pk-lbl">Location</p>
              <div className="pk-loc">
                {LOCATIONS.map(l => (
                  <button key={l} className="pk-opt" data-on={pickLoc === l}
                    disabled={phase !== 'pick'}
                    onClick={() => setPickLoc(l)}>{l}</button>
                ))}
              </div>
            </>
          )}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button className="ar-btn" onClick={lockIn}
              disabled={phase !== 'pick' || !pickPitch || (needsLoc && !pickLoc)}>
              <span>Lock it in</span>
            </button>
            <p style={{ fontSize: '10px', color: '#FF6B6B', fontWeight: 700, marginTop: '9px' }}>
              One wrong and the hitter stops looking
            </p>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="ar-btn" onClick={commit}
            disabled={phase === 'idle' || phase === 'failed' || phase === 'demoted' || phase === 'passed'}>
            <span>I&apos;ve got the signs</span>
          </button>
          <p style={{ fontSize: '10px', color: '#5C6878', marginTop: '9px' }}>
            {L.n} signals a pitch · the location always follows the pitch signal
          </p>
        </div>
      )}

      <div className="pk-meta">
        <span className="pk-lives">
          Lives
          {Array.from({ length: LIVES }).map((_, i) => (
            <i key={i} className="pk-life" data-gone={i >= lives} />
          ))}
        </span>
        <span className="pk-run3">
          {Array.from({ length: NEED }).map((_, i) => (
            <i key={i} className="pk-tick" style={i < streak ? { background: '#39FF9E' } : undefined} />
          ))}
        </span>
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