import { SupabaseClient } from '@supabase/supabase-js'
import { slotPoints, applyBench, updateSeasonTotals, battingPoints, pitchingPoints, resolveSubs, StatLine, PointValues, SlotAssignment } from '@/lib/scoring'

export type ScoreRoundResult =
  | { ok: true; players_scored: number; teams_scored: number; matchups_resolved: number }
  | { ok: false; error: string; status: number }

// Scores a round end-to-end: player scores, season totals, team scores
// (carry-forward + substitution cascade), and H2H matchup resolution.
// admin must be a service-role client.
export async function scoreRound(admin: SupabaseClient, round_id: string): Promise<ScoreRoundResult> {
  const { data: round } = await admin.from('rounds')
    .select('id, grade, round_number').eq('id', round_id).single()
  if (!round) return { ok: false, error: 'Round not found', status: 404 }

  const { data: config } = await admin.from('scoring_config').select('values').eq('grade', round.grade).single()
  if (!config) return { ok: false, error: 'No scoring config for grade', status: 500 }
  const v = config.values as PointValues

  const { data: stats } = await admin.from('player_stats').select('player_id, raw').eq('round_id', round_id)
  if (!stats || stats.length === 0) return { ok: false, error: 'No stats uploaded for round', status: 400 }

  // 1. Player scores
  const playerScores = stats.map(s => {
    const line = s.raw as StatLine
    return {
      player_id: s.player_id, round_id,
      points: battingPoints(line, v) + pitchingPoints(line, v),
      breakdown: { bat: battingPoints(line, v), pit: pitchingPoints(line, v) },
    }
  })
  await admin.from('player_scores').upsert(playerScores, { onConflict: 'player_id,round_id' })

  // 2. Season totals with display floors
  for (const ps of playerScores) {
    const { data: prev } = await admin.from('player_season_totals')
      .select('true_total, floor_locked').eq('player_id', ps.player_id).eq('grade', round.grade).maybeSingle()
    const next = updateSeasonTotals(Number(prev?.true_total ?? 0), Number(prev?.floor_locked ?? 0), ps.points)
    await admin.from('player_season_totals').upsert(
      { player_id: ps.player_id, grade: round.grade, ...next },
      { onConflict: 'player_id,grade' })
  }

  // 3. Team scores with carry-forward + full substitution cascade
  const statByPlayer = new Map(stats.map(s => [s.player_id, s.raw as StatLine]))
  const played = new Set(stats.map(s => s.player_id))

  const { data: allLineups } = await admin.from('lineups')
    .select('id, owner_id, grade, rounds!inner(round_number), lineup_slots(slot, card_id, cards(player_id, players(positions)))')
    .eq('grade', round.grade)

  type SlotRow = { slot: string; cards: { player_id: string; players: { positions: string[] } | null } | null }
  type LineupRec = { id: string; owner_id: string; rounds: { round_number: number }; lineup_slots: SlotRow[] }

  const latestByOwner = new Map<string, LineupRec>()
  for (const lu of (allLineups ?? []) as unknown as LineupRec[]) {
    if (lu.rounds.round_number > round.round_number) continue
    const cur = latestByOwner.get(lu.owner_id)
    if (!cur || lu.rounds.round_number > cur.rounds.round_number) {
      latestByOwner.set(lu.owner_id, lu)
    }
  }

  const userScores: { owner_id: string; round_id: string; grade: string; points: number }[] = []

  for (const lu of latestByOwner.values()) {
    const rows = ((lu.lineup_slots ?? []) as SlotRow[])
      .filter(r => r.cards?.player_id)
      .map(r => ({
        slot: r.slot,
        player_id: r.cards!.player_id,
        positions: r.cards!.players?.positions ?? [],
      })) as SlotAssignment[]

    const starters = rows.filter(r => !r.slot.startsWith('BENCH') && !r.slot.startsWith('RES'))
    const bench = rows.filter(r => r.slot.startsWith('BENCH'))
    const reserves = rows.filter(r => r.slot.startsWith('RES'))

    const { scored } = resolveSubs(starters, bench, reserves, played)

    let total = 0
    for (const sc of scored) {
      const line = statByPlayer.get(sc.player_id)
      if (!line) continue
      const effectiveSlot = sc.slot === 'BENCH' ? 'DP' : sc.slot
      const raw = slotPoints(effectiveSlot, line, v)
      total += sc.slot === 'BENCH' ? applyBench(raw, 'BENCH1', v, false) : raw
    }
    userScores.push({ owner_id: lu.owner_id, round_id, grade: round.grade, points: total })
  }
  if (userScores.length) {
    await admin.from('user_scores').upsert(userScores, { onConflict: 'owner_id,round_id' })
  }

  // 4. Resolve H2H matchups
  await admin.rpc('pair_round', { p_round_id: round_id })

  const scoreByOwner = new Map(userScores.map(us => [us.owner_id, us.points]))
  const { data: matchups } = await admin.from('matchups')
    .select('id, user_a, user_b').eq('round_id', round_id)

  let resolved = 0
  for (const m of matchups ?? []) {
    const a = scoreByOwner.get(m.user_a) ?? 0
    const b = scoreByOwner.get(m.user_b) ?? 0
    const pa = a > b ? 1 : a < b ? 0 : 0.5
    await admin.from('matchups').update({
      score_a: a, score_b: b, points_a: pa, points_b: 1 - pa,
    }).eq('id', m.id)
    resolved++
  }

  return { ok: true, players_scored: playerScores.length, teams_scored: userScores.length, matchups_resolved: resolved }
}