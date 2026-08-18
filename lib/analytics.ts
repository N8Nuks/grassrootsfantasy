import { SupabaseClient } from '@supabase/supabase-js'

export type ManagerAnalytics = {
  roundsScored: number
  earnedTotal: number       // what your lineups actually produced
  squadRawTotal: number     // what every card you own produced, in total
  capturedPct: number       // earnedTotal / squadRawTotal
  benchLoss: number         // points shaved by the 0.75x multiplier
  slotLoss: number          // points lost to slot rules (P(B) not pitching, DR, etc)
  reserveWaste: number      // raw points scored by cards sitting in reserves
  armbandGain: number       // extra points from Captain and Vice Captain
  bestCall: { name: string; earned: number; round: number } | null
  worstCall: { name: string; raw: number; round: number } | null
}

/* Everything here is derived, not stored — lineup_earnings holds what each card
   was worth to this manager, player_scores holds what it scored on its own.
   The gap between them is the story: slot rules, the bench multiplier, reserves
   left unused, and the armbands. */
export async function managerAnalytics(
  supabase: SupabaseClient,
  ownerId: string,
  grade: 'mens' | 'womens',
): Promise<ManagerAnalytics | null> {
  const { data: earnRows } = await supabase
    .from('lineup_earnings')
    .select('round_id, player_id, slot, earned, reason')
    .eq('owner_id', ownerId).eq('grade', grade)
  if (!earnRows || earnRows.length === 0) return null

  const roundIds = [...new Set(earnRows.map(r => r.round_id))]
  const playerIds = [...new Set(earnRows.map(r => r.player_id))]

  const [{ data: scores }, { data: players }, { data: rounds }] = await Promise.all([
    supabase.from('player_scores').select('player_id, round_id, points')
      .in('round_id', roundIds).in('player_id', playerIds),
    supabase.from('players').select('id, full_name').in('id', playerIds),
    supabase.from('rounds').select('id, round_number').in('id', roundIds),
  ])

  const rawOf = new Map<string, number>()
  for (const s of scores ?? []) rawOf.set(`${s.round_id}:${s.player_id}`, Number(s.points))
  const nameOf = new Map((players ?? []).map(p => [p.id, p.full_name as string]))
  const roundNoOf = new Map((rounds ?? []).map(r => [r.id, r.round_number as number]))

  let earnedTotal = 0, squadRawTotal = 0, benchLoss = 0, slotLoss = 0
  let reserveWaste = 0, armbandGain = 0
  let bestCall: ManagerAnalytics['bestCall'] = null
  let worstCall: ManagerAnalytics['worstCall'] = null

  for (const r of earnRows) {
    const earned = Number(r.earned)
    const raw = rawOf.get(`${r.round_id}:${r.player_id}`) ?? 0
    const reason = r.reason ?? ''
    earnedTotal += earned
    squadRawTotal += raw

    if (r.slot.startsWith('RES')) {
      // A card that scored while parked in the reserves — points you owned but never used
      reserveWaste += raw
    } else if (reason.includes('Bench')) {
      // The 0.75x shave, measured against what they'd have scored as a starter.
      // An armband on the bench is multiplied first, so measure off that.
      const mult = reason.includes('2× Captain') ? 2 : reason.includes('1.5× Vice') ? 1.5 : 1
      benchLoss += (raw * mult) - earned
    } else if (raw > 0 && earned < raw && !reason.includes('2×') && !reason.includes('1.5×')) {
      // Slot rules ate it: a P(B) who didn't pitch, a DR with no steals
      slotLoss += raw - earned
    }

    // What the armbands actually added on top of the base
    if (reason.includes('2× Captain')) armbandGain += earned / 2
    else if (reason.includes('1.5× Vice')) armbandGain += earned / 3

    if (earned > 0 && (!bestCall || earned > bestCall.earned)) {
      bestCall = { name: nameOf.get(r.player_id) ?? '', earned, round: roundNoOf.get(r.round_id) ?? 0 }
    }
    if (earned === 0 && raw > 0 && (!worstCall || raw > worstCall.raw)) {
      worstCall = { name: nameOf.get(r.player_id) ?? '', raw, round: roundNoOf.get(r.round_id) ?? 0 }
    }
  }

  return {
    roundsScored: roundIds.length,
    earnedTotal,
    squadRawTotal,
    capturedPct: squadRawTotal > 0 ? earnedTotal / squadRawTotal : 0,
    benchLoss,
    slotLoss,
    reserveWaste,
    armbandGain,
    bestCall,
    worstCall,
  }
}