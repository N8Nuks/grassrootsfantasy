import type { SupabaseClient } from '@supabase/supabase-js'
import { battingPoints, pitchingPoints, type PointValues, type StatLine } from '@/lib/scoring'
import { clubKey } from '@/lib/clubMatch'

/* The Selection Room: every card a manager owns, measured for the next round.

   Two questions drive it:
     - does this player turn up?   → rounds played out of the rounds their club played
     - do they score when they do? → how often they beat par

   Par is what a starter in this manager's own team scores in a typical round
   (the median). It is personal: a deep squad has a higher bar than a thin one.

   A stats-only round (rained off and replayed, e.g. Round 5) counts here in
   full — games played and points. It only sits outside the GF competition, so
   its points are worked out from the stat line rather than read from
   player_scores, which holds nothing for it. */

export type NextStatus =
  | 'named'      // in the team their coach has named for the round
  | 'not_named'  // their club has named a team and they are not in it
  | 'out'        // flagged unavailable
  | 'bye'        // their club is not playing
  | 'open'       // club is playing, no team named yet

export type Verdict =
  | 'lock_in' | 'in_form' | 'steady' | 'boom_bust' | 'going_cold'
  | 'part_timer' | 'rotation' | 'new' | 'not_named' | 'sitting_out'

export type SelectionPlayer = {
  id: string
  name: string
  club: string
  positions: string[]
  pitcher: boolean
  // One entry per round the grade has stats for, oldest first:
  //   number = points scored, null = club played and they did not, undefined = club did not play
  rounds: { round: number; points: number | null | undefined }[]
  clubRounds: number      // rounds their club played
  played: number          // rounds they took the field
  avg: number             // points per round played
  last3: number           // average of their last three rounds played
  low: number
  high: number
  beatPar: number         // rounds played at or above par
  next: { status: NextStatus; opponent: string | null; when: string | null; batOrder: number | null }
  use: { started: number; bench: number; reserves: number }   // how this manager has used them
  confidence: number      // 0–99, the pick rating for next round
  verdict: Verdict
}

export type SelectionRoom = {
  nextRound: number | null
  lockAt: string | null
  par: number
  roundsOnFile: number
  players: SelectionPlayer[]     // best picks first
  scan: { everPresent: number; beatParMost: number; doubtful: number }
  spotlight: {
    reliable: SelectionPlayer | null
    hot: SelectionPlayer | null
    cold: SelectionPlayer | null
    out: SelectionPlayer | null
  }
}

const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0 }
const tookField = (raw: Record<string, unknown> | null) =>
  raw == null ? false : (raw.gp == null || raw.gp === '' ? true : num(raw.gp) > 0)
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))
const round1 = (x: number) => Math.round(x * 10) / 10

