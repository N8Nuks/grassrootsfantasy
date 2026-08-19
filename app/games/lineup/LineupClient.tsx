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
const TIER_ACCENT: Record<string, string> = {
  rare_2wp_a: '#FFD700', rare_2wp_b: '#E8C15A', elite: '#1D3FBE', common: '#2D9E4E',
}

const GOLD = '#E8C15A'
const GREEN = '#3FBF63'

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
    return <>{s.first} <span className="uppercase">{s.last}</span></>
  }
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

  const bench = cards.filter(c => !usedIds.has(c.id))

  return (
    <>
      <div className="text-center" style={{ marginBottom: '26px' }}>
        <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#3FBF63' }}>The Perfect Card</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Sixteen cards. Twelve slots.
        </h1>
        <p className="text-sm text-white/65 leading-relaxed" style={{ maxWidth: '420px', margin: '0 auto' }}>
          These players really played in {grade} Round {roundNumber}. Fill every slot for the highest
          score you can — then see how close you got.
        </p>
      </div>

      {/* The card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#121215', border: '1px solid #ffffff12', marginBottom: '20px' }}>
        {SLOTS.map(s => {
          const c = assign[s] ? cardById.get(assign[s])! : null
          const bestC = done && best?.[s] ? cardById.get(best[s])! : null
          const same = done && bestC && c && bestC.id === c.id
          return (
            <div key={s} style={{ borderBottom: '1px solid #ffffff08' }}>
              <button onClick={() => !done && setPicking(picking === s ? null : s)} disabled={done}
                className="w-full flex items-center gap-3 text-left transition-colors hover:bg-white/5 disabled:hover:bg-transparent"
                style={{ padding: '13px 18px' }}>
                <span className="w-12 shrink-0">
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded" style={{ color: '#0D0D0F', background: GOLD }}>
                    {SLOT_LABELS[s]}
                  </span>
                </span>
                <span className="flex-1 min-w-0">
                  {c ? (
                    <>
                      <span className="block text-sm font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{caps(c.name)}</span>
                      <span className="block text-[10px]" style={{ color: '#ffffff50' }}>
                        {c.club}{SLOT_NOTES[s] ? ` · ${SLOT_NOTES[s]}` : ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm" style={{ color: '#ffffff40' }}>
                      Empty — tap to fill{SLOT_NOTES[s] ? ` · ${SLOT_NOTES[s]}` : ''}
                    </span>
                  )}
                </span>
                {done && c && (
                  <span className="text-sm font-black shrink-0" style={{ fontFamily: 'var(--font-heading)', color: same ? GREEN : 'white' }}>
                    {fmt(c.worth[s] ?? 0)}
                  </span>
                )}
              </button>

              {/* Reveal what the solve put here, when it differs */}
              {done && bestC && !same && (
                <div className="flex items-center gap-3" style={{ background: `${GREEN}10`, padding: '9px 18px 11px 78px' }}>
                  <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: GREEN }}>Best</span>
                  <span className="flex-1 text-xs font-bold text-white/80">{caps(bestC.name)}</span>
                  <span className="text-xs font-black" style={{ color: GREEN }}>{fmt(bestC.worth[s] ?? 0)}</span>
                </div>
              )}

              {/* Picker */}
              {picking === s && !done && (
                <div style={{ background: '#0D0D10', borderTop: '1px solid #ffffff08' }}>
                  {cards.filter(c2 => c2.worth[s] != null).map(c2 => {
                    const inUse = usedIds.has(c2.id) && assign[s] !== c2.id
                    const accent = TIER_ACCENT[c2.tier] ?? TIER_ACCENT.common
                    return (
                      <button key={c2.id} onClick={() => place(s, c2.id)}
                        className="w-full flex items-center gap-3 text-left transition-colors hover:bg-white/5"
                        style={{ padding: '11px 18px 11px 78px', opacity: inUse ? 0.4 : 1 }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                        <span className="flex-1 text-xs font-bold text-white">{caps(c2.name)}</span>
                        {inUse && <span className="text-[9px] uppercase tracking-widest" style={{ color: '#ffffff45' }}>in use</span>}
                      </button>
                    )
                  })}
                  {assign[s] && (
                    <button onClick={() => clear(s)} className="w-full text-left text-xs"
                      style={{ color: '#FF6B6B', padding: '11px 18px 13px 78px' }}>Clear this slot</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Cards not yet used */}
      {!done && bench.length > 0 && (
        <>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#ffffff45', marginBottom: '10px' }}>
            Not placed · {bench.length}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: '24px' }}>
            {bench.map(c => (
              <span key={c.id} className="text-[11px] font-bold rounded-full"
                style={{ color: 'white', background: '#ffffff08', border: `1px solid ${TIER_ACCENT[c.tier] ?? TIER_ACCENT.common}40`, padding: '7px 13px' }}>
                {caps(c.name)}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Submit / result */}
      {!done ? (
        <div className="text-center">
          <button onClick={() => setDone(true)} disabled={filled < SLOTS.length}
            className="text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02] disabled:opacity-35"
            style={{ color: '#0D0D0F', background: GOLD, padding: '17px 42px' }}>
            {filled < SLOTS.length ? `${SLOTS.length - filled} slot${SLOTS.length - filled === 1 ? '' : 's'} to fill` : 'Lock it in'}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl text-center"
          style={{ background: `linear-gradient(180deg, ${GOLD}18 0%, #121215 100%)`, border: `2px solid ${GOLD}60`, padding: '34px 24px' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: GOLD, marginBottom: '14px' }}>Your card</p>
          <p className="text-5xl font-black text-white leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(yourScore)}</p>
          <p className="text-sm" style={{ color: '#ffffff70', marginTop: '14px' }}>
            The best we found was <b style={{ color: GREEN }}>{fmt(bestScore)}</b>
          </p>
          <p className="text-3xl font-black" style={{ fontFamily: 'var(--font-heading)', color: pct >= 95 ? GREEN : GOLD, marginTop: '10px' }}>
            {pct}%
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#ffffff55', maxWidth: '340px', margin: '16px auto 0' }}>
            {pct >= 98 ? 'Just about perfect. You would not have left much out there.'
              : pct >= 90 ? 'Strong card. A slot or two away from the best of it.'
              : pct >= 75 ? 'Solid, but there were points sitting in your hand.'
              : 'Plenty left on the table — check the green rows for where.'}
          </p>
          <p className="text-[11px]" style={{ color: '#ffffff35', marginTop: '18px' }}>
            A new hand when the next round is scored.
          </p>
        </div>
      )}
    </>
  )
}