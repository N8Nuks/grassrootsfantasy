import type { SupabaseClient } from '@supabase/supabase-js'

/* Everything a manager's "share my round" card shows, for their latest scored
   round in a grade. A round that gave user teams nothing (a non-scoring round)
   has no user score, so it is never the round shared. */

export type ShareRound = {
  grade: 'mens' | 'womens'
  teamName: string
  round: number
  provisional: boolean
  score: number
  rank: number | null          // place on the round's board
  teams: number                // teams on that board
  seasonRank: number | null
  h2h: { result: 'W' | 'L' | 'D'; opponent: string; theirScore: number } | null
  top: { name: string; club: string; points: number; captain: boolean }[]   // best three, by points earned
  captain: { name: string; points: number } | null
}

const ordinalRank = (points: number, all: number[]) => 1 + all.filter(p => p > points).length

export async function shareRoundData(
  supabase: SupabaseClient,
  userId: string,
  grade: 'mens' | 'womens',
): Promise<ShareRound | null> {
  // The latest round this manager has a score in
  type MyScore = { points: number; round_id: string; rounds: { round_number: number; status: string } }
  const { data: mine } = await supabase.from('user_scores')
    .select('points, round_id, rounds!inner(round_number, status)')
    .eq('owner_id', userId).eq('grade', grade)
  const latest = ((mine ?? []) as unknown as MyScore[])
    .filter(s => s.rounds.round_number > 0 && ['provisional', 'confirmed'].includes(s.rounds.status))
    .sort((a, b) => b.rounds.round_number - a.rounds.round_number)[0]
  if (!latest) return null
  const roundId = latest.round_id
  const score = Number(latest.points)

  type Team = { id: string; team_name: string | null; is_house: boolean | null; hide_from_boards: boolean | null }
  const [{ data: teams }, { data: roundScores }, { data: season }, { data: matchRows }, { data: earnRows }, { data: lineup }] = await Promise.all([
    supabase.from('public_teams').select('id, team_name, is_house, hide_from_boards'),
    supabase.from('user_scores').select('owner_id, points').eq('round_id', roundId),
    supabase.rpc('season_totals', { p_grade: grade }),
    supabase.from('matchups').select('user_a, user_b, score_a, score_b, points_a, points_b')
      .eq('round_id', roundId).or(`user_a.eq.${userId},user_b.eq.${userId}`).limit(1),
    supabase.from('lineup_earnings').select('player_id, earned')
      .eq('owner_id', userId).eq('round_id', roundId),
    supabase.from('lineups').select('captain_card_id').eq('owner_id', userId).eq('round_id', roundId).maybeSingle(),
  ])

  const teamById = new Map(((teams ?? []) as Team[]).map(t => [t.id, t]))
  // The house team and hidden teams never rank; the manager's own team always does
  const ranks = (id: string) => {
    if (id === userId) return true
    const t = teamById.get(id)
    return !(t?.is_house === true || t?.hide_from_boards === true)
  }

  const board = ((roundScores ?? []) as { owner_id: string; points: number }[]).filter(s => ranks(s.owner_id))
  const rank = board.length ? ordinalRank(score, board.map(s => Number(s.points))) : null

  const totals = new Map<string, number>()
  for (const s of (season ?? []) as { owner_id: string; points: number }[]) {
    if (!ranks(s.owner_id)) continue
    totals.set(s.owner_id, (totals.get(s.owner_id) ?? 0) + Number(s.points))
  }
  const myTotal = totals.get(userId)
  const seasonRank = myTotal != null ? ordinalRank(myTotal, [...totals.values()]) : null

  // Head to head, once the matchup has been resolved
  type Match = { user_a: string; user_b: string; score_a: number | null; score_b: number | null; points_a: number | null; points_b: number | null }
  const m = ((matchRows ?? []) as Match[])[0]
  let h2h: ShareRound['h2h'] = null
  if (m && m.points_a != null && m.points_b != null) {
    const iAmA = m.user_a === userId
    const myPts = Number(iAmA ? m.points_a : m.points_b)
    const oppId = iAmA ? m.user_b : m.user_a
    h2h = {
      result: myPts === 1 ? 'W' : myPts === 0.5 ? 'D' : 'L',
      opponent: teamById.get(oppId)?.team_name ?? 'Opponent',
      theirScore: Number((iAmA ? m.score_b : m.score_a) ?? 0),
    }
  }

  // Best three by points earned for this team, and the captain's return
  const earned = ((earnRows ?? []) as { player_id: string; earned: number }[])
    .map(e => ({ player_id: e.player_id, earned: Number(e.earned) }))
    .filter(e => e.earned > 0)
    .sort((a, b) => b.earned - a.earned)
  let captainPlayerId: string | null = null
  if (lineup?.captain_card_id) {
    const { data: card } = await supabase.from('cards').select('player_id').eq('id', lineup.captain_card_id).maybeSingle()
    captainPlayerId = (card?.player_id as string | undefined) ?? null
  }
  const wanted = [...new Set([...earned.slice(0, 3).map(e => e.player_id), ...(captainPlayerId ? [captainPlayerId] : [])])]
  type P = { id: string; full_name: string; clubs: { name: string } | null }
  const { data: playerRows } = wanted.length
    ? await supabase.from('players').select('id, full_name, clubs(name)').in('id', wanted)
    : { data: [] }
  const playerOf = new Map(((playerRows ?? []) as unknown as P[]).map(p => [p.id, p]))
  const top = earned.slice(0, 3).map(e => ({
    name: playerOf.get(e.player_id)?.full_name ?? 'Player',
    club: playerOf.get(e.player_id)?.clubs?.name ?? '',
    points: e.earned,
    captain: e.player_id === captainPlayerId,
  }))
  const capEarn = captainPlayerId ? earned.find(e => e.player_id === captainPlayerId) : undefined
  const captain = captainPlayerId && playerOf.get(captainPlayerId)
    ? { name: playerOf.get(captainPlayerId)!.full_name, points: capEarn?.earned ?? 0 }
    : null

  return {
    grade,
    teamName: teamById.get(userId)?.team_name ?? 'My team',
    round: latest.rounds.round_number,
    provisional: latest.rounds.status === 'provisional',
    score,
    rank,
    teams: board.length,
    seasonRank,
    h2h,
    top,
    captain,
  }
}
