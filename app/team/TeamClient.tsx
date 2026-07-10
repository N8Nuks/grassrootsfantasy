'use client'
import { useState } from 'react'

export type TeamCard = {
  id: string
  name: string
  club: string
  tier: string
  positions: string[]
  stats: Record<string, number>
}

const TIER_META: Record<string, { label: string; accent: string }> = {
  rare_2wp_a: { label: '2WP A', accent: '#FFD700' },
  rare_2wp_b: { label: '2WP B', accent: '#E8C15A' },
  elite: { label: 'ELITE', accent: '#C0C0C0' },
  common: { label: 'COMMON', accent: '#2D9E4E' },
}

const SLOT_LABELS: Record<string, string> = {
  P: 'P', C: 'C', B1: '1B', B2: '2B', B3: '3B', SS: 'SS',
  LF: 'LF', CF: 'CF', RF: 'RF', DP: 'DP', PB: 'P(B)', DR: 'DR',
}

const BATTING_SLOTS = ['P','C','B1','B2','B3','SS','LF','CF','RF','DP']
const NON_BATTING = ['PB','DR']
const BENCH_SLOTS = ['BENCH1','BENCH2','BENCH3','BENCH4']
const RES_SLOTS = ['RES1','RES2','RES3','RES4','RES5']

type SlotState = { slot: string; card_id: string; batting_order: number | null }

function isEligible(card: TeamCard, slot: string): boolean {
  if (slot === 'DP' || slot === 'DR') return true
  if (slot.startsWith('BENCH') || slot.startsWith('RES')) return true
  return card.positions.includes(slot)
}

