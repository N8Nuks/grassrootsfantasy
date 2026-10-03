import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { POOL_FILTER } from '@/lib/pool'
import { getCoachRound } from '@/lib/coach'

const POS = ['P', 'C', 'IF', 'OF', 'DP', 'P2']

type LineupIn = { player_id: string; bat_order: number | null; pos: string }
type UnavailIn = { player_id: string; reason?: string | null }

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as
    { token?: string; lineup?: LineupIn[]; unavailable?: UnavailIn[] } | null
  if (!body || typeof body.token !== 'string' || body.token.length !== 64) {
    return bad('That link isn\'t recognised. Ask for a new one.', 401)
  }

  const admin = createAdminClient()
  const { data: link } = await admin.from('coach_links')
    .select('grade, club_id').eq('token', body.token).maybeSingle()
  if (!link) return bad('That link isn\'t recognised. Ask for a new one.', 401)
  const grade = link.grade as 'mens' | 'womens'

  const cr = await getCoachRound(admin, grade)
  if (!cr) return bad('There is no upcoming round to submit for.')
  if (cr.closes_at <= new Date()) return bad('This round has started, so lineups are closed.')
  const rn = cr.round_number

  // Who this coach can pick: the club's active, consented players. allIds
  // (everyone ever on the club) is only used to clean out stale rows.
  const [{ data: pool }, { data: everyone }] = await Promise.all([
    admin.from('players').select('id')
      .eq('grade', grade).eq('club_id', link.club_id).eq('active', true).or(POOL_FILTER),
    admin.from('players').select('id')
      .eq('grade', grade).eq('club_id', link.club_id),
  ])
  const poolIds = new Set((pool ?? []).map(p => p.id as string))
  const allIds = (everyone ?? []).map(p => p.id as string)

  const lineup = Array.isArray(body.lineup) ? body.lineup : []
  const unavailable = Array.isArray(body.unavailable) ? body.unavailable : []
  if (lineup.length > 14) return bad('That is too many players in the lineup.')

  const seen = new Set<string>()
  const orders = new Set<number>()
  for (const l of lineup) {
    if (!poolIds.has(l.player_id)) return bad('One of the players isn\'t on this club\'s list.')
    if (seen.has(l.player_id)) return bad('A player is in the lineup twice.')
    seen.add(l.player_id)
    if (!POS.includes(l.pos)) return bad('One of the positions isn\'t valid.')
    if (l.pos === 'P2') {
      if (l.bat_order != null) return bad('A relief pitcher can\'t have a batting order.')
    } else {
      if (!Number.isInteger(l.bat_order) || (l.bat_order as number) < 1 || (l.bat_order as number) > 10) {
        return bad('Every batter needs an order from 1 to 10.')
      }
      if (orders.has(l.bat_order as number)) return bad('Two players share the same batting order.')
      orders.add(l.bat_order as number)
    }
  }
  for (let i = 1; i <= 9; i++) {
    if (!orders.has(i)) return bad('Pick nine batters, in orders 1 to 9.')
  }

  const flagged = new Map<string, string | null>()
  for (const u of unavailable) {
    if (!poolIds.has(u.player_id)) return bad('One of the unavailable players isn\'t on this club\'s list.')
    if (seen.has(u.player_id)) return bad('A player can\'t be in the lineup and unavailable.')
    const reason = typeof u.reason === 'string' ? u.reason.trim().slice(0, 120) : ''
    flagged.set(u.player_id, reason || null)
  }

  // 1. Lineup: save the new rows first, then clear any old rows not in it
  const rows = lineup.map(l => ({
    grade, round_number: rn, player_id: l.player_id, bat_order: l.bat_order, pos: l.pos,
  }))
  const { error: luErr } = await admin.from('club_lineups')
    .upsert(rows, { onConflict: 'grade,round_number,player_id' })
  if (luErr) return bad('Couldn\'t save the lineup: ' + luErr.message, 500)

  const stale = allIds.filter(id => !seen.has(id))
  if (stale.length) {
    const { error: delErr } = await admin.from('club_lineups').delete()
      .eq('grade', grade).eq('round_number', rn).in('player_id', stale)
    if (delErr) return bad('Couldn\'t clear the old lineup: ' + delErr.message, 500)
  }

  // 2. Unavailable players, held by round number until the round exists
  const { data: prev } = await admin.from('coach_unavailable').select('player_id')
    .eq('grade', grade).eq('round_number', rn).in('player_id', allIds)
  const prevIds = (prev ?? []).map(p => p.player_id as string)
  if (prevIds.length) {
    const { error: pdErr } = await admin.from('coach_unavailable').delete()
      .eq('grade', grade).eq('round_number', rn).in('player_id', prevIds)
    if (pdErr) return bad('Couldn\'t update availability: ' + pdErr.message, 500)
  }
  if (flagged.size) {
    const { error: cuErr } = await admin.from('coach_unavailable').insert(
      [...flagged].map(([player_id, reason]) => ({ grade, round_number: rn, player_id, reason })))
    if (cuErr) return bad('Couldn\'t save availability: ' + cuErr.message, 500)
  }

  // 3. If the round row already exists, managers see the flags straight away.
  // Only this coach's earlier flags are removed, so Admin's own stay put.
  const { data: roundRow } = await admin.from('rounds').select('id')
    .eq('grade', grade).eq('round_number', rn).maybeSingle()
  if (roundRow) {
    const removed = prevIds.filter(id => !flagged.has(id))
    if (removed.length) {
      await admin.from('player_availability').delete()
        .eq('round_id', roundRow.id).in('player_id', removed)
    }
    if (flagged.size) {
      const { error: paErr } = await admin.from('player_availability').upsert(
        [...flagged].map(([player_id, reason]) => ({ player_id, round_id: roundRow.id, unavailable: true, reason })),
        { onConflict: 'player_id,round_id' })
      if (paErr) return bad('Couldn\'t save availability: ' + paErr.message, 500)
    }
  }

  // 4. Record the submission for the Admin panel
  await admin.from('coach_submissions').upsert(
    { grade, club_id: link.club_id, round_number: rn, submitted_at: new Date().toISOString() },
    { onConflict: 'grade,club_id,round_number' })

  return NextResponse.json({
    ok: true, round_number: rn, batters: orders.size, unavailable: flagged.size,
  })
}