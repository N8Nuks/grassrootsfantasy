'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { theme, THEMES, THEME_ORDER, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import PlayerCard from '@/components/PlayerCard'
import PlayerCardFull from '@/components/PlayerCardFull'
import FieldPicker from '@/components/FieldPicker'
import PackReveal, { RevealCard } from '@/components/PackReveal'
import PageGuide, { GuideStep } from '@/components/PageGuide'
import SandboxBanner from '@/components/SandboxBanner'
import { splitName } from '@/lib/names'

const TEAM_GUIDE: GuideStep[] = [
  {
    title: 'This is your team',
    body: 'Your Lineup Card shows your sixteen scoring players, numbered 1 to 16. Numbers 1 to 10 are your batting order — tap or drag them to reorder. P(B), DR and your bench hold 11 to 16 and stay put. Tap a name to see their full card, and tap a yellow position chip to change who fills that spot.',
  },
  {
    title: 'Captain and Vice Captain',
    body: "Tap C to name your Captain — they score 2×. Tap VC for your Vice Captain, who scores 1.5×. Both apply every round, so you have two picks that matter. The multiplier applies to everything, including negatives, so pick with care. Anyone sitting in your reserves earns nothing, armband or not, and a player already on a 2× bonus can't wear one.",
  },
  {
    title: 'Points and Earned',
    body: "The round columns show what a player scored from their own stat line. Earned is what they were actually worth to you — after the slot rules, the bench multiplier and any doubles. A P(B) who didn't pitch earns nothing; a DR only counts steals. Where the two differ, the reason is shown under the player's club.",
  },
  {
    title: 'Starters, bench, reserve',
    body: 'Starters score full points. Bench players score at 0.75× and step in automatically at full value if a starter misses the round. Reserves are your depth — no score, no number, but ready to promote.',
  },
  {
    title: 'Packs and lock day',
    body: "Claim your free Weekly Pack at the top of this page every round — if you don't, the cards are added automatically when the next round starts, but you miss the reveal. Set your lineup any time while the round is open; it locks before the games, then your players' real performances earn your points.",
  },
]

export type TeamCard = {
  id: string
  playerId: string
  name: string
  club: string
  tier: string
  positions: string[]
  stats: Record<string, number>
  photoUrl?: string | null
  playingNumber?: number | null
}

export type ArmbandNotice = {
  id: string
  round_number: number
  bonus_player_name: string
  moved_to_name: string | null
}

export type Earned = Record<string, { earned: number; reason: string | null }>

const TIER_META: Record<string, { label: string; accent: string }> = {
  rare_2wp_a: { label: '2WP A', accent: '#FFD700' },
  rare_2wp_b: { label: '2WP B', accent: '#E8C15A' },
  elite: { label: 'ELITE', accent: '#1D3FBE' },
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

// Numbers 11–16 are fixed to their slot. They mark the sixteen scoring players
// and never move — only the batting order (1–10) is interchangeable.
const FIXED_NUMBERS: Record<string, number> = {
  PB: 11, DR: 12, BENCH1: 13, BENCH2: 14, BENCH3: 15, BENCH4: 16,
}

const CAPTAIN_GOLD = '#FFD700'
const VICE_SILVER = '#C9D2DE'

const CHIP_TONES = {
  nonBatting: '#E8C15A',
  bench: '#E8D5A3',
  reserve: '#B8AB90',
}

type SlotState = { slot: string; card_id: string; batting_order: number | null }

// Batting slots take 1–10 with no duplicates and no gaps: valid unclaimed numbers
// are kept, everything else gets the lowest free number (not a running max).
// P(B), DR and bench always take their fixed number. Reserves take none.
function normaliseOrders(input: SlotState[]): SlotState[] {
  const out = input.map(s => ({ ...s }))
  const batting = BATTING_SLOTS
    .map(bs => out.find(s => s.slot === bs))
    .filter(Boolean) as SlotState[]
  const taken = new Set<number>()
  const needs: SlotState[] = []
  for (const s of batting) {
    const n = s.batting_order
    if (n != null && n >= 1 && n <= BATTING_SLOTS.length && !taken.has(n)) taken.add(n)
    else needs.push(s)
  }
  let free = 1
  for (const s of needs) {
    while (taken.has(free)) free++
    s.batting_order = free
    taken.add(free)
  }
  for (const s of out) {
    if (FIXED_NUMBERS[s.slot] != null) s.batting_order = FIXED_NUMBERS[s.slot]
    else if (s.slot.startsWith('RES')) s.batting_order = null
  }
  return out
}

function isEligible(card: TeamCard, slot: string): boolean {
  if (slot === 'DP' || slot === 'DR') return true
  if (slot.startsWith('BENCH') || slot.startsWith('RES')) return true
  return card.positions.includes(slot)
}

// Trim trailing zeros: 18 not 18.00, 5.25 stays 5.25
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)))
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

