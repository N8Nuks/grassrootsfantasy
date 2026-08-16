import { SupabaseClient } from '@supabase/supabase-js'

/* After a round is scored, achievements earned this round apply NEXT round.
   A player on a 2× bonus can never wear an armband, so any Captain who is about
   to be doubled hands the armband to the next-highest season-points player in
   their squad. The manager is told both things via a notice on My Team.

   Round 1 is exempt — nothing can be doubled before round 2. */
export async function moveArmbandsOffDoubled(
  admin: SupabaseClient,
  grade: 'mens' | 'womens',
  roundNumber: number,
): Promise<{ notices: number; moved: number }> {
  const nextRound = roundNumber + 1
  if (nextRound < 2) return { notices: 0, moved: 0 }

  // Players who will be scoring double next round
  const { data: dueRows } = await admin.from('player_achievements')
    .select('player_id')
    .eq('grade', grade)
    .eq('applies_round_number', nextRound)
  const doubled = new Set((dueRows ?? []).map(r => r.player_id))
  if (doubled.size === 0) return { notices: 0, moved: 0 }

  // Names for the notice text
  const { data: playerRows } = await admin.from('players')
    .select('id, full_name, stats').in('id', [...doubled])
  const nameById = new Map((playerRows ?? []).map(p => [p.id, p.full_name as string]))

  // Latest lineup per owner in this grade
  const { data: lineups } = await admin.from('lineups')
    .select('id, owner_id, captain_card_id, vice_captain_card_id, rounds!inner(round_number), lineup_slots(card_id, cards(player_id, players(id, full_name, stats)))')
    .eq('grade', grade)

  type SlotRow = { card_id: string; cards: { player_id: string; players: { id: string; full_name: string; stats: Record<string, number> } | null } | null }
  type LineupRec = { id: string; owner_id: string; captain_card_id: string | null; vice_captain_card_id: string | null; rounds: { round_number: number }; lineup_slots: SlotRow[] }

  const latestByOwner = new Map<string, LineupRec>()
  for (const lu of (lineups ?? []) as unknown as LineupRec[]) {
    if (lu.rounds.round_number > roundNumber) continue
    const cur = latestByOwner.get(lu.owner_id)
    if (!cur || lu.rounds.round_number > cur.rounds.round_number) latestByOwner.set(lu.owner_id, lu)
  }

  const notices: {
    owner_id: string; grade: string; round_number: number
    bonus_player_name: string; moved_to_name: string | null
  }[] = []
  let moved = 0

  for (const lu of latestByOwner.values()) {
    const rows = (lu.lineup_slots ?? []).filter(r => r.cards?.player_id)
    if (rows.length === 0) continue

    // Which of this manager's players earned a bonus
    const theirBonus = rows
      .map(r => r.cards!.player_id)
      .filter(pid => doubled.has(pid))
    if (theirBonus.length === 0) continue
    const bonusNames = [...new Set(theirBonus.map(pid => nameById.get(pid) ?? 'A player'))]

    // Does the armband need to move?
    const captainCard = lu.captain_card_id
      ? rows.find(r => r.card_id === lu.captain_card_id) : null
    const captainPlayerId = captainCard?.cards?.player_id ?? null
    const mustMove = !!captainPlayerId && doubled.has(captainPlayerId)

    let movedToName: string | null = null
    if (mustMove) {
      // Highest season points in the squad, skipping anyone doubled next round
      // and the current Captain — ties broken by name for a stable result.
      const candidates = rows
        .filter(r => !doubled.has(r.cards!.player_id) && r.card_id !== lu.captain_card_id)
        .map(r => ({
          card_id: r.card_id,
          name: r.cards!.players?.full_name ?? '',
          points: Number(r.cards!.players?.stats?.season_points ?? 0),
        }))
        .sort((a, b) => (b.points - a.points) || a.name.localeCompare(b.name))

      if (candidates.length > 0) {
        const pick = candidates[0]
        await admin.from('lineups')
          .update({ captain_card_id: pick.card_id })
          .eq('id', lu.id)
        movedToName = pick.name
        moved++
      } else {
        // Nobody eligible — clear the armband rather than leave it invalid
        await admin.from('lineups').update({ captain_card_id: null }).eq('id', lu.id)
      }
    }

    notices.push({
      owner_id: lu.owner_id,
      grade,
      round_number: nextRound,
      bonus_player_name: bonusNames.join(', '),
      moved_to_name: movedToName,
    })
  }

  if (notices.length) {
    await admin.from('armband_notices').insert(notices)
  }
  return { notices: notices.length, moved }
}