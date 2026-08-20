'use client'
import { useState, useCallback } from 'react'
import { splitName } from '@/lib/names'

export type SeasonCard = {
  season: string
  rows: { grade: string; award: string; name: string }[]
}

const WIN = '#C6FF00'
const LOSE = '#FF4D4D'
const CLUES = 4          // award lines revealed, one at a time
const OPTIONS = 4        // seasons to choose between

export default function SeasonClient({ cards }: { cards: SeasonCard[] }) {
  const draw = useCallback(() => {
    const card = cards[Math.floor(Math.random() * cards.length)]
    // Decoys from nearby seasons — a decade apart would be too easy
    const others = cards.filter(c => c.season !== card.season)
      .sort((a, b) => Math.abs(parseInt(a.season) - parseInt(card.season)) - Math.abs(parseInt(b.season) - parseInt(card.season)))
      .slice(0, 8)
      .sort(() => Math.random() - 0.5)
      .slice(0, OPTIONS - 1)
    const opts = [card, ...others].map(c => c.season).sort(() => Math.random() - 0.5)
    const rows = [...card.rows].sort(() => Math.random() - 0.5).slice(0, CLUES)
    return { answer: card.season, rows, opts }
  }, [cards])

  const [round, setRound] = useState(() => draw())
  const [shown, setShown] = useState(1)
  const [picked, setPicked] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)

  const correct = picked === null ? null : picked === round.answer
  // Fewer clues used, more it's worth
  const value = [30, 20, 12, 6][shown - 1] ?? 6

  function guess(season: string) {
    if (picked) return
    setPicked(season)
    if (season === round.answer) {
      const next = streak + 1
      setStreak(next)
      if (next > best) setBest(next)
    } else {
      setStreak(0)
    }
  }

  function nextRound() {
    setRound(draw()); setShown(1); setPicked(null)
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span style={{ textTransform: 'uppercase' }}>{s.last}</span></>
  }

  return (
    <>
      <style>{`
        .gs-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .gs-hud { display: flex; gap: 22px; align-items: baseline; margin-bottom: 18px; flex-wrap: wrap; }
        .gs-hud span { font-size: 9px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6878; }
        .gs-hud b { font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-left: 7px; }

        .gs-row { display: flex; align-items: baseline; gap: 14px; padding: 15px 20px; border-bottom: 1px solid #ffffff0a; }
        .gs-row:last-child { border-bottom: none; }
        .gs-award { flex: 0 0 40%; font-size: 9px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; color: var(--neon); }
        .gs-who { flex: 1; font-family: var(--font-heading); font-weight: 900; font-size: 15px; color: #F5F1E8; text-align: right; line-height: 1.2; }
        .gs-grade { font-size: 9px; color: #4E5A6A; display: block; margin-top: 3px; letter-spacing: 0.14em; text-transform: uppercase; }
        .gs-in { animation: gs-in 300ms ease; }
        @keyframes gs-in { from { opacity: 0; transform: translateY(-6px); } }

        .gs-more {
          width: 100%; background: transparent; border: none; border-top: 1px dashed #ffffff18;
          cursor: pointer; padding: 14px; font-size: 10px; font-weight: 900;
          letter-spacing: 0.26em; text-transform: uppercase; color: #64748B;
        }
        .gs-more:hover { color: var(--neon); }

        .gs-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 20px; }
        .gs-opt {
          cursor: pointer; padding: 17px 8px; background: #07080D;
          border: 1px solid color-mix(in srgb, var(--neon) 30%, transparent);
          font-family: var(--font-heading); font-weight: 900; font-size: 17px; color: #F5F1E8;
          letter-spacing: 0.02em; transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
        }
        .gs-opt:hover:not(:disabled) { transform: translateY(-3px); border-color: var(--neon); }
        .gs-opt:disabled { cursor: default; }
        .gs-opt[data-state="right"] { border-color: ${WIN}; background: ${WIN}18; color: ${WIN}; }
        .gs-opt[data-state="wrong"] { border-color: ${LOSE}; background: ${LOSE}15; color: ${LOSE}; }
        .gs-opt[data-state="dim"] { opacity: 0.35; }

        .gs-after { text-align: center; margin-top: 20px; }
        .gs-verdict { font-size: 10px; font-weight: 900; letter-spacing: 0.34em; text-transform: uppercase; }
      `}</style>

      <p className="gs-lede">
        Four award winners from one NFS season. Name the year — the fewer clues you take, the more
        it&apos;s worth.
      </p>

      <div className="gs-hud">
        <span>Streak <b>{streak}</b></span>
        <span>Best <b style={{ color: 'var(--neon)' }}>{best}</b></span>
        <span>Worth <b style={{ color: picked ? '#5C6878' : 'var(--neon)' }}>{value}</b></span>
      </div>

      <div className="ar-panel">
        {round.rows.slice(0, shown).map((r, i) => (
          <div key={i} className={'gs-row' + (i === shown - 1 ? ' gs-in' : '')}>
            <span className="gs-award">{r.award}</span>
            <span className="gs-who">
              {caps(r.name)}
              <span className="gs-grade">{r.grade}</span>
            </span>
          </div>
        ))}
        {shown < round.rows.length && !picked && (
          <button className="gs-more" onClick={() => setShown(s => s + 1)}>
            Another clue · drops to {[30, 20, 12, 6][shown] ?? 6}
          </button>
        )}
      </div>

      <div className="gs-opts">
        {round.opts.map(s => {
          const state = !picked ? undefined
            : s === round.answer ? 'right'
            : s === picked ? 'wrong' : 'dim'
          return (
            <button key={s} className="gs-opt" data-state={state}
              onClick={() => guess(s)} disabled={!!picked}>
              {s}
            </button>
          )
        })}
      </div>

      {picked && (
        <div className="gs-after">
          <p className="gs-verdict" style={{ color: correct ? WIN : LOSE }}>
            {correct ? `Right · ${value} points` : `It was ${round.answer}`}
          </p>
          <button className="ar-btn" onClick={nextRound} style={{ marginTop: '16px' }}>
            <span>Next season</span>
          </button>
        </div>
      )}
    </>
  )
}