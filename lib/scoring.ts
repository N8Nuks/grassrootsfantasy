// Grassroots Fantasy scoring engine — Season One
// Order of operations: raw events -> point table -> ROUND FLOOR (no player scores
// below 0 in any round; negatives only reduce positive scoring) -> slot/bench
// modifier -> team sums (true)
// Player display floors applied ONLY to player_season_totals.displayed_total

export type StatLine = {
  singles?: number; doubles?: number; triples?: number; hr?: number
  rbi?: number; runs?: number; bb?: number; hbp?: number
  sb?: number; cs?: number; k_bat?: number
  ip?: number; k_pit?: number; win?: number; er?: number
}

export type PointValues = Record<string, number> & {
  bench_mult: number
}

const BAT_KEYS: [keyof StatLine, string][] = [
  ['singles','single'],['doubles','double'],['triples','triple'],['hr','hr'],
  ['rbi','rbi'],['runs','run'],['bb','bb'],['hbp','hbp'],
  ['sb','sb'],['cs','cs'],['k_bat','k_bat'],
]
const PIT_KEYS: [keyof StatLine, string][] = [
  ['ip','ip'],['k_pit','k_pit'],['win','win'],['er','er'],
]

// Raw subtotals (can be negative) — used internally, floored at combination points
function battingRaw(s: StatLine, v: PointValues): number {
  return BAT_KEYS.reduce((sum, [stat, key]) => sum + (Number(s[stat]) || 0) * (v[key] ?? 0), 0)
}

function pitchingRaw(s: StatLine, v: PointValues): number {
  return PIT_KEYS.reduce((sum, [stat, key]) => sum + (Number(s[stat]) || 0) * (v[key] ?? 0), 0)
}

// ROUND FLOOR RULE: no player scores below 0 in any round, on any basis.
// Negatives (CS, batting K, ER) only ever reduce positive scoring.
export function battingPoints(s: StatLine, v: PointValues): number {
  return Math.max(battingRaw(s, v), 0)
}

export function pitchingPoints(s: StatLine, v: PointValues): number {
  return Math.max(pitchingRaw(s, v), 0)
}

// Slot scoring rules (locked spec + round floor)
// Note: P slot combines the RAW subtotals then floors once — so a strong pitching
// day still absorbs a bad batting day before the floor applies.
export function slotPoints(slot: string, s: StatLine, v: PointValues): number {
  switch (slot) {
    case 'P': return Math.max(battingRaw(s, v) + pitchingRaw(s, v), 0)  // 2WP A: both sides, floored once
    case 'PB': return pitchingPoints(s, v)          // pitching only
    case 'DP': return battingPoints(s, v)           // offence only
    case 'C': return battingPoints(s, v)            // hitting only
    case 'DR': {                                    // SB/CS only, floored
      const raw = (Number(s.sb) || 0) * (v['sb'] ?? 0) + (Number(s.cs) || 0) * (v['cs'] ?? 0)
      return Math.max(raw, 0)
    }
    default: return battingPoints(s, v)             // all field positions: batting
  }
}

export function applyBench(points: number, slot: string, v: PointValues, promoted: boolean): number {
  if (!slot.startsWith('BENCH')) return points
  return promoted ? points : points * (v.bench_mult ?? 0.75)
}

// Display floor ladder: 0 / 5 / 10 / 15 / 20, ratchet stops at 20
// (Round floor means roundPoints is never negative now; negative-guard retained
// for safety against direct calls with raw values.)
export function updateSeasonTotals(prevTrue: number, prevFloor: number, roundPoints: number) {
  const effectiveRound = prevTrue <= 0 && roundPoints < 0 ? 0 : roundPoints
  const newTrue = prevTrue + effectiveRound
  let floor = prevFloor
  for (const step of [5, 10, 15, 20]) {
    if (newTrue >= step && floor < step) floor = step
  }
  const displayed = Math.max(newTrue, floor, 0)
  return { true_total: newTrue, floor_locked: floor, displayed_total: displayed }
}

// ── Bench auto-substitution cascade ──
// Locked spec: starter absent -> first bench player covering the position promotes
// at FULL points -> bench compresses up one -> first reserve promotes to last bench
// spot. Chain repeats to keep 16 scoring slots filled. No eligible cover = slot
// scores nothing (byes are roster construction, not the system's problem).
export type SlotAssignment = { slot: string; player_id: string; positions: string[] }

export function resolveSubs(
  starters: SlotAssignment[],
  bench: SlotAssignment[],
  reserves: SlotAssignment[],
  played: Set<string>,
): { scored: { slot: string; player_id: string; promoted: boolean }[] } {
  const scored: { slot: string; player_id: string; promoted: boolean }[] = []
  // Working copies, in slot order (BENCH1..4, RES1..5)
  const benchQ = [...bench].sort((a, b) => a.slot.localeCompare(b.slot))
  const resQ = [...reserves].sort((a, b) => a.slot.localeCompare(b.slot))

  const coversSlot = (p: SlotAssignment, slot: string) =>
    slot === 'DP' || slot === 'DR' || p.positions.includes(slot)

  const SLOT_PRIORITY = ['P','C','B1','B2','B3','SS','LF','CF','RF','DP','PB','DR']
  const orderedStarters = [...starters].sort((a, b) =>
    SLOT_PRIORITY.indexOf(a.slot) - SLOT_PRIORITY.indexOf(b.slot))

  for (const s of orderedStarters) {
    if (played.has(s.player_id)) {
      scored.push({ slot: s.slot, player_id: s.player_id, promoted: false })
      continue
    }
    // Starter absent: first bench player (in order) who played and covers the slot
    const idx = benchQ.findIndex(b => played.has(b.player_id) && coversSlot(b, s.slot))
    if (idx !== -1) {
      const sub = benchQ[idx]
      scored.push({ slot: s.slot, player_id: sub.player_id, promoted: true })
      benchQ.splice(idx, 1)
      // First played reserve backfills the vacated bench spot
      const rIdx = resQ.findIndex(r => played.has(r.player_id))
      if (rIdx !== -1) {
        benchQ.push(resQ[rIdx])
        resQ.splice(rIdx, 1)
      }
      continue
    }
    // Bench can't cover: first played reserve who covers the slot promotes through
    const dIdx = resQ.findIndex(r => played.has(r.player_id) && coversSlot(r, s.slot))
    if (dIdx === -1) continue // genuinely no cover -> slot scores nothing
    scored.push({ slot: s.slot, player_id: resQ[dIdx].player_id, promoted: true })
    resQ.splice(dIdx, 1)
  }

  // Remaining bench players who played score at bench multiplier
  for (const b of benchQ) {
    if (played.has(b.player_id)) {
      scored.push({ slot: 'BENCH', player_id: b.player_id, promoted: false })
    }
  }
  return { scored }
}