export default function TeamClient({ teamName, clubName, cards, initialSlots, grade, siteTheme, unavailableIds, roundNumber, t3Claimed, t2Available, roundOpen, thisRoundPoints, lastRoundPoints, thisRoundLabel, lastRoundLabel, cardStyle, doubledIds = [], initialCaptainId = null, initialViceCaptainId = null, notices = [], earned = {}, earnedLabel = null }: {
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
  roundOpen: boolean
  thisRoundPoints: Record<string, number>
  lastRoundPoints: Record<string, number>
  thisRoundLabel: string | null
  lastRoundLabel: string | null
  cardStyle: 'standard' | 'premium'
  doubledIds?: string[]
  initialCaptainId?: string | null
  initialViceCaptainId?: string | null
  notices?: ArmbandNotice[]
  earned?: Earned
  earnedLabel?: string | null
}) {
  const router = useRouter()
  const T = theme(grade, siteTheme)
  const accentBright = T.electric ?? T.accent
  const shimmer = T.shimmer ? ' gf-shimmer' : ''
  const unavailable = new Set(unavailableIds)
  // Cycle or perfect game last round — this player scores 2x this round
  const doubled = new Set(doubledIds)
  const [view, setView] = useState<'lineup' | 'collection'>('lineup')
  const [slots, setSlots] = useState<SlotState[]>(() => normaliseOrders(initialSlots))
  const [captainId, setCaptainId] = useState<string | null>(initialCaptainId)
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(initialViceCaptainId)
  const [openNotices, setOpenNotices] = useState<ArmbandNotice[]>(notices)
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
  const [packBusy, setPackBusy] = useState(false)
  const [themeSaving, setThemeSaving] = useState(false)
  // ── Lineup self-repair ──
  // A scoring slot can become empty (e.g. a player removed from the competition).
  // On load: promote the first eligible bench player into any empty scoring slot,
  // backfill bench from reserves, save silently. Scoring already handles vacancies
  // at points time — this keeps the visible lineup whole too.
  const [repaired, setRepaired] = useState(false)
  useEffect(() => {
    if (repaired) return
    setRepaired(true)
    const present = new Set(slots.map(s => s.slot))
    const missingStarters = STARTER_SLOTS.filter(sl => !present.has(sl))
    if (missingStarters.length === 0) return

    const working = [...slots]
    const cardOf = (id: string) => cards.find(c => c.id === id)
    let changed = false
    const unfilled: string[] = []

    // Pull the first card from a band that can legally play the slot.
    // Returns the vacated slot name, or null if nothing eligible was found.
    const takeFrom = (band: 'BENCH' | 'RES', slot: string): string | null => {
      const i = working.findIndex(s =>
        s.slot.startsWith(band) && cardOf(s.card_id) && isEligible(cardOf(s.card_id)!, slot))
      if (i === -1) return null
      const vacated = working[i].slot
      const card = working[i].card_id
      working.splice(i, 1)
      working.push({ slot, card_id: card, batting_order: null })
      changed = true
      return vacated
    }

    // 1 — fill empty starting slots, bench first, then straight from reserves
    for (const slot of missingStarters) {
      const vacatedBench = takeFrom('BENCH', slot)
      if (vacatedBench) {
        // a reserve steps up into the bench spot that just opened
        takeFrom('RES', vacatedBench)
        continue
      }
      // no eligible bench player — try a reserve directly
      if (takeFrom('RES', slot)) continue
      // genuinely nobody can play it
      unfilled.push(SLOT_LABELS[slot] ?? slot)
    }

    // 2 — any bench slot still empty (e.g. its card was removed) backfills from reserves
    const after = new Set(working.map(s => s.slot))
    for (const b of BENCH_SLOTS.filter(x => !after.has(x))) {
      takeFrom('RES', b)
    }

    if (!changed && unfilled.length === 0) return
    // Promoted players arrive with no number — renumber before showing or saving
    const fixed = normaliseOrders(working)
    setSlots(fixed)
    setMessage(unfilled.length > 0
      ? `Your lineup had open spots. We filled what we could — ${unfilled.join(', ')} still needs a player you don't currently hold. Claim a pack to fill it.`
      : 'Your lineup had an open spot — we promoted from your bench to fill it.')
    // Persist silently
    fetch('/api/save-lineup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade, slots: fixed, captainCardId: captainId, viceCaptainCardId: viceCaptainId }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function dismissNotice(id: string) {
    setOpenNotices(prev => prev.filter(n => n.id !== id))
    await fetch('/api/dismiss-notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

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

  // Round total from the earned figures — what the lineup was actually worth
  const earnedTotal = slots.reduce((sum, s) => {
    const c = cardById.get(s.card_id)
    return sum + (c ? (earned[c.playerId]?.earned ?? 0) : 0)
  }, 0)
  const hasEarned = earnedLabel != null

  // ── Armbands ──
  // A player already on an achievement 2× can never hold one.
  function canWearArmband(cardId: string): boolean {
    const c = cardById.get(cardId)
    return !!c && !doubled.has(c.playerId)
  }

  function toggleCaptain(cardId: string) {
    if (!canWearArmband(cardId)) {
      setMessage('That player is already scoring 2× this round — they can\'t wear the armband.')
      return
    }
    setDirty(true)
    setCaptainId(prev => {
      if (prev === cardId) return null
      // can't hold both armbands
      if (viceCaptainId === cardId) setViceCaptainId(null)
      return cardId
    })
  }

  function toggleViceCaptain(cardId: string) {
    if (!canWearArmband(cardId)) {
      setMessage('That player is already scoring 2× this round — they can\'t wear the armband.')
      return
    }
    setDirty(true)
    setViceCaptainId(prev => {
      if (prev === cardId) return null
      if (captainId === cardId) setCaptainId(null)
      return cardId
    })
  }

  // Only the batting order (1–10) can be reordered
  function swapOrders(a: number, b: number) {
    if (a === b) return
    if (a > BATTING_SLOTS.length || b > BATTING_SLOTS.length) return
    setDirty(true)
    setSlots(prev => prev.map(s => {
      if (!BATTING_SLOTS.includes(s.slot)) return s
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
      return normaliseOrders(next)
    })
    setPickerSlot(null)
    setDetailCard(null)
  }

  function clearSlot(slot: string) {
    setDirty(true)
    // a card leaving the lineup loses its armband
    const leaving = slots.find(s => s.slot === slot)?.card_id
    if (leaving && captainId === leaving) setCaptainId(null)
    if (leaving && viceCaptainId === leaving) setViceCaptainId(null)
    setSlots(prev => normaliseOrders(prev.filter(s => s.slot !== slot)))
    setPickerSlot(null)
  }

  async function save() {
    setSaving(true); setMessage('')
    const res = await fetch('/api/save-lineup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade, slots, captainCardId: captainId, viceCaptainCardId: viceCaptainId }),
    })
    const data = await res.json()
    if (res.ok) setDirty(false)
    setMessage(res.ok ? 'Lineup card saved.' : (data.error ?? 'Save failed'))
    setSaving(false)
  }
  async function openT2() {
    if (packBusy) return
    setPackBusy(true)
    const r = await fetch('/api/deal-t2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade }) })
    const data = await r.json()
    setPackBusy(false)
    if (r.ok && data.cards?.length) {
      setReveal({ packName: 'Pre-Season Pack', cards: data.cards })
    } else {
      alert(data.error ?? 'Could not open the pack')
      // The server disagreed with what this page is showing — pull fresh state
      // so a stale button doesn't sit there after being told it's already open.
      router.refresh()
    }
  }
  async function redeemT4() {
    if (packBusy) return
    setPackBusy(true)
    const r = await fetch('/api/redeem-t4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: t4Code }) })
    const data = await r.json()
    setPackBusy(false)
    if (r.ok) {
      setReveal({ packName: 'Bonus Pack', cards: data.cards ?? data.players.map((p: { name: string; tier: string }) => ({ name: p.name, tier: p.tier })) })
    } else alert(data.error)
  }
  async function claimT3() {
    if (packBusy) return
    setPackBusy(true)
    const r = await fetch('/api/deal-t3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade }) })
    const data = await r.json()
    setPackBusy(false)
    if (r.ok) {
      const cards: RevealCard[] = (data.cards ?? data.players.map((n: string) => ({ name: n, tier: 'common' })))
      setReveal({ packName: 'Weekly Pack', cards })
    } else {
      alert(data.error)
      router.refresh()
    }
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

  const weeklyReady = cards.length >= 21 && !t3Claimed

  const captainCard = captainId ? cardById.get(captainId) : null
  const viceCard = viceCaptainId ? cardById.get(viceCaptainId) : null
  const captainSlot = captainId ? slotByCard.get(captainId) : null
  const captainInReserve = captainSlot?.startsWith('RES') ?? false

  function chipTone(slot: string) {
    if (slot.startsWith('RES')) return T.chipReserve ?? CHIP_TONES.reserve
    if (slot.startsWith('BENCH')) return T.chipBench ?? CHIP_TONES.bench
    if (NON_BATTING.includes(slot)) return T.chipNonBatting ?? CHIP_TONES.nonBatting
    return T.button
  }
  function chipShimmer(slot: string) {
    if (!T.shimmer) return ''
    if (slot.startsWith('RES') || slot.startsWith('BENCH')) return ''
    return ' gf-shimmer'
  }

  function ArmbandButtons({ cardId }: { cardId: string }) {
    const isCap = captainId === cardId
    const isVice = viceCaptainId === cardId
    const blocked = !canWearArmband(cardId)
    return (
      <span className="flex items-center gap-1 shrink-0">
        <button onClick={() => toggleCaptain(cardId)} disabled={blocked || !roundOpen}
          title={blocked ? 'Already scoring 2× — cannot be Captain' : 'Captain — scores double'}
          className="w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center transition-all disabled:opacity-15"
          style={isCap
            ? { background: CAPTAIN_GOLD, color: '#141210', boxShadow: `0 0 12px ${CAPTAIN_GOLD}80` }
            : { background: 'transparent', color: T.textDim, border: '1px solid #ffffff14', opacity: 0.3 }}>
          C
        </button>
        <button onClick={() => toggleViceCaptain(cardId)} disabled={blocked || !roundOpen}
          title={blocked ? 'Already scoring 2× — cannot be Vice Captain' : 'Vice Captain — doubles if the Captain is out'}
          className="w-7 h-7 rounded-full text-[9px] font-black flex items-center justify-center transition-all disabled:opacity-15"
          style={isVice
            ? { background: VICE_SILVER, color: '#141210', boxShadow: `0 0 10px ${VICE_SILVER}70` }
            : { background: 'transparent', color: T.textDim, border: '1px solid #ffffff14', opacity: 0.3 }}>
          VC
        </button>
      </span>
    )
  }

  function PlayerRow({ s }: { s: SlotState }) {
    const c = cardById.get(s.card_id)
    if (!c) return null
    const meta = TIER_META[c.tier] ?? TIER_META.common
    const hasNumber = s.batting_order != null
    // Only the batting order can be tapped or dragged — 11–16 are fixed labels
    const swappable = BATTING_SLOTS.includes(s.slot) && hasNumber
    const selected = swappable && swapTarget === s.batting_order
    const isOut = unavailable.has(c.playerId)
    const isDoubled = doubled.has(c.playerId)
    const isCap = captainId === s.card_id
    const isVice = viceCaptainId === s.card_id
    const e = earned[c.playerId]
    return (
      <div
        draggable={swappable}
        onDragStart={() => { if (swappable) setDragOrder(s.batting_order) }}
        onDragOver={e2 => { if (swappable) e2.preventDefault() }}
        onDrop={() => { if (swappable && dragOrder != null && s.batting_order != null) swapOrders(dragOrder, s.batting_order); setDragOrder(null) }}
        className="flex items-center gap-3"
        style={{
          borderBottom: '1px solid #ffffff08',
          opacity: isOut ? 0.4 : 1,
          cursor: swappable ? 'grab' : 'default',
          padding: '14px 28px',
          ...(isDoubled ? {
            background: '#FF8C4212',
            boxShadow: 'inset 3px 0 0 #FF8C42, 0 0 20px #FF8C4218',
          } : isCap ? {
            background: `${CAPTAIN_GOLD}0E`,
            boxShadow: `inset 3px 0 0 ${CAPTAIN_GOLD}`,
          } : {}),
        }}>
        {hasNumber ? (
          swappable ? (
            <button onClick={() => tapOrder(s.batting_order!)}
              className={"w-9 h-9 shrink-0 rounded-full text-sm font-black flex items-center justify-center transition-all" + (selected ? shimmer : '')}
              style={selected
                ? { background: T.button, color: T.buttonText, boxShadow: T.glow }
                : { background: '#ffffff10', color: T.text }}>
              {s.batting_order}
            </button>
          ) : (
            <span className="w-9 h-9 shrink-0 rounded-full text-sm font-black flex items-center justify-center"
              style={{ background: '#ffffff08', color: T.textDim }}>
              {s.batting_order}
            </span>
          )
        ) : <span className="w-9 shrink-0" />}
        <button onClick={() => setPickerSlot(s.slot)}
          className={"w-11 shrink-0 text-xs font-black text-center px-2 py-1 rounded transition-all hover:scale-105" + chipShimmer(s.slot)}
          style={{ color: T.buttonText, background: chipTone(s.slot) }}>
          {SLOT_LABELS[s.slot] ?? 'B'}
        </button>
        <button onClick={() => setDetailCard(c)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>
            <span className="block sm:inline landscape:inline">{c.name.split(' ')[0]}</span>
            <span className="block sm:inline landscape:inline uppercase sm:before:content-['_'] landscape:before:content-['_']">{c.name.split(' ').slice(1).join(' ')}</span>
            {isOut && <span className="text-[9px] font-black px-1.5 py-0.5 rounded ml-1" style={{ background: '#FF6B6B', color: '#141210' }}>OUT</span>}
            {isDoubled && <span className="text-[9px] font-black px-1.5 py-0.5 rounded ml-1 gf-pulse" style={{ background: '#FF8C42', color: '#141210', boxShadow: '0 0 10px #FF8C42' }}>2×</span>}
          </p>
          <p className="text-[10px]" style={{ color: T.textDim }}>
            {c.club}
            {e?.reason && <span style={{ color: accentBright, marginLeft: '6px' }}>· {earnedLabel ? `${earnedLabel} ` : ''}{e.reason}</span>}
          </p>
        </button>
        <ArmbandButtons cardId={s.card_id} />
        <span className="hidden sm:flex landscape:flex w-20 justify-center shrink-0">
          <span className="text-[9px] font-black tracking-widest px-2 py-1 rounded-full" style={{ color: meta.accent, background: meta.accent + '15' }}>
            {meta.label}
          </span>
        </span>
        <span className="hidden sm:block landscape:block w-20 text-center text-[11px] shrink-0" style={{ color: T.textDim }}>
          {c.stats.season_ba != null ? Number(c.stats.season_ba).toFixed(3) : '—'}
        </span>
        <span className="hidden sm:block landscape:block w-12 text-right text-[11px] shrink-0" style={{ color: T.textDim }}>
          {c.stats.season_sb ?? 0}
        </span>
        <span className="hidden sm:block landscape:block w-14 text-right text-[11px] shrink-0" style={{ color: T.textDim }}>
          {lastRoundPoints[c.playerId] ?? '—'}
        </span>
        <span className="hidden sm:block landscape:block w-14 text-right text-[11px] shrink-0" style={{ color: T.text }}>
          {thisRoundPoints[c.playerId] ?? '—'}
        </span>
        {hasEarned && (
          <span className="hidden sm:block landscape:block w-16 text-right text-[11px] font-black shrink-0"
            style={{ color: e && e.earned > 0 ? accentBright : T.textDim }}>
            {e ? fmt(e.earned) : '—'}
          </span>
        )}
        <span className="hidden sm:block landscape:block w-14 text-right text-[11px] font-black shrink-0" style={{ color: T.text }}>
          {c.stats.season_points ?? 0}
        </span>
      </div>
    )
  }

  function EmptyRow({ slot }: { slot: string }) {
    const n = FIXED_NUMBERS[slot]
    return (
      <div className="flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff08', padding: '14px 28px' }}>
        {n != null ? (
          <span className="w-9 h-9 shrink-0 rounded-full text-sm font-black flex items-center justify-center"
            style={{ background: '#ffffff08', color: T.textDim, opacity: 0.5 }}>{n}</span>
        ) : <span className="w-9 shrink-0" />}
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

      {/* ── Armband notices — a bonus was awarded, and the armband may have moved ── */}
      {openNotices.map(n => (
        <div key={n.id} className="rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`,
            border: `2px solid #FF8C4270`,
            boxShadow: '0 0 26px #FF8C4222',
            padding: '20px 22px',
            marginBottom: '22px',
          }}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FF8C42', marginBottom: '8px' }}>
                Bonus awarded
              </p>
              <p className="text-sm leading-relaxed" style={{ color: T.text }}>
                <b>{n.bonus_player_name}</b> earned a 2× bonus and scores double in Round {n.round_number}.
              </p>
              {n.moved_to_name && (
                <p className="text-sm leading-relaxed" style={{ color: T.textDim, marginTop: '8px' }}>
                  A bonus player can&apos;t be your Captain, so the armband has moved to <b style={{ color: T.text }}>{n.moved_to_name}</b>.
                  Change it any time while the round is open.
                </p>
              )}
            </div>
            <button onClick={() => dismissNotice(n.id)} className="text-xl font-black shrink-0" style={{ color: T.textDim }}>×</button>
          </div>
        </div>
      ))}

      {/* ── Waiting packs — first thing on the page, before anything else ── */}
      {(t2Available || weeklyReady) && (
        <div className="rounded-2xl overflow-hidden text-center"
          style={{
            background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`,
            border: `2px solid ${T.accent}70`,
            boxShadow: `0 0 30px ${T.accent}25`,
            padding: '26px 22px 24px',
            marginBottom: '26px',
          }}>
          <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: T.accent, marginBottom: '14px' }}>
            {t2Available && weeklyReady ? 'Two packs waiting' : 'A pack is waiting'}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {t2Available && (
              <button onClick={openT2}
                className="text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] flex items-center gf-pulse"
                style={{ padding: '16px 34px', minHeight: '52px', color: '#141210', background: '#FFD700', boxShadow: '0 0 26px #FFD70070' }}>
                {packBusy ? 'Opening…' : 'Open Pre-Season Pack · 9 cards'}
              </button>
            )}
            {weeklyReady && (
              <button onClick={claimT3}
                className={"text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] flex items-center gf-pulse" + shimmer}
                style={{ padding: '16px 34px', minHeight: '52px', color: T.buttonText, background: T.button, boxShadow: T.glow }}>
                {packBusy ? 'Opening…' : 'Claim Weekly Pack · 2 cards'}
              </button>
            )}
          </div>
          {weeklyReady && (
            <p className="text-[11px] leading-relaxed" style={{ color: T.textDim, marginTop: '14px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              Claim it now for the full reveal. Leave it and the cards are added to your collection
              automatically when the next round starts — you&apos;ll still get them, you just miss the opening.
            </p>
          )}
        </div>
      )}

      {/* Jersey nameplate header */}
      <div className="rounded-2xl overflow-hidden pinstripe-fine text-center mb-6"
        style={{ background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `3px solid ${T.button}` }}>
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

      {/* Claimed state + bonus code */}
      <div className="flex items-center justify-center gap-4 flex-wrap" style={{ margin: '32px 0' }}>
        {cards.length >= 21 && t3Claimed && (
          <span className="text-xs font-black uppercase tracking-widest rounded-full flex items-center"
            style={{ padding: '14px 32px', minHeight: '48px', color: T.textDim, border: '1px solid #ffffff25' }}>
            Weekly Pack Claimed ✓
          </span>
        )}
        <div className="inline-flex rounded-full overflow-hidden" style={{ border: '1px solid #ffffff25', minHeight: '48px' }}>
          <input
            value={t4Code}
            onChange={e => setT4Code(e.target.value)}
            placeholder="Bonus pack code"
            className="font-bold uppercase tracking-widest outline-none w-44"
            autoFocus={false}
            style={{ background: 'transparent', caretColor: T.text, color: T.text, padding: '14px 24px', fontFamily: 'var(--font-label)', fontSize: '16px' }}
          />
          <button onClick={redeemT4} disabled={!t4Code.trim()}
            className={"text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40" + shimmer}
            style={{ color: T.buttonText, background: T.button, padding: '14px 28px', borderLeft: '1px solid #ffffff15' }}>
            Redeem
          </button>
        </div>
      </div>

      {!roundOpen && view === 'lineup' && (
        <div className="rounded-xl px-5 py-5 mb-6 text-base font-bold text-center" style={{ background: '#FF6B6B18', border: '2px solid #FF6B6B', color: '#FF9B9B' }}>
          🔒 Lineups are locked. Changes can&apos;t be saved until the next round opens{roundNumber != null ? ` — this is Round ${roundNumber}` : ''}.
        </div>
      )}

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
              <span className="sm:hidden landscape:hidden inline-flex items-center gap-2 gf-pulse"
                style={{
                  marginTop: '12px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: `1px solid ${T.accent}66`,
                  background: `${T.accent}14`,
                }}>
                <span style={{ fontSize: '14px', color: T.accent, lineHeight: 1 }}>↻</span>
                <span className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: T.accent }}>
                  Rotate Phone for full stats
                </span>
              </span>
            </div>
            {/* Armband status — inside the card, under the masthead */}
            <div className="flex items-center justify-center gap-6 flex-wrap text-sm"
              style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '14px 20px' }}>
              <span style={{ color: T.textDim }}>
                <b style={{ color: CAPTAIN_GOLD }}>Captain</b>{' '}
                {captainCard ? <span style={{ color: T.text }}>{splitName(captainCard.name).first} <span className="uppercase">{splitName(captainCard.name).last}</span></span> : <span style={{ opacity: 0.6 }}>not set</span>}
              </span>
              <span style={{ color: T.textDim }}>
                <b style={{ color: VICE_SILVER }}>Vice Captain</b>{' '}
                {viceCard ? <span style={{ color: T.text }}>{splitName(viceCard.name).first} <span className="uppercase">{splitName(viceCard.name).last}</span></span> : <span style={{ opacity: 0.6 }}>not set</span>}
              </span>
              {captainInReserve && (
                <span className="text-[11px] w-full text-center" style={{ color: '#FF9B9B' }}>
                  Your Captain is in your reserves and won&apos;t score — the Vice Captain will take the double.
                </span>
              )}
            </div>
            {/* Column titles */}
            <div className="hidden sm:flex landscape:flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff0a', padding: '10px 28px' }}>
              <span className="w-9 shrink-0" />
              <span className="w-11 shrink-0" />
              <span className="flex-1" />
              <span className="w-[62px] shrink-0" />
              <span className="w-20 text-center text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>Tier</span>
              <span className="w-20 text-center text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>Bat Ave.</span>
              <span className="w-12 text-right text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>SB</span>
              <span className="w-14 text-right text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>{lastRoundLabel ?? 'Prev Rd'}</span>
              <span className="w-14 text-right text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>{thisRoundLabel ?? 'Last Rd'}</span>
              {hasEarned && (
                <span className="w-16 text-right text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: accentBright }}>
                  Earned
                </span>
              )}
              <span className="w-14 text-right text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>Season</span>
            </div>

            {battingRows.map(s => <PlayerRow key={s.slot} s={s} />)}

            <div style={{ background: '#00000025' }}>
              {NON_BATTING.map(slotName => {
                const s = slots.find(x => x.slot === slotName)
                return s ? <PlayerRow key={slotName} s={s} /> : <EmptyRow key={slotName} slot={slotName} />
              })}
            </div>

            <div style={{ background: '#00000035' }}>
              {bandLabel('Bench · 0.75× · covers absences at full points')}
              {BENCH_SLOTS.map(b => {
                const s = slots.find(x => x.slot === b)
                return s ? <PlayerRow key={b} s={s} /> : <EmptyRow key={b} slot={b} />
              })}
            </div>

            <div style={{ background: '#00000045' }}>
              {bandLabel('Reserve · No score · promoted automatically when the bench is used')}
              {RES_SLOTS.map(r => {
                const s = slots.find(x => x.slot === r)
                return s ? <PlayerRow key={r} s={s} /> : <EmptyRow key={r} slot={r} />
              })}
            </div>

            {hasEarned && (
              <div className="flex items-center justify-between" style={{ background: '#00000055', borderTop: `1px solid ${accentBright}30`, padding: '16px 28px' }}>
                <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim }}>
                  {earnedLabel} total earned
                </span>
                <span className="text-lg font-black" style={{ color: accentBright, fontFamily: 'var(--font-heading)' }}>
                  {fmt(earnedTotal)}
                </span>
              </div>
            )}

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

          <div className="text-center" style={{ marginTop: '24px' }}>
            <a href={`/analytics?grade=${grade}`}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
              style={{ color: accentBright, border: `1px solid ${accentBright}50`, background: `${T.accent}10`, padding: '14px 28px' }}>
              Manager Report →
            </a>
            <p className="text-[11px]" style={{ color: T.textDim, marginTop: '10px' }}>
              How much of your squad&apos;s output you actually banked — and where the rest went.
            </p>
          </div>

          <p className="text-[11px] text-center mt-4" style={{ color: T.textDim }}>
            Numbers 1–10 are your batting order — drag or tap them to reorder · 11–16 mark your other scoring players and stay put · Tap C for Captain and VC for Vice Captain · Tap a name for the player card · Tap a position chip to change who fills it.
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
              style={{
                background: roundOpen ? `${T.field}F0` : '#3A1215F0',
                borderTop: roundOpen ? `1px solid ${T.accent}40` : '2px solid #FF6B6B',
                padding: '14px 24px', backdropFilter: 'blur(8px)',
              }}>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: roundOpen ? T.textDim : '#FF9B9B' }}>
                  {roundOpen ? 'Unsaved changes' : '🔒 Lineups locked — changes won\'t save'}
                </span>
                <button onClick={save} disabled={saving || !roundOpen}
                  className={"text-sm font-black uppercase tracking-widest px-8 py-3 rounded-full transition-all hover:scale-[1.02] disabled:opacity-50" + (roundOpen ? shimmer : '')}
                  style={roundOpen
                    ? { color: T.buttonText, background: T.button, boxShadow: T.glow }
                    : { color: '#FF9B9B', background: 'transparent', border: '1px solid #FF6B6B' }}>
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
                  player={{ id: c.id, name: c.name, tier: c.tier, positions: c.positions, club: c.club, stats: c.stats, photoUrl: c.photoUrl, playingNumber: c.playingNumber }}
                  grade={grade}
                  owned={true}
                  siteTheme={siteTheme}
                  cardStyle={cardStyle}
                  chip={inLineup ? `IN ${SLOT_LABELS[slot ?? ''] ?? ''}` : undefined}
                  doubled={doubled.has(c.playerId)}
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
                    <span className="text-[11px]" style={{ color: T.textDim }}>{c.stats.season_ba != null ? Number(c.stats.season_ba).toFixed(3) : ''}</span>
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
              <div className="flex items-center justify-between" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '16px 22px' }}>
                <div className="flex items-center gap-3">
                  {isOut && <span className="text-[9px] font-black px-2 py-0.5 rounded" style={{ background: '#FF6B6B', color: '#141210' }}>OUT THIS ROUND</span>}
                  {currentSlot && <span className="text-[10px] uppercase tracking-widest" style={{ color: T.textDim }}>currently {SLOT_LABELS[currentSlot] ?? currentSlot}</span>}
                </div>
                <button onClick={() => setDetailCard(null)} className="text-xl font-black" style={{ color: T.textDim }}>×</button>
              </div>
              <div className="overflow-y-auto px-6 py-5 sm:grid sm:grid-cols-[1fr_1.3fr] sm:gap-7 sm:items-start" style={{ maxHeight: "calc(94vh - 64px)" }}>
                <div className="mb-6 sm:mb-0">
                  <p className="text-center mb-3">
                    <span className="text-[11px] font-black tracking-[0.3em] px-4 py-1.5 rounded-full" style={{ color: meta.accent, background: meta.accent + '20', textShadow: `0 0 10px ${meta.accent}60` }}>{meta.label}</span>
                  </p>
                  <PlayerCardFull
                    player={{ id: c.playerId, name: c.name, tier: c.tier, positions: c.positions, club: c.club, stats: c.stats, photoUrl: c.photoUrl, playingNumber: c.playingNumber }}
                    grade={grade}
                    owned={true}
                    siteTheme={siteTheme}
                    cardStyle={cardStyle}
                    flippable={true}
                    doubled={doubled.has(c.playerId)}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1 text-center" style={{ color: T.textDim }}>Place on the field</p>
                  <FieldPicker
                    grade={grade}
                    eligible={new Set(placeTargets)}
                    current={currentSlot ?? null}
                    onSelect={(slot) => assignToSlot(slot, c.id)}
                  />
                  <p className="text-[10px] mt-3 text-center" style={{ color: T.textDim }}>Whoever holds that spot swaps into this player&apos;s current position.</p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
      {view === 'lineup' && <PageGuide pageKey="team" steps={TEAM_GUIDE} accent={T.accent} textColor={T.text} />}
      {view === 'collection' && (
        <PageGuide pageKey="team-collection" accent={T.accent} textColor={T.text} steps={[
          {
            title: 'Your collection',
            body: 'Every card you own. Tap any card to open it full size, then tap the open card to flip it — the back shows their stats and points round by round. Sort by tier, batting average, or points using the buttons up top.',
          },
        ]} />
      )}
      {reveal && (
        <PackReveal
          grade={grade}
          cardStyle={cardStyle}
          packName={reveal.packName}
          cards={reveal.cards}
          onDone={() => { setReveal(null); router.refresh() }}
        />
      )}
    </div>
  )
}