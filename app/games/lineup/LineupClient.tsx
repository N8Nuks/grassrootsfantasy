'use client'
import { useState, useMemo } from 'react'
import { splitName } from '@/lib/names'

export type PuzzleCard = {
  id: string
  name: string
  club: string
  tier: string
  positions: string[]
  photoUrl: string | null
  worth: Record<string, number>   // slot -> points, only for slots it can legally take
}

const SLOTS = ['P','C','B1','B2','B3','SS','LF','CF','RF','DP','PB','DR']
const SLOT_LABELS: Record<string, string> = {
  P: 'P', C: 'C', B1: '1B', B2: '2B', B3: '3B', SS: 'SS',
  LF: 'LF', CF: 'CF', RF: 'RF', DP: 'DP', PB: 'P(B)', DR: 'DR',
}
const SLOT_NOTES: Record<string, string> = {
  P: 'Batting and pitching', PB: 'Pitching only', DP: 'Offence only', DR: 'Steals only',
}
const BEST = '#00F0FF'

/* A strong solve rather than a proven optimum — every arrangement of sixteen
   cards across twelve slots is far too many to check in a browser. This fills
   the most constrained slot first, then improves by trying every swap until
   nothing gets better, which lands on or very near the best in practice. */
function solve(cards: PuzzleCard[]): Record<string, string> {
  const assign: Record<string, string> = {}
  const used = new Set<string>()
  const bySlot = (s: string) => cards.filter(c => c.worth[s] != null && !used.has(c.id))

  const order = [...SLOTS].sort((a, b) => bySlot(a).length - bySlot(b).length)
  for (const s of order) {
    const best = bySlot(s).sort((a, b) => (b.worth[s] ?? 0) - (a.worth[s] ?? 0))[0]
    if (best) { assign[s] = best.id; used.add(best.id) }
  }

  const total = (a: Record<string, string>) =>
    SLOTS.reduce((sum, s) => sum + (a[s] ? (cards.find(c => c.id === a[s])!.worth[s] ?? 0) : 0), 0)

  let improved = true
  while (improved) {
    improved = false
    for (const s of SLOTS) {
      for (const c of cards) {
        if (c.worth[s] == null) continue
        if (assign[s] === c.id) continue
        const next = { ...assign }
        const heldSlot = SLOTS.find(x => next[x] === c.id)
        const displaced = next[s]
        next[s] = c.id
        if (heldSlot) {
          if (displaced && cards.find(x => x.id === displaced)!.worth[heldSlot] != null) next[heldSlot] = displaced
          else delete next[heldSlot]
        }
        if (total(next) > total(assign)) {
          for (const k of Object.keys(assign)) delete assign[k]
          Object.assign(assign, next)
          improved = true
        }
      }
    }
  }
  return assign
}

