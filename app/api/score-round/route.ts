import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slotPoints, applyBench, updateSeasonTotals, battingPoints, pitchingPoints, resolveSubs, StatLine, PointValues, SlotAssignment } from '@/lib/scoring'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createAdminClient()
  const { data: adminProfile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { round_id } = await request.json() as { round_id: string }

  const { data: round } = await admin.from('rounds').select('id, grade').eq('id', round_id).single()
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const { data: config } = await admin.from('scoring_config').select('values').eq('grade', round.grade).single()
  if (!config) return NextResponse.json({ error: 'No scoring config for grade' }, { status: 500 })
  const v = config.values as PointValues

  const { data: stats } = await admin.from('player_stats').select('player_id, raw').eq('round_id', round_id)
  if (!stats || stats.length === 0) return NextResponse.json({ error: 'No stats uploaded for round' }, { status: 400 })

  // 1. Player scores (player's own full round score)
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

  // 3. Team scores with bench auto-substitution
  const statByPlayer = new Map(stats.map(s => [s.player_id, s.raw as StatLine]))
  const played = new Set(stats.map(s => s.player_id))

  const { data: lineups } = await admin.from('lineups')
    .select('id, owner_id, lineup_slots(slot, card_id, cards(player_id, players(positions)))')
    .eq('round_id', round_id)

  const userScores: { owner_id: string; round_id: string; grade: string; points: number }[] = []
  type SlotRow = { slot: string; cards: { player_id: string; players: { positions: string[] } | null } | null }

  for (const lu of lineups ?? []) {
    const rows = ((lu.lineup_slots ?? []) as unknown as SlotRow[])
      .filter(r => r.cards?.player_id)
      .map(r => ({
        slot: r.slot,
        player_id: r.cards!.player_id,
        positions: r.cards!.players?.positions ?? [],
      })) as SlotAssignment[]

    const starters = rows.filter(r => !r.slot.startsWith('BENCH') && !r.slot.startsWith('RES'))
    const bench = rows.filter(r => r.slot.startsWith('BENCH'))

    const { scored } = resolveSubs(starters, bench, played)

    let total = 0
    for (const sc of scored) {
      const line = statByPlayer.get(sc.player_id)
      if (!line) continue
      // Promoted bench scores the SLOT it filled at full value; unpromoted bench scores as a bat at bench_mult
      const effectiveSlot = sc.slot === 'BENCH' ? 'DP' : sc.slot
      const raw = slotPoints(effectiveSlot, line, v)
      total += sc.slot === 'BENCH' ? applyBench(raw, 'BENCH1', v, false) : raw
    }
    userScores.push({ owner_id: lu.owner_id, round_id, grade: round.grade, points: total })
  }
  if (userScores.length) {
    await admin.from('user_scores').upsert(userScores, { onConflict: 'owner_id,round_id' })
  }

  return NextResponse.json({ players_scored: playerScores.length, teams_scored: userScores.length })
}