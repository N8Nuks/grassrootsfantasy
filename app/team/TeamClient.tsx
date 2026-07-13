'use client'
import { useState } from 'react'
import { theme, THEMES, THEME_ORDER, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import PlayerCard from '@/components/PlayerCard'
import PlayerCardFull from '@/components/PlayerCardFull'
import FieldPicker from '@/components/FieldPicker'
import PackReveal, { RevealCard } from '@/components/PackReveal'

export type TeamCard = {
  id: string
  playerId: string
  name: string
  club: string
  tier: string
  positions: string[]
  stats: Record<string, number>
}

const TIER_META: Record<string, { label: string; accent: string }> = {
  rare_2wp_a: { label: '2WP A', accent: '#FFD700' },
  rare_2wp_b: { label: '2WP B', accent: '#E8C15A' },
  elite: { label: 'ELITE', accent: '#4DA6FF' },
  common: { label: 'COMMON', accent: '#2D9E4E' },
}

const SLOT_LABELS: Record<string, string> = {
  P: 'P', C: 'C', B1: '1B', B2: '2B', B3: '3B', SS: 'SS',
  LF: 'LF', CF: 'CF', RF: 'RF', DP: 'DP', PB: 'P(B)', DR: 'DR',
  BENCH1: 'B1', BENCH2: 'B2', BENCH3: 'B3', BENCH4: 'B4',
  RES1: 'R1', RES2: 'R2', RES3: 'R3', RES4: 'R4', RES5: 'R5',
}

const BATTING_SLOTS = ['P','C','B1','B2','B3','SS','LF','CF','RF','DP']
const NON_BATTING = ['PB','DR']
const STARTER_SLOTS = [...BATTING_SLOTS, ...NON_BATTING]
const BENCH_SLOTS = ['BENCH1','BENCH2','BENCH3','BENCH4']
const RES_SLOTS = ['RES1','RES2','RES3','RES4','RES5']

const CHIP_TONES = {
  nonBatting: '#E8C15A',
  bench: '#E8D5A3',
  reserve: '#B8AB90',
}

type SlotState = { slot: string; card_id: string; batting_order: number | null }

function isEligible(card: TeamCard, slot: string): boolean {
  if (slot === 'DP' || slot === 'DR') return true
  if (slot.startsWith('BENCH') || slot.startsWith('RES')) return true
  return card.positions.includes(slot)
}

function SoftballSwatch({ colors, seam, selected, ringColor }: {
  colors: [string, string]
  seam: string
  selected: boolean
  ringColor: string
}) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" style={{ display: 'block' }}>
      {/* half-and-half ball */}
      <path d="M13 2 A11 11 0 0 0 13 24 Z" fill={colors[0]} />
      <path d="M13 2 A11 11 0 0 1 13 24 Z" fill={colors[1]} />
      {/* stitching seams */}
      <path d="M7 3.8 Q11.5 13 7 22.2" fill="none" stroke={seam} strokeWidth="1.3" strokeDasharray="2 1.6" strokeLinecap="round" />
      <path d="M19 3.8 Q14.5 13 19 22.2" fill="none" stroke={seam} strokeWidth="1.3" strokeDasharray="2 1.6" strokeLinecap="round" />
      {/* outline / selection ring */}
      <circle cx="13" cy="13" r="11" fill="none" stroke={selected ? ringColor : '#ffffff30'} strokeWidth={selected ? 2 : 1} />
    </svg>
  )
}

