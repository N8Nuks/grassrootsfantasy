'use client'
import { useState, useCallback } from 'react'
import { splitName } from '@/lib/names'
import ArcadeShare from '@/components/ArcadeShare'

export type GamePlayer = {
  id: string
  name: string
  club: string
  grade: string
  tier: string
  photoUrl: string | null
  stats: Record<string, number>
}

const WIN = '#C6FF00'
const LOSE = '#FF4D4D'

/* Hitting stats only. Each carries its own phrasing so the question reads
   naturally — counts take "more", rates take "the higher". */
const STATS: { key: string; label: string; question: string; decimals: number }[] = [
  { key: 'season_points', label: 'Fantasy Points', question: 'more points', decimals: 0 },
  { key: 'season_hr', label: 'Home Runs', question: 'more home runs', decimals: 0 },
  { key: 'season_rbi', label: 'RBI', question: 'more RBIs', decimals: 0 },
  { key: 'season_sb', label: 'Stolen Bases', question: 'more stolen bases', decimals: 0 },
  { key: 'season_ba', label: 'Batting Average', question: 'the higher batting average', decimals: 3 },
]

type Round = { stat: typeof STATS[number]; left: GamePlayer; right: GamePlayer }

export default function HigherClient({ pool }: { pool: GamePlayer[] }) {
  /* Pick the stat first, then two players who both have a real value for it —
     otherwise a sparse stat like stolen bases serves up 0 against 0. */
  const draw = useCallback((): Round | null => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const stat = STATS[Math.floor(Math.random() * STATS.length)]
      const eligible = pool.filter(p => (p.stats[stat.key] ?? 0) > 0)
      if (eligible.length < 2) continue
      const a = eligible[Math.floor(Math.random() * eligible.length)]
      const rest = eligible.filter(p => p.id !== a.id)
      const b = rest[Math.floor(Math.random() * rest.length)]
      if (!b) continue
      return { stat, left: a, right: b }
    }
    return null
  }, [pool])

  const [round, setRound] = useState<Round | null>(() => draw())
  const [picked, setPicked] = useState<'left' | 'right' | null>(null)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState(false)

  if (!round) {
    return <p style={{ color: '#8FA0B4', fontSize: '13px' }}>
      Not enough scored players yet — this one opens up as the season goes.
    </p>
  }

  const val = (p: GamePlayer) => p.stats[round.stat.key] ?? 0
  const fmt = (n: number) => round.stat.decimals ? n.toFixed(round.stat.decimals).replace(/^0/, '') : String(n)
  // A tie is unguessable, so it counts as correct
  const correct = picked === null ? null
    : picked === 'left' ? val(round.left) >= val(round.right) : val(round.right) >= val(round.left)

  function choose(side: 'left' | 'right') {
    if (picked || over) return
    setPicked(side)
    const right = side === 'left' ? val(round!.left) >= val(round!.right) : val(round!.right) >= val(round!.left)
    if (right) {
      const next = streak + 1
      setStreak(next)
      if (next > best) setBest(next)
      setTimeout(() => { setPicked(null); setRound(draw()) }, 1500)
    } else {
      setTimeout(() => setOver(true), 1500)
    }
  }

  function restart() {
    setStreak(0); setPicked(null); setOver(false); setRound(draw())
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span style={{ textTransform: 'uppercase' }}>{s.last}</span></>
  }

  function Card({ p, side }: { p: GamePlayer; side: 'left' | 'right' }) {
    const isPicked = picked === side
    const shown = picked !== null
    const edge = shown && isPicked ? (correct ? WIN : LOSE) : undefined
    return (
      <button onClick={() => choose(side)} disabled={picked !== null || over}
        className="hl-card"
        style={edge ? { borderColor: edge, boxShadow: `0 0 30px ${edge}50, 0 18px 40px #00000090` } : undefined}>
        <span className="hl-photo">
          {p.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.photoUrl} alt="" />
            : <span className="hl-ghost" />}
        </span>
        <span className="hl-name">{caps(p.name)}</span>
        <span className="hl-club">{p.club} · {p.grade}</span>
        <span className="hl-slot">
          {shown
            ? <>
                <span className="ar-num hl-val" style={edge ? { color: edge } : undefined}>{fmt(val(p))}</span>
                <span className="hl-statlabel">{round!.stat.label}</span>
              </>
            : <span className="hl-pick">Pick this one</span>}
        </span>
      </button>
    )
  }

  return (
    <>
      <style>{`
        .hl-q {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(19px, 5vw, 26px); line-height: 1.1; color: #F5F1E8;
          letter-spacing: -0.02em; margin-bottom: 18px;
        }
        .hl-q em { font-style: normal; color: var(--neon); text-shadow: 0 0 20px color-mix(in srgb, var(--neon) 55%, transparent); }
        .hl-score { display: flex; gap: 26px; margin-bottom: 26px; }
        .hl-score span { font-size: 10px; font-weight: 900; letter-spacing: 0.26em; text-transform: uppercase; color: #5C6878; }
        .hl-score b { font-family: var(--font-heading); font-size: 17px; color: #F5F1E8; margin-left: 8px; }

        .hl-grid { display: flex; gap: 14px; align-items: stretch; }
        .hl-card {
          flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center;
          cursor: pointer; padding: 0 0 22px; overflow: hidden;
          background: linear-gradient(155deg, #0C0F16 0%, #07080D 100%);
          border: 1px solid color-mix(in srgb, var(--neon) 32%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
          transition: transform 180ms cubic-bezier(.2,.8,.3,1), border-color 180ms ease, box-shadow 180ms ease;
        }
        .hl-card:hover:not(:disabled) {
          transform: translateY(-5px); border-color: var(--neon);
          box-shadow: 0 0 28px color-mix(in srgb, var(--neon) 40%, transparent), 0 22px 46px #000000a0;
        }
        .hl-card:disabled { cursor: default; }
        .hl-card:focus-visible { outline: 2px solid var(--neon); outline-offset: 3px; }

        .hl-photo {
          width: 100%; height: 148px; display: flex; align-items: flex-end; justify-content: center;
          background: linear-gradient(180deg, color-mix(in srgb, var(--neon) 14%, transparent) 0%, #07080D 92%);
          overflow: hidden;
        }
        .hl-photo img { height: 96%; width: auto; object-fit: contain; }
        .hl-ghost {
          width: 54px; height: 66px; margin-bottom: 8px; border-radius: 50% 50% 8px 8px;
          background: color-mix(in srgb, var(--neon) 30%, transparent);
        }
        .hl-name { font-family: var(--font-heading); font-weight: 900; font-size: 14px; color: #F5F1E8; margin-top: 15px; padding: 0 10px; line-height: 1.15; }
        .hl-club { font-size: 10px; color: #5C6878; margin-top: 5px; }
        .hl-slot { min-height: 62px; display: flex; flex-direction: column; justify-content: center; margin-top: 14px; }
        .hl-val { font-size: 34px; animation: hl-pop 300ms cubic-bezier(.2,1.6,.4,1); }
        @keyframes hl-pop { from { transform: scale(0.6); opacity: 0; } }
        .hl-statlabel { font-size: 8px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #4E5A6A; margin-top: 5px; }
        .hl-pick {
          font-size: 10px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--neon); border: 1px solid color-mix(in srgb, var(--neon) 45%, transparent);
          padding: 10px 16px; margin: 0 14px;
        }
        .hl-note { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 18px; }
        .hl-over { text-align: center; padding: 44px 24px; }
      `}</style>

      <p className="hl-q">Who has <em>{round.stat.question}</em>?</p>
      <div className="hl-score">
        <span>Streak <b>{streak}</b></span>
        <span>Best <b style={{ color: 'var(--neon)' }}>{best}</b></span>
      </div>

      {over ? (
        <div className="ar-panel hl-over" style={{ borderColor: LOSE }}>
          <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: LOSE }}>Run over</p>
          <p className="ar-num" style={{ fontSize: '64px', color: '#F5F1E8', margin: '16px 0 6px', textShadow: 'none' }}>{streak}</p>
          <p style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: '#5C6878' }}>in a row</p>
          <button className="ar-btn" onClick={restart} style={{ marginTop: '28px' }}><span>Go again</span></button>
          <div style={{ marginTop: '12px' }}>
            <ArcadeShare lines={[`Higher or Lower — ${streak} in a row`]} />
          </div>
        </div>
      ) : (
        <>
          <div className="hl-grid">
            <Card p={round.left} side="left" />
            <Card p={round.right} side="right" />
          </div>
          <p className="hl-note">Stat changes every round · a tie counts as correct</p>
        </>
      )}
    </>
  )
}