export default function TeamClient({ teamName, clubName, cards, initialSlots }: {
  teamName: string
  clubName: string
  cards: TeamCard[]
  initialSlots: SlotState[]
}) {
  const [view, setView] = useState<'lineup' | 'collection'>('lineup')
  const [slots, setSlots] = useState<SlotState[]>(() => {
    const withOrder = [...initialSlots]
    let next = 1
    for (const bs of BATTING_SLOTS) {
      const s = withOrder.find(x => x.slot === bs)
      if (s && s.batting_order == null) s.batting_order = next
      if (s?.batting_order != null) next = Math.max(next, s.batting_order + 1)
    }
    return withOrder
  })
  const [swapTarget, setSwapTarget] = useState<number | null>(null)
  const [pickerSlot, setPickerSlot] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sortBy, setSortBy] = useState<'tier' | 'ba' | 'position'>('tier')

  const cardById = new Map(cards.map(c => [c.id, c]))
  const assignedIds = new Set(slots.map(s => s.card_id))
  const battingRows = slots
    .filter(s => BATTING_SLOTS.includes(s.slot))
    .sort((a, b) => (a.batting_order ?? 99) - (b.batting_order ?? 99))

  // ── Batting order swap (tap two numbers) ──
  function swapOrder(order: number) {
    if (swapTarget === null) { setSwapTarget(order); return }
    if (swapTarget === order) { setSwapTarget(null); return }
    setSlots(prev => prev.map(s => {
      if (s.batting_order === swapTarget) return { ...s, batting_order: order }
      if (s.batting_order === order) return { ...s, batting_order: swapTarget }
      return s
    }))
    setSwapTarget(null)
  }

  // ── Slot picker: put a card into a fielding slot ──
  function assignToSlot(slot: string, cardId: string) {
    setSlots(prev => {
      const next = [...prev]
      const target = next.find(s => s.slot === slot)
      const cardCurrent = next.find(s => s.card_id === cardId)

      if (target && cardCurrent && target !== cardCurrent) {
        // Swap the two cards between slots — batting order stays with the SLOT
        const tmp = target.card_id
        target.card_id = cardCurrent.card_id
        cardCurrent.card_id = tmp
      } else if (target && !cardCurrent) {
        // Incoming card was unassigned; outgoing card becomes unassigned
        target.card_id = cardId
      } else if (!target) {
        // Slot was empty (bench/reserve)
        // Remove card from any current slot first
        if (cardCurrent) {
          const idx = next.indexOf(cardCurrent)
          next.splice(idx, 1)
        }
        next.push({ slot, card_id: cardId, batting_order: null })
      }
      return [...next]
    })
    setPickerSlot(null)
  }

  function clearSlot(slot: string) {
    setSlots(prev => prev.filter(s => s.slot !== slot))
    setPickerSlot(null)
  }

  async function save() {
    setSaving(true); setMessage('')
    const res = await fetch('/api/save-lineup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade: 'mens', slots }),
    })
    const data = await res.json()
    setMessage(res.ok ? 'Lineup card saved.' : (data.error ?? 'Save failed'))
    setSaving(false)
  }

  // ── Team stats ──
  function statBlock(cardList: TeamCard[]) {
    const withBA = cardList.filter(c => c.stats.career_ba != null)
    const avg = withBA.length ? withBA.reduce((a, c) => a + Number(c.stats.career_ba), 0) / withBA.length : 0
    const sum = (k: string) => cardList.reduce((a, c) => a + (Number(c.stats[k]) || 0), 0)
    return { avg, hr: sum('career_hr'), rbi: sum('career_rbi'), sb: sum('career_sb') }
  }
  const starterCards = slots
    .filter(s => BATTING_SLOTS.includes(s.slot) || NON_BATTING.includes(s.slot))
    .map(s => cardById.get(s.card_id)).filter(Boolean) as TeamCard[]
  const starterStats = statBlock(starterCards)
  const squadStats = statBlock(cards)

  const sortedCollection = [...cards].sort((a, b) => {
    if (sortBy === 'ba') return (b.stats.career_ba ?? 0) - (a.stats.career_ba ?? 0)
    if (sortBy === 'position') return (a.positions[0] ?? '').localeCompare(b.positions[0] ?? '')
    const order = ['rare_2wp_a','rare_2wp_b','elite','common']
    return order.indexOf(a.tier) - order.indexOf(b.tier)
  })

  // Picker candidates: eligible for the slot, not already in another starter slot (swaps allowed via list anyway)
  const pickerCandidates = pickerSlot
    ? cards.filter(c => isEligible(c, pickerSlot))
    : []

  return (
    <div style={{ maxWidth: "820px", marginLeft: "auto", marginRight: "auto" }}>
      <div className="text-center" style={{ marginBottom: "40px" }}>
        <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#2D9E4E' }}>My Team</p>
        <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{teamName}</h1>
        <p className="text-sm text-[#F5F1E8]/40">{clubName} · {cards.length} cards</p>
      </div>

      <div className="flex justify-center gap-3" style={{ marginBottom: "36px" }}>
        {(['lineup','collection'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className="text-xs font-bold uppercase tracking-widest px-6 py-3 transition-all"
            style={view === v
              ? { color: '#141210', background: '#3FBF63' }
              : { color: '#F5F1E880', border: '1px solid #ffffff20', background: 'transparent' }}>
            {v === 'lineup' ? 'Lineup Card' : 'Collection'}
          </button>
        ))}
      </div>

      {view === 'lineup' && (
        <div>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#181510', border: '1px solid #ffffff12' }}>
            <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-2" style={{ background: '#1A2E1F', borderBottom: '1px solid #ffffff0a' }}>
              <span className="text-xs font-black uppercase tracking-[0.25em] text-[#F5F1E8]">Official Lineup Card</span>
              <span className="text-[10px] text-[#F5F1E8]/40 uppercase tracking-wider">Numbers swap batting order · positions swap players</span>
            </div>

            {battingRows.map(s => {
              const c = cardById.get(s.card_id)
              if (!c) return null
              const meta = TIER_META[c.tier] ?? TIER_META.common
              const selected = swapTarget === s.batting_order
              return (
                <div key={s.slot} className="flex items-center gap-4 px-5 py-3.5" style={{ borderBottom: '1px solid #ffffff08' }}>
                  <button onClick={() => swapOrder(s.batting_order!)}
                    className="w-9 h-9 rounded-full text-sm font-black flex items-center justify-center transition-all"
                    style={selected
                      ? { background: '#39FF6A', color: '#141210', boxShadow: '0 0 12px #39FF6A60' }
                      : { background: '#ffffff10', color: '#F5F1E8' }}>
                    {s.batting_order}
                  </button>
                  <button onClick={() => setPickerSlot(s.slot)}
                    className="w-11 text-xs font-black text-center px-2 py-1 rounded transition-all hover:scale-105"
                    style={{ color: '#141210', background: '#3FBF63' }}>
                    {SLOT_LABELS[s.slot]}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#F5F1E8] truncate" style={{ fontFamily: 'var(--font-heading)' }}>{c.name}</p>
                    <p className="text-[10px] text-[#F5F1E8]/35">{c.club}</p>
                  </div>
                  <span className="text-[9px] font-black tracking-widest px-2 py-1 rounded-full hidden sm:block" style={{ color: meta.accent, background: meta.accent + '15' }}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-[#F5F1E8]/45 hidden sm:block w-16 text-right">
                    BA {c.stats.career_ba != null ? Number(c.stats.career_ba).toFixed(3) : '—'}
                  </span>
                </div>
              )
            })}

            <div className="px-6 py-3" style={{ background: '#141210' }}>
              {NON_BATTING.map(slotName => {
                const s = slots.find(x => x.slot === slotName)
                const c = s ? cardById.get(s.card_id) : null
                return (
                  <div key={slotName} className="flex items-center gap-4 py-2">
                    <span className="w-9" />
                    <button onClick={() => setPickerSlot(slotName)}
                      className="w-11 text-xs font-black text-center px-2 py-1 rounded transition-all hover:scale-105"
                      style={{ color: '#141210', background: '#E8D5A3' }}>
                      {SLOT_LABELS[slotName]}
                    </button>
                    <p className="text-sm text-[#F5F1E8]/70 font-bold">{c?.name ?? 'Tap to select'}</p>
                    <span className="text-[10px] text-[#F5F1E8]/30 uppercase tracking-wider">{slotName === 'PB' ? 'pitching only' : 'runner · SB/CS only'}</span>
                  </div>
                )
              })}
            </div>

            {/* Team stats footer */}
            <div className="px-6 py-5" style={{ background: '#1A2E1F', borderTop: '1px solid #ffffff0a' }}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: '#3FBF63' }}>Starting Card</p>
                  <div className="flex gap-5 text-xs text-[#F5F1E8]/70 flex-wrap">
                    <span>TEAM BA <b className="text-[#F5F1E8]">{starterStats.avg.toFixed(3)}</b></span>
                    <span>HR <b className="text-[#F5F1E8]">{starterStats.hr}</b></span>
                    <span>RBI <b className="text-[#F5F1E8]">{starterStats.rbi}</b></span>
                    <span>SB <b className="text-[#F5F1E8]">{starterStats.sb}</b></span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: '#E8D5A3' }}>Full Squad</p>
                  <div className="flex gap-5 text-xs text-[#F5F1E8]/70 flex-wrap">
                    <span>TEAM BA <b className="text-[#F5F1E8]">{squadStats.avg.toFixed(3)}</b></span>
                    <span>HR <b className="text-[#F5F1E8]">{squadStats.hr}</b></span>
                    <span>RBI <b className="text-[#F5F1E8]">{squadStats.rbi}</b></span>
                    <span>SB <b className="text-[#F5F1E8]">{squadStats.sb}</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bench & reserve — tappable */}
          <div className="grid sm:grid-cols-2 gap-4" style={{ marginTop: "24px" }}>
            <div className="rounded-2xl p-5" style={{ background: '#18151080', border: '1px dashed #ffffff20' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#F5F1E8]/40 mb-3">Bench · 0.75× (4 slots)</p>
              {BENCH_SLOTS.map(b => {
                const s = slots.find(x => x.slot === b)
                const c = s ? cardById.get(s.card_id) : null
                return (
                  <button key={b} onClick={() => setPickerSlot(b)} className="block w-full text-left text-sm py-1.5 hover:text-[#3FBF63] transition-colors"
                    style={{ color: c ? '#F5F1E8' : '#F5F1E830', borderBottom: '1px solid #ffffff08' }}>
                    {c?.name ?? 'Empty — tap to assign'}
                  </button>
                )
              })}
            </div>
            <div className="rounded-2xl p-5" style={{ background: '#18151080', border: '1px dashed #ffffff20' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#F5F1E8]/40 mb-3">Reserve · no score (5 slots)</p>
              {RES_SLOTS.map(r => {
                const s = slots.find(x => x.slot === r)
                const c = s ? cardById.get(s.card_id) : null
                return (
                  <button key={r} onClick={() => setPickerSlot(r)} className="block w-full text-left text-sm py-1.5 hover:text-[#3FBF63] transition-colors"
                    style={{ color: c ? '#F5F1E8' : '#F5F1E830', borderBottom: '1px solid #ffffff08' }}>
                    {c?.name ?? 'Empty — tap to assign'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="text-center" style={{ marginTop: "32px" }}>
            <button onClick={save} disabled={saving}
              className="text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ color: '#39FF6A', border: '1px solid #39FF6A', background: 'transparent', padding: "18px 64px", textShadow: '0 0 12px #39FF6A80', boxShadow: '0 0 16px #39FF6A30, inset 0 0 16px #39FF6A15' }}>
              {saving ? 'Saving…' : 'Save Lineup Card'}
            </button>
            {message && <p className="text-sm mt-4" style={{ color: message.includes('saved') ? '#3FBF63' : '#FF6B6B' }}>{message}</p>}
          </div>
        </div>
      )}

      {view === 'collection' && (
        <div>
          <div className="flex justify-center gap-2 mb-8">
            {(['tier','ba','position'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-all"
                style={sortBy === s ? { color: '#141210', background: '#E8D5A3' } : { color: '#F5F1E860', border: '1px solid #ffffff15' }}>
                {s === 'ba' ? 'Batting Avg' : s}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedCollection.map(c => {
              const meta = TIER_META[c.tier] ?? TIER_META.common
              const inLineup = assignedIds.has(c.id)
              return (
                <div key={c.id} className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: '#181510', border: `1px solid ${meta.accent}30`, opacity: inLineup ? 1 : 0.75 }}>
                  <div className="flex justify-between">
                    <span className="text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full" style={{ color: meta.accent, background: meta.accent + '15' }}>{meta.label}</span>
                    {inLineup && <span className="text-[9px] font-black px-2 py-1 rounded-full" style={{ color: '#141210', background: '#3FBF63' }}>IN LINEUP</span>}
                  </div>
                  <h3 className="text-base font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{c.name}</h3>
                  <p className="text-[10px] text-[#F5F1E8]/35">{c.club} · {c.positions.map(p => SLOT_LABELS[p] ?? p).join(' ')}</p>
                  <div className="flex gap-3 text-[10px] text-[#F5F1E8]/45">
                    {c.stats.career_ba != null && <span>BA <b>{Number(c.stats.career_ba).toFixed(3)}</b></span>}
                    {c.stats.career_hr != null && <span>HR <b>{c.stats.career_hr}</b></span>}
                    {c.stats.career_rbi != null && <span>RBI <b>{c.stats.career_rbi}</b></span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Picker sheet */}
      {pickerSlot && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: '#000000B3' }} onClick={() => setPickerSlot(null)}>
          <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: "480px", maxHeight: "70vh", background: '#181510', border: '1px solid #ffffff20' }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1A2E1F', borderBottom: '1px solid #ffffff0a' }}>
              <span className="text-sm font-black text-[#F5F1E8]">Select for {SLOT_LABELS[pickerSlot] ?? pickerSlot}</span>
              <button onClick={() => setPickerSlot(null)} className="text-[#F5F1E8]/50 text-xl font-black">×</button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {pickerCandidates.map(c => {
                const meta = TIER_META[c.tier] ?? TIER_META.common
                const currentSlot = slots.find(s => s.card_id === c.id)?.slot
                return (
                  <button key={c.id} onClick={() => assignToSlot(pickerSlot, c.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/5 transition-colors"
                    style={{ borderBottom: '1px solid #ffffff08' }}>
                    <span className="text-[9px] font-black tracking-widest px-2 py-1 rounded-full" style={{ color: meta.accent, background: meta.accent + '15' }}>{meta.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#F5F1E8] truncate">{c.name}</p>
                      <p className="text-[10px] text-[#F5F1E8]/35">{c.club} · {c.positions.map(p => SLOT_LABELS[p] ?? p).join(' ')}</p>
                    </div>
                    {currentSlot && <span className="text-[9px] text-[#F5F1E8]/40 uppercase">{SLOT_LABELS[currentSlot] ?? currentSlot}</span>}
                    <span className="text-[11px] text-[#F5F1E8]/45">{c.stats.career_ba != null ? Number(c.stats.career_ba).toFixed(3) : ''}</span>
                  </button>
                )
              })}
              {pickerCandidates.length === 0 && <p className="px-5 py-6 text-sm text-[#F5F1E8]/40">No eligible cards for this slot.</p>}
              {(pickerSlot.startsWith('BENCH') || pickerSlot.startsWith('RES')) && slots.find(s => s.slot === pickerSlot) && (
                <button onClick={() => clearSlot(pickerSlot)} className="w-full px-5 py-3 text-sm text-left" style={{ color: '#FF6B6B' }}>
                  Clear this slot
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}