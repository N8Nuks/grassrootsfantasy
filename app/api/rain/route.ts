import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clubKey } from '@/lib/clubMatch'

/* Rain tools for Admin. Two jobs, both done by hand in SQL until now:

   1. Make a whole round non-scoring. The round keeps its number and its
      fixtures; its stats count for the players and it gives GF teams nothing.
      Only possible before the round has been scored.

   2. Move one game to the Catch-up games card, with a new date when there is
      one. In a round that is still to be scored, the two clubs' players are
      also marked unavailable ("Postponed") so managers are warned and the
      auto-sub covers them. */

type Grade = 'mens' | 'womens'
const isGrade = (g: unknown): g is Grade => g === 'mens' || g === 'womens'
const SCORED = ['provisional', 'confirmed']

async function adminOnly() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Not authorised' }, { status: 403 }) }
  return { admin }
}

export async function GET(req: Request) {
  const auth = await adminOnly()
  if (auth.error) return auth.error
  const grade = new URL(req.url).searchParams.get('grade')
  if (!isGrade(grade)) return NextResponse.json({ error: 'Bad grade' }, { status: 400 })

  const [{ data: rounds }, { data: fixtures }] = await Promise.all([
    auth.admin.from('rounds').select('round_number, status').eq('grade', grade).gt('round_number', 0).order('round_number'),
    auth.admin.from('fixtures')
      .select('id, round_number, played_on, start_time, team_a, team_b, club_a, club_b, location, venue, score_a, score_b, catchup')
      .eq('grade', grade).gt('round_number', 0)
      .order('round_number').order('played_on').order('start_time'),
  ])
  const games = (fixtures ?? []).filter(f => f.team_a !== 'BYE' && f.team_b !== 'BYE' && f.club_a && f.club_b)
  return NextResponse.json({ rounds: rounds ?? [], games })
}

export async function POST(req: Request) {
  const auth = await adminOnly()
  if (auth.error) return auth.error
  const admin = auth.admin
  const body = await req.json() as {
    action: 'non_scoring' | 'undo_non_scoring' | 'move' | 'restore'
    grade?: Grade; round_number?: number
    fixture_id?: string; date?: string | null; time?: string | null; park?: string | null
  }
  const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

  /* ── A whole round ── */
  if (body.action === 'non_scoring' || body.action === 'undo_non_scoring') {
    if (!isGrade(body.grade) || !Number.isInteger(body.round_number) || (body.round_number as number) < 1) {
      return bad('Pick a grade and a round')
    }
    const { data: round } = await admin.from('rounds').select('id, status, lock_at')
      .eq('grade', body.grade).eq('round_number', body.round_number as number).maybeSingle()
    if (!round) return bad(`Round ${body.round_number} does not exist yet. Open it with Next Round first.`)

    if (body.action === 'non_scoring') {
      if (round.status === 'catchup') return bad(`Round ${body.round_number} is already non-scoring.`)
      if (SCORED.includes(round.status)) {
        return bad(`Round ${body.round_number} has already been scored, so it can't be made non-scoring. Move its unplayed games to catch-up instead.`)
      }
      const { count } = await admin.from('player_scores').select('player_id', { count: 'exact', head: true }).eq('round_id', round.id)
      if ((count ?? 0) > 0) return bad(`Round ${body.round_number} already has player scores loaded, so it can't be made non-scoring.`)

      const { error } = await admin.from('rounds').update({ status: 'catchup' }).eq('id', round.id)
      if (error) return bad('Update failed: ' + error.message, 500)
      // No head-to-head for a round that gives no points
      const { error: mErr } = await admin.from('matchups').delete().eq('round_id', round.id)
      if (mErr) return bad(`Round ${body.round_number} is now non-scoring, but its matchups could not be removed: ${mErr.message}`, 500)
      return NextResponse.json({ ok: true, round_number: body.round_number, status: 'catchup' })
    }

    if (round.status !== 'catchup') return bad(`Round ${body.round_number} is not a non-scoring round.`)
    const { count } = await admin.from('player_stats').select('player_id', { count: 'exact', head: true }).eq('round_id', round.id)
    if ((count ?? 0) > 0) return bad(`Round ${body.round_number} already has stats loaded as a non-scoring round, so it can't be switched back.`)
    const status = round.lock_at && new Date(round.lock_at).getTime() <= Date.now() ? 'locked' : 'open'
    const { error } = await admin.from('rounds').update({ status }).eq('id', round.id)
    if (error) return bad('Update failed: ' + error.message, 500)
    return NextResponse.json({ ok: true, round_number: body.round_number, status })
  }

  /* ── One game ── */
  if (body.action === 'move' || body.action === 'restore') {
    if (!body.fixture_id) return bad('No game picked')
    const { data: fx } = await admin.from('fixtures')
      .select('id, grade, round_number, club_a, club_b').eq('id', body.fixture_id).maybeSingle()
    if (!fx) return bad('Game not found', 404)

    const patch: Record<string, string | boolean> = { catchup: body.action === 'move' }
    if (body.action === 'move') {
      if (body.date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return bad('Date must be YYYY-MM-DD')
        patch.played_on = body.date
      }
      if (body.time) {
        if (!/^\d{2}:\d{2}$/.test(body.time)) return bad('Time must be HH:MM')
        patch.start_time = body.time
      } else {
        patch.start_time = '23:59'   // the site reads 23:59 as "time to be confirmed"
      }
      const park = (body.park ?? '').trim()
      if (park) { patch.location = park.slice(0, 80); patch.venue = 'Unallocated' }
    }
    const { error } = await admin.from('fixtures').update(patch).eq('id', fx.id)
    if (error) return bad('Update failed: ' + error.message, 500)

    /* In a round still to be scored, the two clubs' players are out for the
       round: mark them so My Team warns and the auto-sub covers them. Moving
       the game back clears only the marks this tool made. */
    let marked = 0
    const { data: round } = await admin.from('rounds').select('id, status')
      .eq('grade', fx.grade).eq('round_number', fx.round_number).maybeSingle()
    if (round && !SCORED.includes(round.status) && round.status !== 'catchup') {
      const keys = new Set([clubKey(fx.club_a), clubKey(fx.club_b)])
      const { data: clubs } = await admin.from('clubs').select('id, name')
      const clubIds = (clubs ?? []).filter(c => keys.has(clubKey(c.name))).map(c => c.id)
      if (clubIds.length) {
        const { data: players } = await admin.from('players').select('id').eq('grade', fx.grade).in('club_id', clubIds)
        const ids = (players ?? []).map(p => p.id as string)
        if (ids.length && body.action === 'move') {
          const { error: avErr } = await admin.from('player_availability').upsert(
            ids.map(id => ({ player_id: id, round_id: round.id, unavailable: true, reason: 'Postponed' })),
            { onConflict: 'player_id,round_id' })
          if (avErr) return bad('Game moved, but the players could not be marked unavailable: ' + avErr.message, 500)
          marked = ids.length
        } else if (ids.length) {
          const { error: avErr } = await admin.from('player_availability').delete()
            .eq('round_id', round.id).eq('reason', 'Postponed').in('player_id', ids)
          if (avErr) return bad('Game moved back, but the Postponed marks could not be cleared: ' + avErr.message, 500)
        }
      }
    }
    return NextResponse.json({ ok: true, catchup: body.action === 'move', marked })
  }

  return bad('Unknown action')
}
