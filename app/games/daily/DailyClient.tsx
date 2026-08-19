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

const GOLD = '#E8C15A'
const GREEN = '#3FBF63'
const RED = '#FF6B6B'

const MAX_GUESSES = 6

export default function DailyClient({ answer, names }: { answer: DailyPlayer; names: string[] }) {
  const [guesses, setGuesses] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const won = guesses.some(g => g.toLowerCase() === answer.name.toLowerCase())
  const done = won || guesses.length >= MAX_GUESSES

  // A clue unlocks with each wrong guess — the first is free
  const clues: { label: string; value: string }[] = [
    { label: 'Grade', value: answer.grade },
    { label: 'Position', value: answer.positions.map(posLabel).join(' · ') || '—' },
    { label: 'Club', value: answer.club },
    { label: 'Career games', value: answer.gamesBand },
    { label: 'Career bat ave.', value: answer.careerBa ?? 'Not recorded' },
    { label: 'Surname starts with', value: splitName(answer.name).last.charAt(0) || '?' },
  ]
  const unlocked = Math.min(guesses.length + 1, clues.length)

  function submit() {
    if (done) return
    const v = input.trim()
    if (!v) { setError('Type a player name first'); return }
    const match = names.find(n => n.toLowerCase() === v.toLowerCase())
    if (!match) { setError('No NFS player by that name — check the spelling'); return }
    if (guesses.some(g => g.toLowerCase() === match.toLowerCase())) { setError('You have already tried that one'); return }
    setError('')
    setGuesses(prev => [...prev, match])
    setInput('')
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span className="uppercase">{s.last}</span></>
  }

  return (
    <>
      <div className="text-center" style={{ marginBottom: '32px' }}>
        <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>Player of the Day</p>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Who is it?
        </h1>
        <p className="text-sm text-white/65 leading-relaxed" style={{ maxWidth: '400px', margin: '0 auto' }}>
          One NFS player, six guesses. Every miss unlocks another clue. Same player for everyone, all day.
        </p>
      </div>

      {/* Clues */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#121215', border: '1px solid #ffffff12', marginBottom: '22px' }}>
        {clues.map((c, i) => {
          const open = i < unlocked
          return (
            <div key={c.label} className="flex items-center justify-between gap-4"
              style={{ borderBottom: i < clues.length - 1 ? '1px solid #ffffff08' : 'none', padding: '15px 20px' }}>
              <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#ffffff55' }}>{c.label}</span>
              {open ? (
                <span className="text-sm font-black text-white text-right" style={{ fontFamily: 'var(--font-heading)' }}>{c.value}</span>
              ) : (
                <span className="text-sm font-black text-right" style={{ color: '#ffffff25', letterSpacing: '0.2em' }}>·····</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Guess box */}
      {!done && (
        <div style={{ marginBottom: '22px' }}>
          <div className="flex rounded-full overflow-hidden" style={{ border: `1px solid ${GOLD}50` }}>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              list="nfs-players"
              placeholder="Name a player"
              className="flex-1 outline-none font-bold"
              style={{ background: 'transparent', color: 'white', caretColor: 'white', padding: '15px 22px', fontSize: '16px' }}
            />
            <button onClick={submit}
              className="text-xs font-black uppercase tracking-widest transition-all"
              style={{ color: '#0D0D0F', background: GOLD, padding: '15px 26px' }}>
              Guess
            </button>
          </div>
          <datalist id="nfs-players">
            {names.map(n => <option key={n} value={n} />)}
          </datalist>
          {error && <p className="text-xs mt-3 text-center" style={{ color: RED }}>{error}</p>}
          <p className="text-[11px] text-center mt-3" style={{ color: '#ffffff45' }}>
            {MAX_GUESSES - guesses.length} guess{MAX_GUESSES - guesses.length === 1 ? '' : 'es'} left
          </p>
        </div>
      )}

      {/* Guesses so far */}
      {guesses.length > 0 && (
        <div className="flex flex-col gap-2" style={{ marginBottom: '22px' }}>
          {guesses.map((g, i) => {
            const right = g.toLowerCase() === answer.name.toLowerCase()
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl"
                style={{
                  background: right ? `${GREEN}18` : '#ffffff06',
                  border: `1px solid ${right ? GREEN + '60' : '#ffffff12'}`,
                  padding: '13px 18px',
                }}>
                <span className="text-sm font-black" style={{ color: right ? GREEN : '#ffffff40' }}>{right ? '✓' : '✕'}</span>
                <span className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>{caps(g)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Result */}
      {done && (
        <div className="rounded-2xl text-center"
          style={{
            background: `linear-gradient(180deg, ${won ? GREEN : RED}18 0%, #121215 100%)`,
            border: `2px solid ${won ? GREEN : RED}60`,
            padding: '32px 24px',
          }}>
          <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: won ? GREEN : RED, marginBottom: '12px' }}>
            {won ? `Got it in ${guesses.length}` : 'Out of guesses'}
          </p>
          <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{caps(answer.name)}</p>
          <p className="text-xs text-white/60" style={{ marginTop: '8px' }}>
            {answer.club} · {answer.grade} · {answer.gamesBand} career games
          </p>
          <p className="text-sm text-white/65 leading-relaxed" style={{ maxWidth: '340px', margin: '20px auto 0' }}>
            A new player at midnight. Come back tomorrow.
          </p>
        </div>
      )}
    </>
  )
}