export default function LineupClient({ cards, roundNumber, grade, nextDealHref }: {
  cards: PuzzleCard[]; roundNumber: number; grade: string; nextDealHref: string
}) {
  const [assign, setAssign] = useState<Record<string, string>>({})
  const [picking, setPicking] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const cardById = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards])
  const usedIds = new Set(Object.values(assign))
  const filled = SLOTS.filter(s => assign[s]).length

  const yourScore = SLOTS.reduce((sum, s) =>
    sum + (assign[s] ? (cardById.get(assign[s])!.worth[s] ?? 0) : 0), 0)
  const best = useMemo(() => (done ? solve(cards) : null), [done, cards])
  const bestScore = best
    ? SLOTS.reduce((sum, s) => sum + (best[s] ? (cardById.get(best[s])!.worth[s] ?? 0) : 0), 0)
    : 0
  const pct = bestScore > 0 ? Math.round((yourScore / bestScore) * 100) : 0

  function place(slot: string, cardId: string) {
    setAssign(prev => {
      const next = { ...prev }
      const heldSlot = SLOTS.find(s => next[s] === cardId)
      if (heldSlot) delete next[heldSlot]
      next[slot] = cardId
      return next
    })
    setPicking(null)
  }

  function clear(slot: string) {
    setAssign(prev => { const n = { ...prev }; delete n[slot]; return n })
    setPicking(null)
  }

  const caps = (n: string) => {
    const s = splitName(n)
    return <>{s.first} <span style={{ textTransform: 'uppercase' }}>{s.last}</span></>
  }
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

  const bench = cards.filter(c => !usedIds.has(c.id))

  return (
    <>
      <style>{`
        .lp-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 24px; }
        .lp-row { border-bottom: 1px solid #ffffff0a; }
        .lp-row:last-child { border-bottom: none; }
        .lp-slot {
          width: 100%; display: flex; align-items: center; gap: 14px; text-align: left;
          background: transparent; border: none; cursor: pointer; padding: 13px 18px;
          transition: background 140ms ease;
        }
        .lp-slot:hover:not(:disabled) { background: #ffffff06; }
        .lp-slot:disabled { cursor: default; }
        .lp-tag {
          width: 46px; flex-shrink: 0; font-family: var(--font-heading); font-weight: 900;
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; text-align: center;
          color: #05060A; background: var(--neon); padding: 5px 0; transform: skewX(-9deg);
        }
        .lp-nm { font-family: var(--font-heading); font-weight: 900; font-size: 14px; color: #F5F1E8; display: block; line-height: 1.2; }
        .lp-meta { font-size: 10px; color: #5C6878; display: block; margin-top: 3px; }
        .lp-empty { font-size: 12px; color: #4E5A6A; }
        .lp-pts { font-family: var(--font-heading); font-weight: 900; font-size: 16px; color: #F5F1E8; flex-shrink: 0; }

        .lp-best { display: flex; align-items: center; gap: 12px; padding: 9px 18px 11px 78px; background: ${BEST}0F; }
        .lp-best-k { font-size: 9px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: ${BEST}; flex-shrink: 0; }
        .lp-best-n { flex: 1; font-size: 12px; font-weight: 700; color: #B8C4D2; }
        .lp-best-p { font-family: var(--font-heading); font-weight: 900; font-size: 13px; color: ${BEST}; }

        .lp-pick { background: #04050A; border-top: 1px solid #ffffff0a; }
        .lp-opt {
          width: 100%; display: flex; align-items: center; gap: 10px; text-align: left;
          background: transparent; border: none; cursor: pointer; padding: 11px 18px 11px 78px;
          font-size: 12px; font-weight: 700; color: #F5F1E8;
        }
        .lp-opt:hover { background: #ffffff07; }
        .lp-dot { width: 6px; height: 6px; flex-shrink: 0; background: var(--neon); }
        .lp-inuse { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #4E5A6A; }

        .lp-benchlbl { font-size: 9px; font-weight: 900; letter-spacing: 0.3em; text-transform: uppercase; color: #4E5A6A; margin: 22px 0 10px; }
        .lp-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 24px; }
        .lp-chip {
          font-size: 11px; font-weight: 700; color: #B8C4D2; padding: 7px 12px;
          border: 1px solid #ffffff14; background: #ffffff05;
        }
        .lp-result { text-align: center; padding: 34px 24px; }
        .lp-big { font-family: var(--font-heading); font-weight: 900; font-size: 62px; line-height: 1; color: #F5F1E8; }
        .lp-pct { font-family: var(--font-heading); font-weight: 900; font-size: 40px; line-height: 1; margin-top: 12px; }
      `}</style>

      <p className="lp-lede">
        These players really played in {grade} Round {roundNumber}. Fill every slot for the highest score
        you can — then see how close you got.
      </p>

      <div className="ar-panel" style={{ marginBottom: '20px' }}>
        {SLOTS.map(s => {
          const c = assign[s] ? cardById.get(assign[s])! : null
          const bestC = done && best?.[s] ? cardById.get(best[s])! : null
          const same = done && bestC && c && bestC.id === c.id
          return (
            <div key={s} className="lp-row">
              <button className="lp-slot" onClick={() => !done && setPicking(picking === s ? null : s)} disabled={done}>
                <span className="lp-tag">{SLOT_LABELS[s]}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {c ? (
                    <>
                      <span className="lp-nm">{caps(c.name)}</span>
                      <span className="lp-meta">{c.club}{SLOT_NOTES[s] ? ` · ${SLOT_NOTES[s]}` : ''}</span>
                    </>
                  ) : (
                    <span className="lp-empty">Tap to fill{SLOT_NOTES[s] ? ` · ${SLOT_NOTES[s]}` : ''}</span>
                  )}
                </span>
                {done && c && (
                  <span className="lp-pts" style={same ? { color: BEST } : undefined}>{fmt(c.worth[s] ?? 0)}</span>
                )}
              </button>

              {done && bestC && !same && (
                <div className="lp-best">
                  <span className="lp-best-k">Best</span>
                  <span className="lp-best-n">{caps(bestC.name)}</span>
                  <span className="lp-best-p">{fmt(bestC.worth[s] ?? 0)}</span>
                </div>
              )}

              {picking === s && !done && (
                <div className="lp-pick">
                  {cards.filter(c2 => c2.worth[s] != null).map(c2 => {
                    const inUse = usedIds.has(c2.id) && assign[s] !== c2.id
                    return (
                      <button key={c2.id} className="lp-opt" onClick={() => place(s, c2.id)}
                        style={{ opacity: inUse ? 0.42 : 1 }}>
                        <span className="lp-dot" />
                        <span style={{ flex: 1 }}>{caps(c2.name)}</span>
                        {inUse && <span className="lp-inuse">in use</span>}
                      </button>
                    )
                  })}
                  {assign[s] && (
                    <button className="lp-opt" onClick={() => clear(s)} style={{ color: '#FF4D4D' }}>
                      <span style={{ flex: 1 }}>Clear this slot</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!done && bench.length > 0 && (
        <>
          <p className="lp-benchlbl">Not placed · {bench.length}</p>
          <div className="lp-chips">
            {bench.map(c => <span key={c.id} className="lp-chip">{caps(c.name)}</span>)}
          </div>
        </>
      )}

      {!done ? (
        <div style={{ textAlign: 'center' }}>
          <button className="ar-btn" onClick={() => setDone(true)} disabled={filled < SLOTS.length}>
            <span>{filled < SLOTS.length ? `${SLOTS.length - filled} to fill` : 'Lock it in'}</span>
          </button>
        </div>
      ) : (
        <div className="ar-panel lp-result">
          <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--neon)' }}>Your card</p>
          <p className="lp-big" style={{ marginTop: '14px' }}>{fmt(yourScore)}</p>
          <p style={{ fontSize: '12px', color: '#7D8B9C', marginTop: '14px' }}>
            The best we found was <b style={{ color: BEST }}>{fmt(bestScore)}</b>
          </p>
          <p className="lp-pct" style={{ color: pct >= 95 ? BEST : 'var(--neon)' }}>{pct}%</p>
          <p style={{ fontSize: '12px', lineHeight: 1.6, color: '#5C6878', maxWidth: '34ch', margin: '16px auto 0' }}>
            {pct >= 98 ? 'Just about perfect. You would not have left much out there.'
              : pct >= 90 ? 'Strong card. A slot or two away from the best of it.'
              : pct >= 75 ? 'Solid, but there were points sitting in your hand.'
              : 'Plenty left on the table — check the cyan rows for where.'}
          </p>
          <a href={nextDealHref} className="ar-btn" style={{ marginTop: '26px' }}><span>Deal a new hand</span></a>
        </div>
      )}
    </>
  )
}