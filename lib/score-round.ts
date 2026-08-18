import { SupabaseClient } from '@supabase/supabase-js'
import { slotPoints, applyBench, applyDouble, armbandHolder, isCycle, updateSeasonTotals, battingPoints, pitchingPoints, resolveSubs, StatLine, PointValues, SlotAssignment } from '@/lib/scoring'
import { moveArmbandsOffDoubled } from '@/lib/armbands'

export type ScoreRoundResult =
  | { ok: true; players_scored: number; teams_scored: number; matchups_resolved: number; cycles: number; doubled: number }
  | { ok: false; error: string; status: number }

// Scores a round end-to-end: player scores, season totals, team scores
// (carry-forward + substitution cascade), and H2H matchup resolution.
// admin must be a service-role client.
export async function scoreRound(admin: SupabaseClient, round_id: string): Promise<ScoreRoundResult> {
  const { data: round } = await admin.from('rounds')
    .select('id, grade, round_number, status').eq('id', round_id).single()
  if (!round) return { ok: false, error: 'Round not found', status: 404 }

  // Scoring publishes: a scored round becomes provisional (unless already confirmed)
  if (round.status !== 'confirmed') {
    await admin.from('rounds').update({ status: 'provisional' }).eq('id', round_id)
  }

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

  // 1b. Cycles earned this round — the double lands NEXT round.
  // Perfect games are entered by hand in Admin; only the cycle is computable.
  const cycleRows = stats
    .filter(s => isCycle(s.raw as StatLine))
    .map(s => ({
      player_id: s.player_id,
      grade: round.grade,
      kind: 'cycle',
      earned_round_id: round_id,
      applies_round_number: round.round_number + 1,
    }))
  if (cycleRows.length) {
    await admin.from('player_achievements')
      .upsert(cycleRows, { onConflict: 'player_id,earned_round_id,kind' })
  }

  // 1c. Who is doubled IN this round — earned in an earlier round, applying now
  const { data: dueRows } = await admin.from('player_achievements')
    .select('player_id')
    .eq('grade', round.grade)
    .eq('applies_round_number', round.round_number)
  const doubledPlayers = new Set((dueRows ?? []).map(r => r.player_id))

  // 2. Season totals with display floors
  for (const ps of playerScores) {
    const { data: prev } = await admin.from('player_season_totals')
      .select('true_total, floor_locked').eq('player_id', ps.player_id).eq('grade', round.grade).maybeSingle()
    const next = updateSeasonTotals(Number(prev?.true_total ?? 0), Number(prev?.floor_locked ?? 0), ps.points)
    await admin.from('player_season_totals').upsert(
      { player_id: ps.player_id, grade: round.grade, ...next },
      { onConflict: 'player_id,grade' })
  }

  // 2b. Season stats onto players (recomputed from ALL scored rounds — re-run safe)
  const { data: gradeRounds } = await admin.from('rounds')
    .select('id').eq('grade', round.grade)
  const gradeRoundIds = (gradeRounds ?? []).map(r => r.id)

  const { data: allStats } = await admin.from('player_stats')
    .select('player_id, raw').in('round_id', gradeRoundIds)
  const { data: allScores } = await admin.from('player_scores')
    .select('player_id, points').in('round_id', gradeRoundIds)

  const pointsByPlayer = new Map<string, number>()
  for (const s of allScores ?? []) {
    pointsByPlayer.set(s.player_id, (pointsByPlayer.get(s.player_id) ?? 0) + Number(s.points))
  }

  const aggByPlayer = new Map<string, Record<string, number>>()
  for (const s of allStats ?? []) {
    const line = s.raw as StatLine
    const a = aggByPlayer.get(s.player_id) ?? { ab: 0, hits: 0, hr: 0, rbi: 0, sb: 0, wins: 0, k_pit: 0, ip: 0, runs: 0 }
    a.ab += Number(line.ab) || 0
    a.hits += (Number(line.singles) || 0) + (Number(line.doubles) || 0) + (Number(line.triples) || 0) + (Number(line.hr) || 0)
    a.hr += Number(line.hr) || 0
    a.rbi += Number(line.rbi) || 0
    a.runs += Number(line.runs) || 0
    a.sb += Number(line.sb) || 0
    a.wins += Number(line.win) || 0
    a.k_pit += Number(line.k_pit) || 0
    a.ip += Number(line.ip) || 0
    aggByPlayer.set(s.player_id, a)
  }

  for (const [playerId, a] of aggByPlayer) {
    const { data: p } = await admin.from('players').select('stats').eq('id', playerId).single()
    const existing = (p?.stats ?? {}) as Record<string, number>
    const seasonStats: Record<string, number> = {
      ...existing,
      season_hr: a.hr,
      season_rbi: a.rbi,
      season_sb: a.sb,
      season_runs: a.runs,
      season_wins: a.wins,
      season_k_pit: a.k_pit,
      season_ip: a.ip,
      season_points: pointsByPlayer.get(playerId) ?? 0,
    }
    if (a.ab > 0) seasonStats.season_ba = a.hits / a.ab
    else delete seasonStats.season_ba
    await admin.from('players').update({ stats: seasonStats }).eq('id', playerId)
  }

  // 3. Team scores with carry-forward + full substitution cascade
  const statByPlayer = new Map(stats.map(s => [s.player_id, s.raw as StatLine]))

  // Appearing in the upload isn't the same as playing. A player named on the
  // sheet who never reached the plate or the mound can't score, so they're
  // treated as absent and the substitution cascade fills their slot.
  // Plate appearance = AB + BB + HBP (AB alone misses a walk-only game).
  const hasPlayed = (line: StatLine) => {
    const n = (x: unknown) => Number(x) || 0
    const plateAppearances = n(line.ab) + n(line.bb) + n(line.hbp)
    const pitched = n(line.ip) + n(line.k_pit) + n(line.win) + n(line.er)
    return plateAppearances > 0 || pitched > 0
  }
  const played = new Set(
    stats.filter(s => hasPlayed(s.raw as StatLine)).map(s => s.player_id)
  )

  const { data: allLineups } = await admin.from('lineups')
    .select('id, owner_id, grade, captain_card_id, vice_captain_card_id, rounds!inner(round_number), lineup_slots(slot, card_id, cards(player_id, players(positions)))')
    .eq('grade', round.grade)

  type SlotRow = { slot: string; card_id: string; cards: { player_id: string; players: { positions: string[] } | null } | null }
  type LineupRec = { id: string; owner_id: string; captain_card_id: string | null; vice_captain_card_id: string | null; rounds: { round_number: number }; lineup_slots: SlotRow[] }

  const latestByOwner = new Map<string, LineupRec>()
  for (const lu of (allLineups ?? []) as unknown as LineupRec[]) {
    if (lu.rounds.round_number > round.round_number) continue
    const cur = latestByOwner.get(lu.owner_id)
    if (!cur || lu.rounds.round_number > cur.rounds.round_number) {
      latestByOwner.set(lu.owner_id, lu)
    }
  }

  const userScores: { owner_id: string; round_id: string; grade: string; points: number }[] = []
  // Per-manager record of what each card actually earned, and why it differs
  // from the raw stat line. Drives the Earned column on the Lineup Card.
  const earnings: {
    owner_id: string; round_id: string; player_id: string
    grade: string; slot: string; earned: number; reason: string | null
  }[] = []

  for (const lu of latestByOwner.values()) {
    const rows = ((lu.lineup_slots ?? []) as SlotRow[])
      .filter(r => r.cards?.player_id)
      .map(r => ({
        slot: r.slot,
        player_id: r.cards!.player_id,
        positions: r.cards!.players?.positions ?? [],
      })) as SlotAssignment[]

    // Reconstruct vacant scoring slots (e.g. a card removed mid-season) so the
    // substitution cascade can fill them like any absent starter
    const SCORING_SLOTS = ['P','C','B1','B2','B3','SS','LF','CF','RF','DP','PB','DR']
    const presentSlots = new Set(rows.map(r => r.slot))
    const vacancies: SlotAssignment[] = SCORING_SLOTS
      .filter(sl => !presentSlots.has(sl))
      .map(sl => ({ slot: sl, player_id: '__vacant__', positions: [] }))
    const starters = [...rows.filter(r => !r.slot.startsWith('BENCH') && !r.slot.startsWith('RES')), ...vacancies]
    const bench = rows.filter(r => r.slot.startsWith('BENCH'))
    const reserves = rows.filter(r => r.slot.startsWith('RES'))

    const { scored } = resolveSubs(starters, bench, reserves, played)

    // Armbands are stored as card ids — map to the player who holds them.
    // A Captain who didn't score (absent, or sitting in reserve and never
    // promoted) hands the double to the Vice Captain.
    const playerOfCard = new Map(
      ((lu.lineup_slots ?? []) as SlotRow[])
        .filter(r => r.cards?.player_id)
        .map(r => [r.card_id, r.cards!.player_id]))
    const captainPlayer = lu.captain_card_id ? playerOfCard.get(lu.captain_card_id) ?? null : null
    const vicePlayer = lu.vice_captain_card_id ? playerOfCard.get(lu.vice_captain_card_id) ?? null : null
    const scoredIds = new Set(scored.map(sc => sc.player_id))
    const armband = armbandHolder(scoredIds, captainPlayer, vicePlayer)

    let total = 0
    const earnedByPlayer = new Map<string, { slot: string; earned: number; reason: string | null }>()

    for (const sc of scored) {
      const line = statByPlayer.get(sc.player_id)
      if (!line) continue
      const effectiveSlot = sc.slot === 'BENCH' ? 'DP' : sc.slot
      // Floor first, then the achievement double OR the armband double (never both
      // — a doubled player can't wear an armband), then the bench multiplier.
      // So a Captain on the bench scores points x2 x0.75 = 1.5x.
      const isDoubled = doubledPlayers.has(sc.player_id)
      const hasArmband = sc.player_id === armband
      const base = slotPoints(effectiveSlot, line, v)
      const raw = applyDouble(base, isDoubled || hasArmband)
      const final = sc.slot === 'BENCH' ? applyBench(raw, 'BENCH1', v, false) : raw
      total += final

      // Why this differs from the raw stat line, most notable reason first
      const reasons: string[] = []
      if (isDoubled) reasons.push('2× Bonus')
      if (sc.slot === 'BENCH') reasons.push('0.75× Bench')
      if (sc.promoted) reasons.push('Promoted')
      if (sc.slot === 'PB') reasons.push('Pitching only')
      if (sc.slot === 'DR') reasons.push('Steals only')
  
      // resolveSubs labels unused bench players generically — recover their real
      // slot from the lineup so the card can match rows to positions
      const realSlot = sc.slot === 'BENCH'
        ? (rows.find(r => r.player_id === sc.player_id)?.slot ?? sc.slot)
        : sc.slot
      earnedByPlayer.set(sc.player_id, {
        slot: realSlot,
        earned: final,
        reason: reasons.length ? reasons.join(' · ') : null,
      })
    }

    // Everyone on the card who earned nothing — reserves, absentees, unused bench
    for (const r of rows) {
      if (earnedByPlayer.has(r.player_id)) continue
      const reason = r.slot.startsWith('RES')
        ? 'No score'
        : (played.has(r.player_id) ? 'Not in a scoring slot' : 'Did not play')
      earnedByPlayer.set(r.player_id, { slot: r.slot, earned: 0, reason })
    }

    for (const [playerId, e] of earnedByPlayer) {
      earnings.push({
        owner_id: lu.owner_id, round_id, player_id: playerId,
        grade: round.grade, slot: e.slot, earned: e.earned, reason: e.reason,
      })
    }

    userScores.push({ owner_id: lu.owner_id, round_id, grade: round.grade, points: total })
  }
  if (userScores.length) {
    await admin.from('user_scores').upsert(userScores, { onConflict: 'owner_id,round_id' })
  }
  // Re-scoring a round overwrites cleanly via the unique constraint.
  // Errors are surfaced rather than swallowed — a silent failure here leaves the
  // Lineup Card unable to explain its own totals.
  for (let i = 0; i < earnings.length; i += 500) {
    const { error: eErr } = await admin.from('lineup_earnings')
      .upsert(earnings.slice(i, i + 500), { onConflict: 'owner_id,round_id,player_id,slot' })
    if (eErr) return { ok: false, error: 'Earnings insert failed: ' + eErr.message, status: 500 }
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

  // 5. Armbands off anyone due a bonus next round, and notify their managers
  await moveArmbandsOffDoubled(admin, round.grade as 'mens' | 'womens', round.round_number)

  return {
    ok: true,
    players_scored: playerScores.length,
    teams_scored: userScores.length,
    matchups_resolved: resolved,
    cycles: cycleRows.length,
    doubled: doubledPlayers.size,
  }
}