export default function TeamClient({ teamName, clubName, cards, initialSlots, grade, siteTheme, unavailableIds, roundNumber, t3Claimed, t2Available }: {
  teamName: string
  clubName: string
  cards: TeamCard[]
  initialSlots: SlotState[]
  grade: Grade
  siteTheme: string
  unavailableIds: string[]
  roundNumber: number | null
  t3Claimed: boolean
  t2Available: boolean
}) {
  const T = theme(grade, siteTheme)
  const accentBright = T.electric ?? T.accent
  const shimmer = T.shimmer ? ' gf-shimmer' : ''
  const unavailable = new Set(unavailableIds)
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
  const [dirty, setDirty] = useState(false)
  const [swapTarget, setSwapTarget] = useState<number | null>(null)
  const [pickerSlot, setPickerSlot] = useState<string | null>(null)
  const [detailCard, setDetailCard] = useState<TeamCard | null>(null)
  const [dragOrder, setDragOrder] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sortBy, setSortBy] = useState<'tier' | 'ba' | 'points'>('tier')
  const [t4Code, setT4Code] = useState('')
  const [reveal, setReveal] = useState<{ packName: string; cards: RevealCard[] } | null>(null)
  const [themeSaving, setThemeSaving] = useState(false)

  async function setSiteTheme(next: string) {
    if (themeSaving || next === siteTheme) return
    setThemeSaving(true)
    const r = await fetch('/api/set-theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteTheme: next }) })
    if (r.ok) { window.location.reload(); return }
    setThemeSaving(false)
    alert('Could not save theme')
  }

  const cardById = new Map(cards.map(c => [c.id, c]))
  const assignedIds = new Set(slots.map(s => s.card_id))
  const slotByCard = new Map(slots.map(s => [s.card_id, s.slot]))
  const battingRows = slots
    .filter(s => BATTING_SLOTS.includes(s.slot))
    .sort((a, b) => (a.batting_order ?? 99) - (b.batting_order ?? 99))

  const unavailableRostered = slots
    .filter(s => !s.slot.startsWith('RES'))
    .map(s => cardById.get(s.card_id))
    .filter(c => c && unavailable.has(c.playerId)) as TeamCard[]

  function swapOrders(a: number, b: number) {
    if (a === b) return
    setDirty(true)
    setSlots(prev => prev.map(s => {
      if (s.batting_order === a) return { ...s, batting_order: b }
      if (s.batting_order === b) return { ...s, batting_order: a }
      return s
    }))
  }

  function tapOrder(order: number) {
    if (swapTarget === null) { setSwapTarget(order); return }
    if (swapTarget === order) { setSwapTarget(null); return }
    swapOrders(swapTarget, order)
    setSwapTarget(null)
  }

  function assignToSlot(slot: string, cardId: string) {
    setDirty(true)
    setSlots(prev => {
      const next = [...prev]
      const target = next.find(s => s.slot === slot)
      const cardCurrent = next.find(s => s.card_id === cardId)
      if (target && cardCurrent && target !== cardCurrent) {
        const tmp = target.card_id
        target.card_id = cardCurrent.card_id
        cardCurrent.card_id = tmp
      } else if (target && !cardCurrent) {
        target.card_id = cardId
      } else if (!target) {
        if (cardCurrent) {
          const idx = next.indexOf(cardCurrent)
          next.splice(idx, 1)
        }
        next.push({ slot, card_id: cardId, batting_order: null })
      }
      return [...next]
    })
    setPickerSlot(null)
    setDetailCard(null)
  }

  function clearSlot(slot: string) {
    setDirty(true)
    setSlots(prev => prev.filter(s => s.slot !== slot))
    setPickerSlot(null)
  }

  async function save() {
    setSaving(true); setMessage('')
    const res = await fetch('/api/save-lineup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade, slots }),
    })
    const data = await res.json()
    if (res.ok) setDirty(false)
    setMessage(res.ok ? 'Lineup card saved.' : (data.error ?? 'Save failed'))
    setSaving(false)
  }
  async function openT2() {
    const r = await fetch('/api/deal-t2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade }) })
    const data = await r.json()
    if (r.ok && data.cards?.length) {
      setReveal({ packName: 'Pre-Season Pack', cards: data.cards })
    } else alert(data.error ?? 'Could not open the pack')
  }
  async function redeemT4() {
    const r = await fetch('/api/redeem-t4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: t4Code }) })
    const data = await r.json()
    if (r.ok) {
      setReveal({ packName: 'Bonus Pack', cards: data.players.map((p: { name: string; tier: string }) => ({ name: p.name, tier: p.tier })) })
    } else alert(data.error)
  }
  async function claimT3() {
    const r = await fetch('/api/deal-t3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade }) })
    const data = await r.json()
    if (r.ok) {
      const cards: RevealCard[] = (data.cards ?? data.players.map((n: string) => ({ name: n, tier: 'common' })))
      setReveal({ packName: 'Weekly Pack', cards })
    } else alert(data.error)
  }

  function statBlock(cardList: TeamCard[]) {
    const withBA = cardList.filter(c => c.stats.career_ba != null)
    const avg = withBA.length ? withBA.reduce((a, c) => a + Number(c.stats.career_ba), 0) / withBA.length : 0
    const sum = (k: string) => cardList.reduce((a, c) => a + (Number(c.stats[k]) || 0), 0)
    return { avg, hr: sum('career_hr'), rbi: sum('career_rbi'), sb: sum('career_sb') }
  }
  const starterCards = slots
    .filter(s => STARTER_SLOTS.includes(s.slot))
    .map(s => cardById.get(s.card_id)).filter(Boolean) as TeamCard[]
  const starterStats = statBlock(starterCards)
  const squadStats = statBlock(cards)

  const surname = (n: string) => n.trim().split(' ').slice(-1)[0].toLowerCase()
  const sortedCollection = [...cards].sort((a, b) => {
    if (sortBy === 'ba') return (b.stats.career_ba ?? 0) - (a.stats.career_ba ?? 0)
    if (sortBy === 'points') {
      const diff = (b.stats.season_points ?? 0) - (a.stats.season_points ?? 0)
      return diff !== 0 ? diff : surname(a.name).localeCompare(surname(b.name))
    }
    const order = ['rare_2wp_a','rare_2wp_b','elite','common']
    return order.indexOf(a.tier) - order.indexOf(b.tier)
  })

  const pickerCandidates = pickerSlot ? cards.filter(c => isEligible(c, pickerSlot)) : []

  function chipTone(slot: string) {
    if (slot.startsWith('RES')) return CHIP_TONES.reserve
    if (slot.startsWith('BENCH')) return CHIP_TONES.bench
    if (NON_BATTING.includes(slot)) return CHIP_TONES.nonBatting
    return T.button
  }
  function chipShimmer(slot: string) {
    if (!T.shimmer) return ''
    if (slot.startsWith('RES') || slot.startsWith('BENCH')) return ''
    return ' gf-shimmer'
  }

  function PlayerRow({ s, showOrder }: { s: SlotState; showOrder: boolean }) {
    const c = cardById.get(s.card_id)
    if (!c) return null
    const meta = TIER_META[c.tier] ?? TIER_META.common
    const selected = swapTarget === s.batting_order
    const isOut = unavailable.has(c.playerId)
    return (
      <div
        draggable={showOrder}
        onDragStart={() => setDragOrder(s.batting_order)}
        onDragOver={e => e.preventDefault()}
        onDrop={() => { if (dragOrder != null && s.batting_order != null) swapOrders(dragOrder, s.batting_order); setDragOrder(null) }}
        className="flex items-center gap-3"
        style={{ borderBottom: '1px solid #ffffff08', opacity: isOut ? 0.4 : 1, cursor: showOrder ? 'grab' : 'default', padding: '14px 28px' }}>
        {showOrder ? (
          <button onClick={() => tapOrder(s.batting_order!)}
            className={"w-9 h-9 shrink-0 rounded-full text-sm font-black flex items-center justify-center transition-all" + (selected ? shimmer : '')}
            style={selected
              ? { background: T.button, color: T.buttonText, boxShadow: T.glow }
              : { background: '#ffffff10', color: T.text }}>
            {s.batting_order}
          </button>
        ) : <span className="w-9 shrink-0" />}
        <button onClick={() => setPickerSlot(s.slot)}
          className={"w-11 shrink-0 text-xs font-black text-center px-2 py-1 rounded transition-all hover:scale-105" + chipShimmer(s.slot)}
          style={{ color: T.buttonText, background: chipTone(s.slot) }}>
          {SLOT_LABELS[s.slot] ?? 'B'}
        </button>
        <button onClick={() => setDetailCard(c)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-black truncate" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>
            {c.name} {isOut && <span className="text-[9px] font-black px-1.5 py-0.5 rounded ml-1" style={{ background: '#FF6B6B', color: '#141210' }}>OUT</span>}
          </p>
          <p className="text-[10px]" style={{ color: T.textDim }}>{c.club}</p>
        </button>
        <span className="hidden sm:flex w-20 justify-center shrink-0">
          <span className="text-[9px] font-black tracking-widest px-2 py-1 rounded-full" style={{ color: meta.accent, background: meta.accent + '15' }}>
            {meta.label}
          </span>
        </span>
        <span className="hidden sm:block w-20 text-center text-[11px] shrink-0" style={{ color: T.textDim }}>
          {c.stats.career_ba != null ? Number(c.stats.career_ba).toFixed(3) : '—'}
        </span>
        <span className="hidden sm:block w-12 text-right text-[11px] shrink-0" style={{ color: T.textDim }}>
          {c.stats.career_sb ?? 0}
        </span>
      </div>
    )
  }

  function EmptyRow({ slot }: { slot: string }) {
    return (
      <div className="flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff08', padding: '14px 28px' }}>
        <span className="w-9 shrink-0" />
        <button onClick={() => setPickerSlot(slot)}
          className={"w-11 shrink-0 text-xs font-black text-center px-2 py-1 rounded transition-all hover:scale-105" + chipShimmer(slot)}
          style={{ color: T.buttonText, background: chipTone(slot) }}>
          {SLOT_LABELS[slot]}
        </button>
        <button onClick={() => setPickerSlot(slot)} className="flex-1 text-left text-sm" style={{ color: T.textDim, opacity: 0.6 }}>
          Empty — tap to assign
        </button>
      </div>
    )
  }

  function bandLabel(text: string) {
    return (
      <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim, padding: '16px 28px 4px' }}>{text}</p>
    )
  }

  return (
    <div style={{ maxWidth: "860px", marginLeft: "auto", marginRight: "auto" }}>
      {/* Jersey nameplate header */}
      <div className="rounded-2xl overflow-hidden pinstripe-fine text-center mb-6"
        style={{ background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `1px solid ${T.accent}35` }}>
        <div style={{ padding: '36px 28px 32px' }}>
          <p className={"text-xs font-black uppercase tracking-[0.3em] mb-3" + (T.shimmer ? ' gf-shimmer-text' : '')}
            style={T.shimmer ? undefined : { color: T.accent }}>My Team</p>
          <h1 className="text-4xl sm:text-5xl font-black mb-2" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{teamName}</h1>
          <p className="text-sm mb-5" style={{ color: T.textDim }}>{clubName} · {cards.length} cards{roundNumber != null ? ` · Round ${roundNumber}` : ''}</p>
          <GradeSwitch grade={grade} mensHref="/team?grade=mens" womensHref="/team?grade=womens" palette={siteTheme !== 'grade' ? T : undefined} />

          {/* Site theme switcher — softballs */}
          <div className="flex items-center justify-center gap-3 flex-wrap" style={{ marginTop: '18px', opacity: themeSaving ? 0.5 : 1 }}>
            <button onClick={() => setSiteTheme('grade')} title="Classic — colours follow the grade"
              className="text-[9px] font-black uppercase tracking-widest px-3 rounded-full transition-all hover:scale-105"
              style={{
                height: '26px',
                color: siteTheme === 'grade' ? T.buttonText : T.textDim,
                background: siteTheme === 'grade' ? T.button : 'transparent',
                border: `1px solid ${siteTheme === 'grade' ? T.button : '#ffffff30'}`,
              }}>
              Classic
            </button>
            {THEME_ORDER.map(k => (
              <button key={k} onClick={() => setSiteTheme(k)} title={THEMES[k].label}
                className="transition-all hover:scale-110"
                style={{ filter: siteTheme === k ? `drop-shadow(0 0 6px ${THEMES[k].accent})` : 'none' }}>
                <SoftballSwatch
                  colors={THEMES[k].swatch}
                  seam={THEMES[k].seam}
                  selected={siteTheme === k}
                  ringColor={T.text}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Packs strip */}
      <div className="flex items-center justify-center gap-4 flex-wrap" style={{ margin: '32px 0' }}>
        {t2Available && (
          <button onClick={openT2}
            className="text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] flex items-center gf-pulse"
            style={{ padding: '14px 32px', minHeight: '48px', color: '#141210', background: '#FFD700', boxShadow: '0 0 24px #FFD70060' }}>
            Open Pre-Season Pack · 9 cards
          </button>
        )}
        {cards.length >= 21 && (
          <button onClick={t3Claimed ? undefined : claimT3} disabled={t3Claimed}
            className={"text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02] disabled:hover:scale-100 flex items-center" + (t3Claimed ? '' : shimmer)}
            style={{
              padding: '14px 32px',
              minHeight: '48px',
              ...(t3Claimed
                ? { color: T.textDim, border: '1px solid #ffffff25', background: 'transparent' }
                : { color: T.buttonText, background: T.button, boxShadow: T.glow }),
            }}>
            {t3Claimed ? 'Weekly Pack Claimed ✓' : 'Claim Weekly Pack · 2 cards'}
          </button>
        )}
        <div className="inline-flex rounded-full overflow-hidden" style={{ border: '1px solid #ffffff25', minHeight: '48px' }}>
          <input
            value={t4Code}
            onChange={e => setT4Code(e.target.value)}
            placeholder="Bonus pack code"
            className="text-xs font-bold uppercase tracking-widest outline-none w-44"
            style={{ background: 'transparent', caretColor: T.text, color: T.text, padding: '14px 24px', fontFamily: 'var(--font-label)' }}
          />
          <button onClick={redeemT4} disabled={!t4Code.trim()}
            className={"text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40" + shimmer}
            style={{ color: T.buttonText, background: T.button, padding: '14px 28px', borderLeft: '1px solid #ffffff15' }}>
            Redeem
          </button>
        </div>
      </div>

      {unavailableRostered.length > 0 && view === 'lineup' && (
        <div className="rounded-xl px-5 py-4 mb-6 text-sm" style={{ background: '#FF6B6B15', border: '1px solid #FF6B6B50', color: '#FF9B9B' }}>
          <b>Unavailable this round:</b> {unavailableRostered.map(c => c.name).join(', ')} — swap them out before lock or the auto-sub will fill the gap from your bench.
        </div>
      )}

      <div className="flex justify-center" style={{ margin: '40px 0' }}>
        <div className="inline-flex rounded-full overflow-hidden" style={{ border: '1px solid #ffffff25' }}>
          {(['lineup','collection'] as const).map((v, i) => (
            <button key={v} onClick={() => setView(v)}
              className={"text-xs font-black uppercase tracking-widest transition-all flex items-center" + (view === v ? shimmer : '')}
              style={{
                color: view === v ? T.buttonText : T.textDim,
                background: view === v ? T.button : 'transparent',
                padding: '14px 32px',
                minHeight: '44px',
                ...(i > 0 ? { borderLeft: '1px solid #ffffff15' } : {}),
              }}>
              {v === 'lineup' ? 'Lineup Card' : 'Collection'}
            </button>
          ))}
        </div>
      </div>

      {view === 'lineup' && (
        <div>
          <div className="rounded-2xl overflow-hidden pinstripe" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
            {/* Card masthead */}
            <div className="text-center" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '24px 28px 18px' }}>
              <p className="text-lg sm:text-xl font-black uppercase tracking-[0.35em]" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>
                Official Lineup Card
              </p>
            </div>
            {/* Column titles */}
            <div className="hidden sm:flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff0a', padding: '10px 28px' }}>
              <span className="w-9 shrink-0" />
              <span className="w-11 shrink-0" />
              <span className="flex-1" />
              <span className="w-20 text-center text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>Tier</span>
              <span className="w-20 text-center text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>Bat Ave.</span>
              <span className="w-12 text-right text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>SB</span>
            </div>

            {battingRows.map(s => <PlayerRow key={s.slot} s={s} showOrder={true} />)}

            <div style={{ background: '#00000025' }}>
              {NON_BATTING.map(slotName => {
                const s = slots.find(x => x.slot === slotName)
                return s ? <PlayerRow key={slotName} s={s} showOrder={false} /> : <EmptyRow key={slotName} slot={slotName} />
              })}
            </div>

            <div style={{ background: '#00000035' }}>
              {bandLabel('Bench · 0.75× · covers absences at full points')}
              {BENCH_SLOTS.map(b => {
                const s = slots.find(x => x.slot === b)
                return s ? <PlayerRow key={b} s={s} showOrder={false} /> : <EmptyRow key={b} slot={b} />
              })}
            </div>

            <div style={{ background: '#00000045' }}>
              {bandLabel('Reserve · No score · promoted automatically when the bench is used')}
              {RES_SLOTS.map(r => {
                const s = slots.find(x => x.slot === r)
                return s ? <PlayerRow key={r} s={s} showOrder={false} /> : <EmptyRow key={r} slot={r} />
              })}
            </div>

            <div style={{ background: T.headerBg, borderTop: '1px solid #ffffff0a', padding: '20px 28px' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: accentBright }}>Starting Card</p>
                  <div className="flex gap-4 text-xs flex-wrap" style={{ color: T.textDim }}>
                    <span>BA <b style={{ color: T.text }}>{starterStats.avg.toFixed(3)}</b></span>
                    <span>HR <b style={{ color: T.text }}>{starterStats.hr}</b></span>
                    <span>RBI <b style={{ color: T.text }}>{starterStats.rbi}</b></span>
                    <span>SB <b style={{ color: T.text }}>{starterStats.sb}</b></span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: '#E8C15A' }}>Full Squad</p>
                  <div className="flex gap-4 text-xs flex-wrap" style={{ color: T.textDim }}>
                    <span>BA <b style={{ color: T.text }}>{squadStats.avg.toFixed(3)}</b></span>
                    <span>HR <b style={{ color: T.text }}>{squadStats.hr}</b></span>
                    <span>RBI <b style={{ color: T.text }}>{squadStats.rbi}</b></span>
                    <span>SB <b style={{ color: T.text }}>{squadStats.sb}</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center mt-4" style={{ color: T.textDim }}>
            Drag or tap batting numbers to reorder · tap a name for the player card · tap a position chip to change who fills it.
          </p>

          <div className="text-center" style={{ marginTop: "28px" }}>
            <button onClick={save} disabled={saving}
              className="text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ color: accentBright, border: `1px solid ${accentBright}`, background: 'transparent', padding: "18px 64px", textShadow: T.glow, boxShadow: `0 0 16px ${T.accent}30, inset 0 0 16px ${T.accent}15` }}>
              {saving ? 'Saving…' : 'Save Lineup Card'}
            </button>
            {message && <p className="text-sm mt-4" style={{ color: message.includes('saved') ? T.accent : '#FF6B6B' }}>{message}</p>}
          </div>

          {dirty && (
            <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"
              style={{ background: `${T.field}F0`, borderTop: `1px solid ${T.accent}40`, padding: '14px 24px', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim }}>Unsaved changes</span>
                <button onClick={save} disabled={saving}
                  className={"text-sm font-black uppercase tracking-widest px-8 py-3 rounded-full transition-all hover:scale-[1.02] disabled:opacity-50" + shimmer}
                  style={{ color: T.buttonText, background: T.button, boxShadow: T.glow }}>
                  {saving ? 'Saving…' : 'Save Lineup Card'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'collection' && (
        <div>
          <div className="flex justify-center" style={{ marginTop: '-9px', marginBottom: '40px' }}>
            <div className="inline-flex rounded-full overflow-hidden" style={{ border: '1px solid #ffffff25' }}>
              {(['tier','ba','points'] as const).map((s, i) => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={"text-xs font-black uppercase tracking-widest transition-all flex items-center" + (sortBy === s ? shimmer : '')}
                  style={{
                    color: sortBy === s ? T.buttonText : T.textDim,
                    background: sortBy === s ? T.button : 'transparent',
                    padding: '12px 24px',
                    minHeight: '44px',
                    ...(i > 0 ? { borderLeft: '1px solid #ffffff15' } : {}),
                  }}>
                  {s === 'ba' ? 'Bat Ave.' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {sortedCollection.map(c => {
              const inLineup = assignedIds.has(c.id)
              const slot = slotByCard.get(c.id)
              return (
                <PlayerCard key={c.id}
                  player={{ id: c.id, name: c.name, tier: c.tier, positions: c.positions, club: c.club, stats: c.stats }}
                  grade={grade}
                  owned={true}
                  chip={inLineup ? `IN ${SLOT_LABELS[slot ?? ''] ?? ''}` : undefined}
                  onClick={() => setDetailCard(c)}
                />
              )
            })}
          </div>
        </div>
      )}

      {pickerSlot && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: '#000000B3' }} onClick={() => setPickerSlot(null)}>
          <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: "480px", maxHeight: "70vh", background: T.surface, border: '1px solid #ffffff20' }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a' }}>
              <span className="text-sm font-black" style={{ color: T.text }}>Select for {SLOT_LABELS[pickerSlot] ?? pickerSlot}</span>
              <button onClick={() => setPickerSlot(null)} className="text-xl font-black" style={{ color: T.textDim }}>×</button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {pickerCandidates.map(c => {
                const meta = TIER_META[c.tier] ?? TIER_META.common
                const currentSlot = slotByCard.get(c.id)
                const isOut = unavailable.has(c.playerId)
                return (
                  <button key={c.id} onClick={() => assignToSlot(pickerSlot, c.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/5 transition-colors"
                    style={{ borderBottom: '1px solid #ffffff08', opacity: isOut ? 0.4 : 1 }}>
                    <span className="text-[9px] font-black tracking-widest px-2 py-1 rounded-full" style={{ color: meta.accent, background: meta.accent + '15' }}>{meta.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: T.text }}>{c.name}{isOut ? ' · OUT' : ''}</p>
                      <p className="text-[10px]" style={{ color: T.textDim }}>{c.club} · {c.positions.map(p => SLOT_LABELS[p] ?? p).join(' ')}</p>
                    </div>
                    {currentSlot && <span className="text-[9px] uppercase" style={{ color: T.textDim }}>{SLOT_LABELS[currentSlot] ?? currentSlot}</span>}
                    <span className="text-[11px]" style={{ color: T.textDim }}>{c.stats.career_ba != null ? Number(c.stats.career_ba).toFixed(3) : ''}</span>
                  </button>
                )
              })}
              {pickerCandidates.length === 0 && <p className="px-5 py-6 text-sm" style={{ color: T.textDim }}>No eligible cards for this slot.</p>}
              {(pickerSlot.startsWith('BENCH') || pickerSlot.startsWith('RES')) && slots.find(s => s.slot === pickerSlot) && (
                <button onClick={() => clearSlot(pickerSlot)} className="w-full px-5 py-3 text-sm text-left" style={{ color: '#FF6B6B' }}>Clear this slot</button>
              )}
            </div>
          </div>
        </div>
      )}

      {detailCard && (() => {
        const c = detailCard
        const meta = TIER_META[c.tier] ?? TIER_META.common
        const currentSlot = slotByCard.get(c.id)
        const isOut = unavailable.has(c.playerId)
        const placeTargets = [...STARTER_SLOTS.filter(s => isEligible(c, s)), ...BENCH_SLOTS, ...RES_SLOTS]
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: '#000000CC' }} onClick={() => setDetailCard(null)}>
            <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: "820px", maxHeight: "94vh", background: T.surface, border: `1px solid ${meta.accent}50` }} onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a' }}>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full" style={{ color: meta.accent, background: meta.accent + '20' }}>{meta.label}</span>
                  {isOut && <span className="text-[9px] font-black px-2 py-0.5 rounded" style={{ background: '#FF6B6B', color: '#141210' }}>OUT THIS ROUND</span>}
                  {currentSlot && <span className="text-[10px] uppercase tracking-widest" style={{ color: T.textDim }}>currently {SLOT_LABELS[currentSlot] ?? currentSlot}</span>}
                </div>
                <button onClick={() => setDetailCard(null)} className="text-xl font-black" style={{ color: T.textDim }}>×</button>
              </div>
              <div className="overflow-y-auto px-6 py-5 sm:grid sm:grid-cols-[1fr_1.3fr] sm:gap-7 sm:items-start" style={{ maxHeight: "86vh" }}>
                <div className="mb-6 sm:mb-0">
                  <PlayerCardFull
                    player={{ id: c.id, name: c.name, tier: c.tier, positions: c.positions, club: c.club, stats: c.stats }}
                    grade={grade}
                    owned={true}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: T.textDim }}>Place on the field</p>
                  <FieldPicker
                    grade={grade}
                    eligible={new Set(placeTargets)}
                    current={currentSlot ?? null}
                    onSelect={(slot) => assignToSlot(slot, c.id)}
                  />
                  <p className="text-[10px] mt-3" style={{ color: T.textDim }}>Whoever holds that spot swaps into this player&apos;s current position.</p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {reveal && (
        <PackReveal
          grade={grade}
          packName={reveal.packName}
          cards={reveal.cards}
          onDone={() => window.location.reload()}
        />
      )}
    </div>
  )
}