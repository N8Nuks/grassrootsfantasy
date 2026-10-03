'use client'
import { useEffect, useState } from 'react'
import { splitName } from '@/lib/names'

export type MilestoneEntry = { name: string; stat: string; milestone: number; round: number }

const STAT_WORD: Record<string, string> = {
  games: 'games', hits: 'hits', hr: 'home runs', rbi: 'RBI', k_pit: 'strikeouts', sb: 'stolen bases',
}

/* Milestones Achieved This Season — a panel on the Book of Records that opens a
   popout listing every career mark reached this season, grouped by round with
   the newest round first. Styled with the page's own bk-* classes. */
export default function MilestonesPopout({ entries }: { entries: MilestoneEntry[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const rounds = Array.from(new Set(entries.map(e => e.round))).sort((a, b) => b - a)
  const latest = rounds[0]

  return (
    <>
      <div style={{ marginTop: '34px' }}>
        <div className="bk-banner">
          <h2 className="bk-gold">Milestones Achieved This Season</h2>
          <div className="bk-div"><span /><i className="bk-gem" /><span /></div>
        </div>
        <div className="bk-frame" style={{ textAlign: 'center', padding: '22px 20px' }}>
          {entries.length === 0 ? (
            <p className="bk-empty" style={{ padding: 0 }}>
              None yet this season. They appear here as each round is scored.
            </p>
          ) : (
            <>
              <p className="bk-name" style={{ margin: '0 0 4px' }}>{entries.length} so far</p>
              <p className="bk-sofar" style={{ marginBottom: '16px' }}>Latest in round {latest}</p>
              <button type="button" className="bk-open" onClick={() => setOpen(true)}>View all</button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Milestones achieved this season"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, background: '#000000CC',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: 'calc(env(safe-area-inset-top, 0px) + 84px) 14px 24px',
            overflowY: 'auto',
          }}>
          <div className="bk-frame" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '560px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #C9A24733' }}>
              <h2 className="bk-gold" style={{ margin: 0, fontSize: '17px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Milestones Achieved This Season
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                style={{ background: 'none', border: 0, color: '#C9B98A', fontSize: '26px', lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
                ×
              </button>
            </div>
            <div style={{ maxHeight: '64vh', overflowY: 'auto' }}>
              {rounds.map(r => (
                <div key={r}>
                  <p style={{ margin: 0, padding: '14px 20px 4px', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C9A247' }}>
                    Round {r}
                  </p>
                  {entries.filter(e => e.round === r).map((e, i) => (
                    <div key={i} className="bk-row" style={{ padding: '10px 20px' }}>
                      <span className="bk-who">
                        <p className="bk-name" style={{ margin: 0 }}>
                          {splitName(e.name).first} <span className="bk-sur">{splitName(e.name).last}</span>
                        </p>
                      </span>
                      <span className="bk-mark">
                        <b>{e.milestone}</b>
                        <span>{STAT_WORD[e.stat] ?? e.stat}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}