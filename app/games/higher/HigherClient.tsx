'use client'
import { useState, useCallback } from 'react'
import { splitName } from '@/lib/names'

export type GamePlayer = {
  id: string
  name: string
  club: string
  grade: string
  tier: string
  photoUrl: string | null
  stats: Record<string, number>
}

const GOLD = '#E8C15A'
const GREEN = '#3FBF63'
const RED = '#FF6B6B'

const TIER_ACCENT: Record<string, string> = {
  rare_2wp_a: '#FFD700', rare_2wp_b: '#E8C15A', elite: '#1D3FBE', common: '#2D9E4E',
}

/* Hitting stats only. Each carries its own wording so the question reads
   naturally rather than "higher season_sb". */
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
    return <p className="text-sm text-center text-white/60" style={{ paddingTop: '40px' }}>
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
    return <>{s.first} <span className="uppercase">{s.last}</span></>
  }

  function Card({ p, side }: { p: GamePlayer; side: 'left' | 'right' }) {
    const accent = TIER_ACCENT[p.tier] ?? TIER_ACCENT.common
    const isPicked = picked === side
    const shown = picked !== null
    return (
      <button onClick={() => choose(side)} disabled={picked !== null || over}
        className="flex-1 rounded-2xl overflow-hidden transition-all disabled:cursor-default"
        style={{
          background: '#121215',
          border: `2px solid ${shown && isPicked ? (correct ? GREEN : RED) : accent + '45'}`,
          boxShadow: shown && isPicked ? `0 0 26px ${(correct ? GREEN : RED)}45` : `0 0 18px ${accent}12`,
        }}>
        <div className="relative flex items-end justify-center overflow-hidden" style={{ height: '150px', background: `linear-gradient(180deg, ${accent}22 0%, #121215 90%)` }}>
          {p.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photoUrl} alt="" style={{ height: '96%', width: 'auto', objectFit: 'contain', objectPosition: 'bottom' }} />
          ) : (
            <svg width="60" height="80" viewBox="0 0 60 80" fill="none" style={{ marginBottom: '6px' }}>
              <circle cx="30" cy="22" r="13" fill={`${accent}70`} />
              <path d="M6 80 C6 52 54 52 54 80 Z" fill={`${accent}70`} />
            </svg>
          )}
        </div>
        <div className="text-center" style={{ padding: '16px 14px 20px' }}>
          <p className="text-sm font-black text-white leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>{caps(p.name)}</p>
          <p className="text-[10px] mt-1" style={{ color: '#ffffff55' }}>{p.club} · {p.grade}</p>
          <div style={{ minHeight: '52px', marginTop: '12px' }}>
            {shown ? (
              <>
                <p className="text-3xl font-black leading-none" style={{ fontFamily: 'var(--font-heading)', color: accent }}>{fmt(val(p))}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: '#ffffff45', marginTop: '4px' }}>{round!.stat.label}</p>
              </>
            ) : (
              <span className="inline-block rounded-full text-[10px] font-black uppercase tracking-[0.25em]"
                style={{ color: accent, border: `1px solid ${accent}50`, padding: '10px 20px' }}>
                Pick this one
              </span>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <>
      <div className="text-center" style={{ marginBottom: '26px' }}>
        <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#4D9BFF' }}>Higher or Lower</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Who has <span style={{ color: GOLD }}>{round.stat.question}</span>?
        </h1>
        <div className="flex items-center justify-center gap-6" style={{ marginTop: '14px' }}>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#ffffff55' }}>
            Streak <b style={{ color: 'white' }}>{streak}</b>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#ffffff55' }}>
            Best <b style={{ color: GOLD }}>{best}</b>
          </span>
        </div>
      </div>

      {over ? (
        <div className="rounded-2xl text-center"
          style={{ background: `linear-gradient(180deg, ${RED}18 0%, #121215 100%)`, border: `2px solid ${RED}60`, padding: '40px 24px' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: RED, marginBottom: '12px' }}>Run over</p>
          <p className="text-5xl font-black text-white leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{streak}</p>
          <p className="text-xs uppercase tracking-widest" style={{ color: '#ffffff55', marginTop: '8px' }}>in a row</p>
          <button onClick={restart}
            className="text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
            style={{ color: '#0D0D0F', background: GOLD, padding: '15px 34px', marginTop: '26px' }}>
            Go again
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-3 sm:gap-4 items-stretch">
            <Card p={round.left} side="left" />
            <Card p={round.right} side="right" />
          </div>
          <p className="text-[11px] text-center" style={{ color: '#ffffff40', marginTop: '18px' }}>
            The stat changes every round. A tie counts as correct.
          </p>
        </>
      )}
    </>
  )
}