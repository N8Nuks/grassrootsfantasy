import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slotPoints, applyBench, updateSeasonTotals, battingPoints, pitchingPoints, StatLine, PointValues } from '@/lib/scoring'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const adminCheck = createAdminClient()
  const { data: profile } = await adminCheck.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) {
  }

  const { round_id } = await request.json() as { round_id: string }
  const admin = createAdminClient()

  const { data: round } = await admin.from('rounds').select('id, grade').eq('id', round_id).single()
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const { data: config } = await admin.from('scoring_config').select('values').eq('grade', round.grade).single()
  if (!config) return NextResponse.json({ error: 'No scoring config for grade' }, { status: 500 })
  const v = config.values as PointValues

  const { data: stats } = await admin.from('player_stats').select('player_id, raw').eq('round_id', round_id)
  if (!stats || stats.length === 0) return NextResponse.json({ error: 'No stats uploaded for round' }, { status: 400 })

  // 1. Player scores (neutral: full bat+pit as the player's own round score)
  const playerScores = stats.map(s => {
    const line = s.raw as StatLine
    const pts = battingPoints(line, v) + pitchingPoints(line, v)
    return { player_id: s.player_id, round_id, points: pts, breakdown: { bat: battingPoints(line, v), pit: pitchingPoints(line, v) } }
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

  // 3. User team scores: locked lineups for this round, slot rules, bench sub logic
  const statByPlayer = new Map(stats.map(s => [s.player_id, s.raw as StatLine]))
  const { data: lineups } = await admin.from('lineups')
    .select('id, owner_id, lineup_slots(slot, card_id, cards(player_id))')
    .eq('round_id', round_id)

  const userScores: { owner_id: string; round_id: string; grade: string; points: number }[] = []
  for (const lu of lineups ?? []) {
    let total = 0
    type SlotRow = { slot: string; cards: { player_id: string } | null }
    for (const slotRow of (lu.lineup_slots as unknown as SlotRow[]) ?? []) {
      const playerId = slotRow.cards?.player_id
      if (!playerId) continue
      const line = statByPlayer.get(playerId)
      if (!line) continue // player didn't feature: 0 (bench auto-sub is a future iteration)
      if (slotRow.slot.startsWith('RES')) continue
      const raw = slotPoints(slotRow.slot.startsWith('BENCH') ? 'DP' : slotRow.slot, line, v)
      total += applyBench(raw, slotRow.slot, v, false)
    }
    userScores.push({ owner_id: lu.owner_id, round_id, grade: round.grade, points: total })
  }
  if (userScores.length) {
    await admin.from('user_scores').upsert(userScores, { onConflict: 'owner_id,round_id' })
  }

  return NextResponse.json({ players_scored: playerScores.length, teams_scored: userScores.length })
}