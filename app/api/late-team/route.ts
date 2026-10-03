import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const POS = ['P', 'C', 'IF', 'OF', 'DP', 'P2']

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')

function lev(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return bad('Not signed in', 401)
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return bad('Admins only', 403)

  const body = await req.json().catch(() => null) as
    { grade?: string; club_id?: string; round_number?: number; text?: string } | null
  if (!body || (body.grade !== 'mens' && body.grade !== 'womens') || !body.club_id
      || !Number.isInteger(body.round_number) || (body.round_number as number) < 1
      || typeof body.text !== 'string') {
    return bad('Pick a grade, a club and a round, and paste the team.')
  }
  const grade = body.grade
  const clubId = body.club_id
  const rn = body.round_number as number

  const admin = createAdminClient()
  const { data: club } = await admin.from('clubs').select('name').eq('id', clubId).maybeSingle()
  if (!club) return bad('That club wasn\'t found.')

  // 1. Parse the pasted lines
  const errors: string[] = []
  const parsed: { name: string; bat_order: number | null; pos: string }[] = []
  const lines = body.text.split(/\r?\n/)
  lines.forEach((raw, idx) => {
    if (!raw.trim()) return
    const cells = raw.split(/,|\t/).map(c => c.trim())
    if (parsed.length === 0 && cells[0].toLowerCase() === 'player') return
    const name = cells[0]
    const orderRaw = (cells[1] ?? '').toUpperCase()
    const pos = (cells[2] ?? '').toUpperCase()
    if (!name) { errors.push(`Line ${idx + 1}: no player name`); return }
    if (!POS.includes(pos)) { errors.push(`Line ${idx + 1} (${name}): position must be P, C, IF, OF, DP or P2`); return }
    let bat_order: number | null = null
    if (pos === 'P2') {
      if (orderRaw) { errors.push(`Line ${idx + 1} (${name}): a relief pitcher has no batting order`); return }
    } else {
      bat_order = orderRaw === 'FL' ? 10 : Number(orderRaw)
      if (!Number.isInteger(bat_order) || bat_order < 1 || bat_order > 10) {
        errors.push(`Line ${idx + 1} (${name}): batting order must be 1 to 10`); return
      }
    }
    parsed.push({ name, bat_order, pos })
  })
  if (errors.length) return bad(errors.join('\n'))

  const orders = new Set<number>()
  const names = new Set<string>()
  for (const p of parsed) {
    if (p.bat_order != null) {
      if (orders.has(p.bat_order)) return bad(`Two players share batting order ${p.bat_order}.`)
      orders.add(p.bat_order)
    }
    const k = norm(p.name)
    if (names.has(k)) return bad(`${p.name} is in the team twice.`)
    names.add(k)
  }
  for (let i = 1; i <= 9; i++) {
    if (!orders.has(i)) return bad(`Batting order ${i} is missing. A team needs 1 to 9.`)
  }

  // 2. Match names against this club's players
  const { data: plRows } = await admin.from('players').select('id, full_name')
    .eq('grade', grade).eq('club_id', clubId)
  const club_players = (plRows ?? []) as { id: string; full_name: string }[]
  const byNorm = new Map(club_players.map(p => [norm(p.full_name), p]))
  const allIds = club_players.map(p => p.id)

  const real: { player_id: string; bat_order: number | null; pos: string }[] = []
  const named: { player_name: string; bat_order: number | null; pos: string }[] = []
  const nameOnly: string[] = []
  const typos: string[] = []
  for (const p of parsed) {
    const k = norm(p.name)
    const hit = byNorm.get(k)
    if (hit) { real.push({ player_id: hit.id, bat_order: p.bat_order, pos: p.pos }); continue }
    const near = club_players.find(c => lev(k, norm(c.full_name)) <= 2)
    if (near) { typos.push(`${p.name}: did you mean ${near.full_name}?`); continue }
    named.push({ player_name: p.name, bat_order: p.bat_order, pos: p.pos })
    nameOnly.push(p.name)
  }
  if (typos.length) return bad('Nothing was loaded. Check these spellings:\n' + typos.join('\n'))

  // 3. Save: new rows first, then clear whatever is no longer in the team
  const { data: existing } = await admin.from('club_lineups').select('id')
    .eq('grade', grade).eq('club_id', clubId).eq('round_number', rn)

  let keepIds: string[] = []
  if (real.length) {
    const { data: saved, error: luErr } = await admin.from('club_lineups')
      .upsert(real.map(r => ({ grade, round_number: rn, club_id: clubId, ...r })),
        { onConflict: 'grade,round_number,player_id' })
      .select('id')
    if (luErr) return bad('Couldn\'t save the team: ' + luErr.message, 500)
    keepIds = (saved ?? []).map(r => r.id as string)
  }
  const oldIds = (existing ?? []).map(r => r.id as string).filter(id => !keepIds.includes(id))
  if (oldIds.length) {
    const { error: delErr } = await admin.from('club_lineups').delete().in('id', oldIds)
    if (delErr) return bad('Couldn\'t clear the old team: ' + delErr.message, 500)
  }
  if (named.length) {
    const { error: nmErr } = await admin.from('club_lineups')
      .insert(named.map(n => ({ grade, round_number: rn, club_id: clubId, player_id: null, ...n })))
    if (nmErr) return bad('Couldn\'t save the team: ' + nmErr.message, 500)
  }

  // 4. Mark the club as sent so Coach Links shows it
  await admin.from('coach_submissions').upsert(
    { grade, club_id: clubId, round_number: rn, submitted_at: new Date().toISOString() },
    { onConflict: 'grade,club_id,round_number' })

  void allIds
  return NextResponse.json({
    ok: true,
    club: club.name,
    round_number: rn,
    loaded: parsed.length,
    batters: orders.size,
    relievers: parsed.filter(p => p.pos === 'P2').length,
    not_in_gf: nameOnly,
  })
}