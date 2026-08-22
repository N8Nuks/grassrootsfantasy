'use client'
import { useState } from 'react'
import { splitName } from '@/lib/names'

export type DailyPlayer = {
  name: string
  grade: string
  club: string
  positions: string[]
  gamesBand: string
  seasonPoints: number
  careerBa: string | null
}

const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const posLabel = (p: string) => SLOT_LABELS[p] ?? p

const WIN = '#C6FF00'
const LOSE = '#FF4D4D'
const MAX_GUESSES = 6

export default function DailyClient({ answer, names }: { answer: DailyPlayer; names: string[] }) {
  const [guesses, setGuesses] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  /* Suggestions from the first letter — a native datalist shows no marker on a
     phone, so the list is drawn here. Already-guessed names drop out. */
  const q = input.trim().toLowerCase()
  const matches = q.length < 1 ? []
    : names
        .filter(n => {
          const l = n.toLowerCase()
          return l.includes(q) && l !== q && !guesses.some(g => g.toLowerCase() === l)
        })
        .slice(0, 8)
  const showDrop = open && matches.length > 0

  const won = guesses.some(g => g.toLowerCase() === answer.name.toLowerCase())
  const done = won || guesses.length >= MAX_GUESSES

  // A clue unlocks with each wrong guess — the first is free
  const clues: { label: string; value: string }[] = [
    { label: 'Grade', value: answer.grade },
    { label: 'Position', value: answer.positions.map(posLabel).join(' · ') || '—' },
    { label: 'Club', value: answer.club },
    { label: 'Season points', value: String(answer.seasonPoints) },
    { label: 'Career bat ave.', value: answer.careerBa ?? 'Not recorded' },
    { label: 'Surname starts with', value: splitName(answer.name).last.charAt(0) || '?' },
  ]
  const unlocked = Math.min(guesses.length + 1, clues.length)

  function lodge(name: string) {
    if (done) return
    if (guesses.some(g => g.toLowerCase() === name.toLowerCase())) {
      setError('You have already tried that one'); return
    }
    setError('')
    setGuesses(prev => [...prev, name])
    setInput('')
    setOpen(false)
  }

  function submit() {
    if (done) return
    const v = input.trim()
    if (!v) { setError('Type a player name first'); return }
    const match = names.find(n => n.toLowerCase() === v.toLowerCase())
      // A single suggestion left is almost certainly the one meant
      ?? (matches.length === 1 ? matches[0] : undefined)
    if (!match) { setError('Pick a name from the list'); return }
    lodge(match)
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span style={{ textTransform: 'uppercase' }}>{s.last}</span></>
  }

  return (
    <>
      <style>{`
        .dl-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 40ch; margin-bottom: 28px; }
        .dl-clue {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 15px 20px; border-bottom: 1px solid #ffffff0a;
        }
        .dl-clue:last-child { border-bottom: none; }
        .dl-clue-k { font-size: 9px; font-weight: 900; letter-spacing: 0.28em; text-transform: uppercase; color: #5C6878; }
        .dl-clue-v { font-family: var(--font-heading); font-weight: 900; font-size: 15px; color: #F5F1E8; text-align: right; }
        .dl-locked { letter-spacing: 0.3em; color: #ffffff20; font-weight: 900; }
        .dl-open { animation: dl-flick 320ms steps(2); }
        @keyframes dl-flick { 0%,60% { opacity: 0.25; } 61%,100% { opacity: 1; } }

        .dl-wrap { position: relative; }
        .dl-bar { display: flex; align-items: stretch; border: 1px solid color-mix(in srgb, var(--neon) 45%, transparent); background: #07080D; }
        .dl-bar:focus-within { border-color: var(--neon); box-shadow: 0 0 22px color-mix(in srgb, var(--neon) 30%, transparent); }
        .dl-input {
          flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: #F5F1E8;
          font-size: 16px; font-weight: 700; padding: 16px 8px 16px 20px; caret-color: var(--neon);
        }
        .dl-input::placeholder { color: #4E5A6A; }
        /* A marker, so it reads as a list you can open rather than a plain box */
        .dl-caret {
          display: flex; align-items: center; padding: 0 12px; color: var(--neon);
          font-size: 11px; transition: transform 180ms ease; pointer-events: none;
        }
        .dl-caret[data-open="true"] { transform: rotate(180deg); }

        .dl-drop {
          position: absolute; left: 0; right: 0; top: calc(100% - 1px); z-index: 30;
          background: #05060A; border: 1px solid var(--neon);
          max-height: 268px; overflow-y: auto; -webkit-overflow-scrolling: touch;
          box-shadow: 0 18px 40px #000000a0;
        }
        .dl-opt {
          display: block; width: 100%; text-align: left; cursor: pointer;
          background: transparent; border: none; border-bottom: 1px solid #ffffff0a;
          color: #F5F1E8; font-size: 15px; font-weight: 700; padding: 15px 20px;
        }
        .dl-opt:last-child { border-bottom: none; }
        .dl-opt:hover, .dl-opt:active { background: color-mix(in srgb, var(--neon) 20%, transparent); }

        .dl-guess {
          display: flex; align-items: center; gap: 12px; padding: 13px 18px;
          border: 1px solid #ffffff12; background: #ffffff05; margin-bottom: 8px;
        }
        .dl-mark { font-family: var(--font-heading); font-weight: 900; font-size: 15px; }
        .dl-name { font-family: var(--font-heading); font-weight: 900; font-size: 14px; color: #F5F1E8; }
        .dl-left { font-size: 10px; font-weight: 900; letter-spacing: 0.26em; text-transform: uppercase; color: #5C6878; text-align: center; margin-top: 14px; }
        .dl-err { font-size: 11px; color: ${LOSE}; text-align: center; margin-top: 12px; }
        .dl-result { text-align: center; padding: 36px 24px; }
        .dl-verdict { font-size: 10px; font-weight: 900; letter-spacing: 0.34em; text-transform: uppercase; }
        .dl-answer {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(26px, 7vw, 38px); line-height: 1; color: #F5F1E8; margin: 14px 0 10px;
          transform: skewX(-5deg);
        }
      `}</style>

      <p className="dl-lede">
        One NFS player, six guesses. Every miss unlocks another clue. Same player for everyone, all day.
      </p>

      <div className="ar-panel" style={{ marginBottom: '22px' }}>
        {clues.map((c, i) => {
          const isOpen = i < unlocked
          return (
            <div key={c.label} className="dl-clue">
              <span className="dl-clue-k">{c.label}</span>
              {isOpen
                ? <span className="dl-clue-v dl-open">{c.value}</span>
                : <span className="dl-clue-v dl-locked">·····</span>}
            </div>
          )
        })}
      </div>

      {!done && (
        <div style={{ marginBottom: '22px' }}>
          <div className="dl-wrap">
            <div className="dl-bar">
              <input
                className="dl-input"
                value={input}
                onChange={e => { setInput(e.target.value); setError(''); setOpen(true) }}
                onFocus={() => setOpen(true)}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
                placeholder="Start typing a name"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <span className="dl-caret" data-open={showDrop}>▼</span>
              <button className="ar-btn" onClick={submit} style={{ transform: 'none', boxShadow: 'none' }}>
                <span style={{ transform: 'none' }}>Guess</span>
              </button>
            </div>

            {showDrop && (
              <div className="dl-drop">
                {matches.map(n => (
                  // onMouseDown fires before the input loses focus, so the tap lands
                  <button key={n} className="dl-opt" onMouseDown={e => { e.preventDefault(); lodge(n) }}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="dl-err">{error}</p>}
          <p className="dl-left">{MAX_GUESSES - guesses.length} guess{MAX_GUESSES - guesses.length === 1 ? '' : 'es'} left</p>
        </div>
      )}

      {guesses.length > 0 && (
        <div style={{ marginBottom: '22px' }}>
          {guesses.map((g, i) => {
            const right = g.toLowerCase() === answer.name.toLowerCase()
            return (
              <div key={i} className="dl-guess"
                style={right ? { borderColor: WIN, background: `${WIN}12` } : undefined}>
                <span className="dl-mark" style={{ color: right ? WIN : '#3E4A58' }}>{right ? '✓' : '✕'}</span>
                <span className="dl-name">{caps(g)}</span>
              </div>
            )
          })}
        </div>
      )}

      {done && (
        <div className="ar-panel dl-result" style={{ borderColor: won ? WIN : LOSE }}>
          <p className="dl-verdict" style={{ color: won ? WIN : LOSE }}>
            {won ? `Got it in ${guesses.length}` : 'Out of guesses'}
          </p>
          <p className="dl-answer">{caps(answer.name)}</p>
          <p style={{ fontSize: '11px', color: '#7D8B9C', letterSpacing: '0.1em' }}>
            {answer.club} · {answer.grade} · {answer.seasonPoints} season points
          </p>
          <p style={{ fontSize: '12px', color: '#5C6878', marginTop: '22px' }}>
            A new player at midnight.
          </p>
        </div>
      )}
    </>
  )
}