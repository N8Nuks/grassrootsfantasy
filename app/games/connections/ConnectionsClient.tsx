'use client'
import { useState } from 'react'
import { splitName } from '@/lib/names'

export type Group = { label: string; names: string[] }

const BANDS = ['#39FF9E', '#7DF9FF', '#FFB800', '#FF6B9D']
const MISTAKES = 4

export default function ConnectionsClient({ groups }: { groups: Group[] }) {
  const [tiles, setTiles] = useState<string[]>(() =>
    groups.flatMap(g => g.names).sort(() => Math.random() - 0.5))
  const [selected, setSelected] = useState<string[]>([])
  const [solved, setSolved] = useState<{ label: string; names: string[]; band: number }[]>([])
  const [wrong, setWrong] = useState(0)
  const [shake, setShake] = useState(false)
  const [note, setNote] = useState('')

  const done = solved.length === 4 || wrong >= MISTAKES

  function tap(name: string) {
    if (done) return
    setSelected(s => s.includes(name) ? s.filter(x => x !== name)
      : s.length < 4 ? [...s, name] : s)
  }

  function submit() {
    if (selected.length !== 4 || done) return
    const idx = groups.findIndex(g => selected.every(n => g.names.includes(n)))
    if (idx >= 0) {
      setSolved(s => [...s, { label: groups[idx].label, names: groups[idx].names, band: idx }])
      setTiles(t => t.filter(n => !selected.includes(n)))
      setSelected([])
      return
    }
    /* One away is the tell that keeps people playing — three of the four belong
       together. It never says which one is wrong, and the miss still costs a life. */
    const near = groups.some(g => selected.filter(n => g.names.includes(n)).length === 3)
    if (near) {
      setNote('One away…')
      setTimeout(() => setNote(''), 2600)
    }
    setShake(true)
    setTimeout(() => setShake(false), 420)
    setWrong(w => w + 1)
    setSelected([])
  }

  function giveUp() {
    const remaining = groups.filter(g => !solved.some(s => s.label === g.label))
    setSolved(s => [...s, ...remaining.map(g => ({
      label: g.label, names: g.names, band: groups.indexOf(g),
    }))])
    setTiles([])
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span style={{ textTransform: 'uppercase' }}>{s.last}</span></>
  }

  // Reveal the rest when the mistakes run out
  if (wrong >= MISTAKES && tiles.length > 0) giveUp()

  return (
    <>
      <style>{`
        .cn-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .cn-solved { margin-bottom: 9px; padding: 15px 16px; text-align: center; }
        .cn-lbl { font-size: 10px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #05060A; }
        .cn-mem { font-family: var(--font-heading); font-weight: 900; font-size: 13px; color: #05060A; margin-top: 6px; line-height: 1.4; }
        .cn-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
        .cn-tile {
          aspect-ratio: 1; display: flex; align-items: center; justify-content: center; text-align: center;
          padding: 4px; cursor: pointer; background: #10141F; border: 1px solid #ffffff14;
          font-family: var(--font-heading); font-weight: 900; line-height: 1.15;
          font-size: clamp(8px, 2.3vw, 12px); color: #F5F1E8; word-break: break-word;
          transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
        }
        .cn-tile:hover:not(:disabled) { border-color: #ffffff35; }
        .cn-tile[data-on="true"] { background: var(--neon); color: #05060A; border-color: var(--neon); transform: scale(0.96); }
        .cn-shake { animation: cn-shake 400ms ease; }
        @keyframes cn-shake { 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }

        .cn-bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 20px; flex-wrap: wrap; }
        .cn-lives { display: flex; align-items: center; gap: 7px; }
        .cn-lives span { font-size: 9px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6878; }
        .cn-pip { width: 11px; height: 11px; border-radius: 50%; background: var(--neon); }
        .cn-pip[data-gone="true"] { background: #ffffff14; }
        .cn-toast {
          position: fixed; left: 50%; bottom: 42px; transform: translateX(-50%);
          background: #F5F1E8; color: #05060A; z-index: 50;
          font-family: var(--font-heading); font-weight: 900; font-size: 14px;
          letter-spacing: .06em; padding: 13px 26px; white-space: nowrap;
          box-shadow: 0 10px 30px #00000090;
          animation: cn-toast 2.6s ease forwards;
        }
        @keyframes cn-toast {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          8%, 88% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
        }
        .cn-end { text-align: center; padding: 28px 22px; margin-top: 20px; }
      `}</style>

      <p className="cn-lede">
        Sixteen NFS players, four hidden fours. Find a group and lock it in — four wrong guesses and
        the board opens up.
      </p>

      {solved.map(s => (
        <div key={s.label} className="cn-solved" style={{ background: BANDS[s.band % BANDS.length] }}>
          <p className="cn-lbl">{s.label}</p>
          <p className="cn-mem">{s.names.map(n => splitName(n).last).join(' · ')}</p>
        </div>
      ))}

      {tiles.length > 0 && (
        <div className={'cn-grid' + (shake ? ' cn-shake' : '')}>
          {tiles.map(n => (
            <button key={n} className="cn-tile" data-on={selected.includes(n)}
              onClick={() => tap(n)} disabled={done}>
              {caps(n)}
            </button>
          ))}
        </div>
      )}

      {note && <div className="cn-toast">{note}</div>}

      {!done && (
        <div className="cn-bar">
          <span className="cn-lives">
            <span>Mistakes left</span>
            {Array.from({ length: MISTAKES }).map((_, i) => (
              <span key={i} className="cn-pip" data-gone={i < wrong} />
            ))}
          </span>
          <button className="ar-btn" onClick={submit} disabled={selected.length !== 4}>
            <span>Lock it in</span>
          </button>
        </div>
      )}

      {done && (
        <div className="ar-panel cn-end">
          <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase',
                      color: wrong < MISTAKES ? '#39FF9E' : '#FF4D4D' }}>
            {wrong < MISTAKES ? `Solved with ${MISTAKES - wrong} to spare` : 'Board opened'}
          </p>
          <p style={{ fontSize: '12px', color: '#7D8B9C', marginTop: '14px' }}>
            A new sixteen at midnight.
          </p>
        </div>
      )}
    </>
  )
}