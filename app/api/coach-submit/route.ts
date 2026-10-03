import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachRound } from '@/lib/coach'

const POS = ['P', 'C', 'IF', 'OF', 'DP', 'P2']

type LineupIn = { player_id: string | null; player_name?: string | null; bat_order: number | null; pos: string }
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
  const clubId = link.club_id as string

  const cr = await getCoachRound(admin, grade)
  if (!cr) return bad('There is no upcoming round to submit for.')
  if (cr.closes_at <= new Date()) return bad('This round has started, so lineups are closed.')
  const rn = cr.round_number

  // The coach names their real team from the club's full list. Who is visible
  // in GF (active, adult or consented) is decided on the way out, never here.
  const [{ data: everyone }, { data: priorNames }, { data: existing }] = await Promise.all([
    admin.from('players').select('id').eq('grade', grade).eq('club_id', clubId),
    admin.from('club_lineups').select('player_name')
      .eq('grade', grade).eq('club_id', clubId).not('player_name', 'is', null),
    admin.from('club_lineups').select('id')
      .eq('grade', grade).eq('club_id', clubId).eq('round_number', rn),
  ])
  const allIds = (everyone ?? []).map(p => p.id as string)
  const clubIds = new Set(allIds)
  const allowedNames = new Map(
    (priorNames ?? []).map(r => [String(r.player_name).trim().toLowerCase(), String(r.player_name).trim()]))

  const lineup = Array.isArray(body.lineup) ? body.lineup : []
  const unavailable = Array.isArray(body.unavailable) ? body.unavailable : []
  if (lineup.length > 14) return bad('That is too many players in the lineup.')

  const seen = new Set<string>()
  const orders = new Set<number>()
  const real: { player_id: string; bat_order: number | null; pos: string }[] = []
  const named: { player_name: string; bat_order: number | null; pos: string }[] = []

  for (const l of lineup) {
    let key: string
    if (l.player_id) {
      if (!clubIds.has(l.player_id)) return bad('One of the players isn\'t on this club\'s list.')
      key = l.player_id
    } else {
      const canonical = allowedNames.get(String(l.player_name ?? '').trim().toLowerCase())
      if (!canonical) return bad('One of the names isn\'t recognised for this club.')
      key = 'name:' + canonical.toLowerCase()
    }
    if (seen.has(key)) return bad('A player is in the lineup twice.')
    seen.add(key)
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
    if (l.player_id) real.push({ player_id: l.player_id, bat_order: l.bat_order, pos: l.pos })
    else named.push({ player_name: allowedNames.get(String(l.player_name).trim().toLowerCase()) as string, bat_order: l.bat_order, pos: l.pos })
  }
  for (let i = 1; i <= 9; i++) {
    if (!orders.has(i)) return bad('Pick nine batters, in orders 1 to 9.')
  }

  const flagged = new Map<string, string | null>()
  for (const u of unavailable) {
    if (!clubIds.has(u.player_id)) return bad('One of the unavailable players isn\'t on this club\'s list.')
    if (seen.has(u.player_id)) return bad('A player can\'t be in the lineup and unavailable.')
    const reason = typeof u.reason === 'string' ? u.reason.trim().slice(0, 120) : ''
    flagged.set(u.player_id, reason || null)
  }

  // 1. Lineup: save the new rows first, then clear whatever is no longer in it
  let keepIds: string[] = []
  if (real.length) {
    const { data: saved, error: luErr } = await admin.from('club_lineups')
      .upsert(real.map(r => ({ grade, round_number: rn, club_id: clubId, ...r })),
        { onConflict: 'grade,round_number,player_id' })
      .select('id')
    if (luErr) return bad('Couldn\'t save the lineup: ' + luErr.message, 500)
    keepIds = (saved ?? []).map(r => r.id as string)
  }
  const oldIds = (existing ?? []).map(r => r.id as string).filter(id => !keepIds.includes(id))
  if (oldIds.length) {
    const { error: delErr } = await admin.from('club_lineups').delete().in('id', oldIds)
    if (delErr) return bad('Couldn\'t clear the old lineup: ' + delErr.message, 500)
  }
  if (named.length) {
    const { error: nmErr } = await admin.from('club_lineups')
      .insert(named.map(n => ({ grade, round_number: rn, club_id: clubId, player_id: null, ...n })))
    if (nmErr) return bad('Couldn\'t save the lineup: ' + nmErr.message, 500)
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
    { grade, club_id: clubId, round_number: rn, submitted_at: new Date().toISOString() },
    { onConflict: 'grade,club_id,round_number' })

  return NextResponse.json({
    ok: true, round_number: rn, batters: orders.size, unavailable: flagged.size,
  })
}