const DAY = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', timeZone: 'UTC' })
function whenOf(day: string, time: string | null): string {
  const d = DAY.format(new Date(`${day}T12:00:00Z`))
  if (!time || time.startsWith('23:59')) return d
  const [h, m] = time.split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${d} ${h12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`
}

export async function selectionRoom(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  ownerId: string,
  grade: 'mens' | 'womens',
): Promise<SelectionRoom | null> {
  const [{ data: cardRows }, { data: roundRows }, { data: config }, { data: clubRows }] = await Promise.all([
    supabase.from('cards')
      .select('id, players!inner(id, full_name, positions, club_id)')
      .eq('owner_id', ownerId).eq('grade', grade)
      .eq('players.active', true)
      .or('is_under18.eq.false,has_consent.eq.true', { referencedTable: 'players' }),
    supabase.from('rounds').select('id, round_number, status, lock_at').eq('grade', grade).gt('round_number', 0),
    supabase.from('scoring_config').select('values').eq('grade', grade).single(),
    supabase.from('clubs').select('id, name'),
  ])

  type CardRow = { players: { id: string; full_name: string; positions: string[] | null; club_id: string | null } }
  const owned = new Map<string, CardRow['players']>()
  for (const c of (cardRows ?? []) as unknown as CardRow[]) owned.set(c.players.id, c.players)
  if (owned.size === 0) return null

  type RoundRow = { id: string; round_number: number; status: string; lock_at: string | null }
  const rounds = ((roundRows ?? []) as RoundRow[]).sort((a, b) => a.round_number - b.round_number)
  const withStats = rounds.filter(r => ['provisional', 'confirmed', 'catchup'].includes(r.status))
  // The round to pick for: the first one that has not been scored yet
  const nextRow = rounds.find(r => !['provisional', 'confirmed', 'catchup'].includes(r.status)) ?? null
  const clubName = new Map(((clubRows ?? []) as { id: string; name: string }[]).map(c => [c.id, c.name]))
  const statIds = withStats.map(r => r.id)
  const catchupIds = new Set(withStats.filter(r => r.status === 'catchup').map(r => r.id))

  const [{ data: statRows }, { data: scoreRows }, { data: gradePlayers }, { data: earnRows }] = await Promise.all([
    statIds.length
      ? supabase.from('player_stats').select('player_id, round_id, raw').in('round_id', statIds)
      : Promise.resolve({ data: [] }),
    statIds.length
      ? supabase.from('player_scores').select('player_id, round_id, points')
          .in('round_id', statIds).in('player_id', [...owned.keys()])
      : Promise.resolve({ data: [] }),
    supabase.from('players').select('id, club_id').eq('grade', grade),
    supabase.from('lineup_earnings').select('round_id, player_id, slot, reason')
      .eq('owner_id', ownerId).eq('grade', grade),
  ])

  type StatRow = { player_id: string; round_id: string; raw: Record<string, unknown> | null }
  const stats = ((statRows ?? []) as StatRow[]).filter(s => tookField(s.raw))
  const clubOfPlayer = new Map(((gradePlayers ?? []) as { id: string; club_id: string | null }[]).map(p => [p.id, p.club_id]))

  // Which clubs played in which round: a club played if any of its players took the field
  const clubsIn = new Map<string, Set<string>>()
  for (const s of stats) {
    const club = clubOfPlayer.get(s.player_id)
    if (!club) continue
    const set = clubsIn.get(s.round_id) ?? new Set<string>()
    set.add(club)
    clubsIn.set(s.round_id, set)
  }

  // Points per player per round. A stats-only round has no player_scores row,
  // so its points come straight off the stat line.
  const v = (config?.values ?? null) as PointValues | null
  const pointsOf = new Map<string, number>()
  const pitchedIds = new Set<string>()
  for (const s of stats) {
    if (!owned.has(s.player_id)) continue
    if (num(s.raw?.ip) > 0) pitchedIds.add(s.player_id)
    if (catchupIds.has(s.round_id) && v) {
      const line = s.raw as StatLine
      pointsOf.set(`${s.round_id}:${s.player_id}`, battingPoints(line, v) + pitchingPoints(line, v))
    } else if (!catchupIds.has(s.round_id)) {
      pointsOf.set(`${s.round_id}:${s.player_id}`, 0)   // played; the score lands just below
    }
  }
  for (const s of (scoreRows ?? []) as { player_id: string; round_id: string; points: number }[]) {
    const k = `${s.round_id}:${s.player_id}`
    if (pointsOf.has(k)) pointsOf.set(k, Number(s.points))
  }

  // How the manager has used each card, and par from the cards they started
  type EarnRow = { round_id: string; player_id: string; slot: string; reason: string | null }
  const useOf = new Map<string, { started: number; bench: number; reserves: number }>()
  const starterScores: number[] = []
  for (const e of (earnRows ?? []) as EarnRow[]) {
    const u = useOf.get(e.player_id) ?? { started: 0, bench: 0, reserves: 0 }
    const isRes = e.slot.startsWith('RES')
    const isBench = !isRes && (e.slot.startsWith('BENCH') || (e.reason ?? '').includes('Bench'))
    if (isRes) u.reserves++
    else if (isBench) u.bench++
    else {
      u.started++
      const p = pointsOf.get(`${e.round_id}:${e.player_id}`)
      if (p != null) starterScores.push(p)
    }
    useOf.set(e.player_id, u)
  }
  const allScores = [...pointsOf.values()]
  const par = round1(median(starterScores.length >= 5 ? starterScores : allScores))

  // Next round: who is playing, who has been named, who is out
  const nextNo = nextRow?.round_number ?? null
  type Fx = { played_on: string; start_time: string | null; team_a: string; team_b: string; club_a: string | null; club_b: string | null }
  const gameOf = new Map<string, { opponent: string; when: string }>()
  const namedClubs = new Set<string>()
  const namedOrder = new Map<string, number | null>()
  const outIds = new Set<string>()
  if (nextNo != null && nextRow) {
    const [{ data: fxRows }, { data: luRows }, { data: flagRows }, { data: avRows }] = await Promise.all([
      supabase.from('fixtures')
        .select('played_on, start_time, team_a, team_b, club_a, club_b')
        .eq('grade', grade).eq('round_number', nextNo).eq('catchup', false)
        .order('played_on').order('start_time'),
      supabase.from('club_lineups').select('player_id, club_id, bat_order')
        .eq('grade', grade).eq('round_number', nextNo),
      admin.from('coach_unavailable').select('player_id').eq('grade', grade).eq('round_number', nextNo),
      admin.from('player_availability').select('player_id').eq('round_id', nextRow.id).eq('unavailable', true),
    ])
    for (const f of (fxRows ?? []) as Fx[]) {
      if (!f.club_a || !f.club_b || f.team_a === 'BYE' || f.team_b === 'BYE') continue
      const when = whenOf(String(f.played_on), f.start_time)
      const a = clubKey(f.club_a), b = clubKey(f.club_b)
      if (!gameOf.has(a)) gameOf.set(a, { opponent: f.club_b, when })
      if (!gameOf.has(b)) gameOf.set(b, { opponent: f.club_a, when })
    }
    for (const r of (luRows ?? []) as { player_id: string | null; club_id: string | null; bat_order: number | null }[]) {
      if (r.club_id) namedClubs.add(r.club_id)
      if (r.player_id && !namedOrder.has(r.player_id)) namedOrder.set(r.player_id, r.bat_order)
    }
    for (const f of flagRows ?? []) outIds.add(f.player_id as string)
    for (const a of avRows ?? []) outIds.add(a.player_id as string)
  }
  const haveFixtures = gameOf.size > 0

  const players: SelectionPlayer[] = []
  for (const p of owned.values()) {
    const line = withStats.map(r => {
      const clubPlayed = p.club_id ? clubsIn.get(r.id)?.has(p.club_id) ?? false : false
      const pts = pointsOf.get(`${r.id}:${p.id}`)
      return { round: r.round_number, points: pts != null ? round1(pts) : clubPlayed ? null : undefined }
    })
    const scores = line.filter(x => typeof x.points === 'number').map(x => x.points as number)
    const played = scores.length
    const clubRounds = Math.max(played, line.filter(x => x.points !== undefined).length)
    const avg = mean(scores)
    const last3 = mean(scores.slice(-3))
    const beatPar = scores.filter(s => s >= par).length
    const cName = p.club_id ? clubName.get(p.club_id) ?? '' : ''
    const game = gameOf.get(clubKey(cName)) ?? null

    let status: NextStatus = 'open'
    if (nextNo != null) {
      if (outIds.has(p.id)) status = 'out'
      else if (haveFixtures && !game) status = 'bye'
      else if (namedOrder.has(p.id)) status = 'named'
      else if (p.club_id && namedClubs.has(p.club_id)) status = 'not_named'
    }

    // Pick rating: turning up, beating par, current form, season level
    const reliability = clubRounds ? played / clubRounds : 0
    const parRate = played ? beatPar / played : 0
    const base = par > 0 ? par : 1
    const form = clamp(last3 / (base * 2))
    const level = clamp(avg / (base * 2))
    let conf = 0.35 * reliability + 0.25 * parRate + 0.25 * form + 0.15 * level
    if (played < 2) conf *= 0.7                      // too little to go on
    if (status === 'named') conf = Math.min(0.99, conf + 0.08)
    if (status === 'not_named') conf *= 0.3
    if (status === 'bye' || status === 'out') conf = 0
    const confidence = Math.round(clamp(conf, 0, 0.99) * 100)

    const lastThree = scores.slice(-3)
    let verdict: Verdict = 'rotation'
    if (status === 'bye' || status === 'out') verdict = 'sitting_out'
    else if (status === 'not_named') verdict = 'not_named'
    else if (played < 2) verdict = 'new'
    else if (reliability < 0.6) verdict = 'part_timer'
    else if (confidence >= 78) verdict = 'lock_in'
    else if (played >= 3 && last3 >= par && last3 >= avg * 1.25) verdict = 'in_form'
    else if (played >= 3 && lastThree.length === 3 && lastThree.every(s => s < par)) verdict = 'going_cold'
    else if (Math.max(...scores) >= par * 2 && parRate < 0.5) verdict = 'boom_bust'
    else if (parRate >= 0.6) verdict = 'steady'

    players.push({
      id: p.id,
      name: p.full_name,
      club: cName,
      positions: p.positions ?? [],
      pitcher: pitchedIds.has(p.id) || (p.positions ?? []).includes('P'),
      rounds: line,
      clubRounds, played,
      avg: round1(avg), last3: round1(last3),
      low: played ? Math.min(...scores) : 0,
      high: played ? Math.max(...scores) : 0,
      beatPar,
      next: {
        status,
        opponent: game?.opponent ?? null,
        when: game?.when ?? null,
        batOrder: namedOrder.get(p.id) ?? null,
      },
      use: useOf.get(p.id) ?? { started: 0, bench: 0, reserves: 0 },
      confidence, verdict,
    })
  }
  players.sort((a, b) => b.confidence - a.confidence || b.avg - a.avg || a.name.localeCompare(b.name))

  const sittingOut = (p: SelectionPlayer) => p.next.status === 'bye' || p.next.status === 'out'
  const pickBy = (xs: SelectionPlayer[], score: (p: SelectionPlayer) => number) =>
    xs.length ? xs.reduce((best, p) => (score(p) > score(best) ? p : best)) : null
  const regulars = players.filter(p => p.played >= 3)
  const hot = pickBy(regulars.filter(p => p.last3 > p.avg && p.last3 >= par), p => p.last3 - p.avg)
  const cold = pickBy(regulars.filter(p => p.last3 < p.avg && p.last3 < par && p.id !== hot?.id), p => p.avg - p.last3)

  return {
    nextRound: nextNo,
    lockAt: nextRow?.lock_at ?? null,
    par,
    roundsOnFile: withStats.length,
    players,
    scan: {
      everPresent: players.filter(p => p.clubRounds >= 2 && p.played === p.clubRounds).length,
      beatParMost: players.filter(p => p.played >= 2 && p.beatPar / p.played > 0.5).length,
      doubtful: players.filter(p => sittingOut(p) || p.next.status === 'not_named').length,
    },
    spotlight: {
      reliable: pickBy(players.filter(p => p.played >= 2 && !sittingOut(p)),
        p => (p.played / p.clubRounds) * 1000 + p.beatPar * 10 + p.avg),
      hot, cold,
      out: pickBy(players.filter(sittingOut), p => p.avg),
    },
  }
}
