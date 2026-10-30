import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachRound } from '@/lib/coach'
import { clubKey } from '@/lib/clubMatch'

export const dynamic = 'force-dynamic'

async function adminCheck() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  return null
}

export async function GET() {
  const denied = await adminCheck()
  if (denied) return denied

  const admin = createAdminClient()
  const { data: clubRows } = await admin.from('clubs').select('id, name')
  const clubName = new Map((clubRows ?? []).map(c => [c.id as string, c.name as string]))

  const grades = []
  for (const grade of ['mens', 'womens'] as const) {
    const cr = await getCoachRound(admin, grade)
    const [{ data: links }, { data: subs }, { data: fx }, { data: wi }] = await Promise.all([
      admin.from('coach_links').select('club_id, token').eq('grade', grade),
      cr
        ? admin.from('coach_submissions').select('club_id, game_day, submitted_at')
            .eq('grade', grade).eq('round_number', cr.round_number)
        : Promise.resolve({ data: [] as { club_id: string; game_day: string; submitted_at: string }[] }),
      cr
        ? admin.from('fixtures').select('club_a, club_b, team_a, team_b, played_on')
            .eq('grade', grade).eq('round_number', cr.round_number)
        : Promise.resolve({ data: [] as { club_a: string; club_b: string; team_a: string; team_b: string; played_on: string }[] }),
      cr
        ? admin.from('club_lineups').select('club_id, player_name')
            .eq('grade', grade).eq('round_number', cr.round_number).is('player_id', null)
        : Promise.resolve({ data: [] as { club_id: string; player_name: string | null }[] }),
    ])
    // Names a coach wrote in that match nobody on the club's GF list
    const writeIns = new Map<string, string[]>()
    for (const r of wi ?? []) {
      if (!r.player_name) continue
      const list = writeIns.get(r.club_id as string) ?? []
      if (!list.includes(r.player_name)) list.push(r.player_name)
      writeIns.set(r.club_id as string, list)
    }
    const submitted = new Map<string, string>()
    for (const s of subs ?? []) submitted.set(`${s.club_id}|${s.game_day}`, s.submitted_at as string)
    // The days each club plays this round. A club with a game on no day is on a bye.
    const roundDays = cr ? cr.days.map(d => d.day) : []
    const playsOn = new Map<string, Set<string>>()
    for (const f of fx ?? []) {
      if (f.team_a === 'BYE' || f.team_b === 'BYE') continue
      for (const c of [f.club_a, f.club_b]) {
        if (!c) continue
        const k = clubKey(c)
        const set = playsOn.get(k) ?? new Set<string>()
        set.add(f.played_on)
        playsOn.set(k, set)
      }
    }
    const hasFixtures = (fx ?? []).length > 0
    const clubs = (links ?? [])
      .map(l => {
        const name = clubName.get(l.club_id as string) ?? 'Unknown club'
        const clubDays = roundDays.filter(d => playsOn.get(clubKey(name))?.has(d))
        const days = clubDays.map(d => ({ day: d, submitted_at: submitted.get(`${l.club_id}|${d}`) ?? null }))
        return {
          club_id: l.club_id as string,
          club: name,
          token: l.token as string,
          // Back-compat: the first game day's status
          submitted_at: days[0]?.submitted_at ?? submitted.get(`${l.club_id}|${roundDays[0]}`) ?? null,
          bye: hasFixtures && clubDays.length === 0,
          days,
          write_ins: (writeIns.get(l.club_id as string) ?? []).sort(),
        }
      })
      .sort((a, b) => a.club.localeCompare(b.club))
    grades.push({
      grade,
      round_number: cr?.round_number ?? null,
      closes_at: cr ? cr.closes_at.toISOString() : null,
      days: cr ? cr.days.map(d => ({ day: d.day, closes_at: d.closes_at.toISOString() })) : [],
      clubs,
    })
  }
  return NextResponse.json({ grades })
}

export async function POST(req: Request) {
  const denied = await adminCheck()
  if (denied) return denied

  const body = await req.json().catch(() => null) as
    { action?: string; grade?: string; club_id?: string; name?: string; under18?: boolean } | null
  if (!body || (body.grade !== 'mens' && body.grade !== 'womens') || !body.club_id) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const admin = createAdminClient()

  if (body.action === 'regenerate') {
    const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
    const { data, error } = await admin.from('coach_links')
      .update({ token }).eq('grade', body.grade).eq('club_id', body.club_id)
      .select('token').maybeSingle()
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'No link found for that club' }, { status: 500 })
    }
    return NextResponse.json({ token })
  }

  // Create a player from a coach's write-in and point every lineup row that
  // carries the written name at the new player. Positions are a placeholder
  // set for the club to confirm; an under-18 is created without consent, so
  // they stay out of every deal and public list until the form arrives.
  if (body.action === 'create-player') {
    const name = String(body.name ?? '').trim()
    if (name.length < 3) return NextResponse.json({ error: 'Name is too short' }, { status: 400 })
    const { data: clash } = await admin.from('players').select('id, full_name')
      .eq('grade', body.grade).ilike('full_name', name).maybeSingle()
    if (clash) return NextResponse.json({ error: `${clash.full_name} already exists in this grade` }, { status: 409 })
    const under18 = !!body.under18
    const { data: created, error } = await admin.from('players').insert({
      full_name: name, grade: body.grade, club_id: body.club_id, tier: 'common',
      positions: ['IF', 'OF'], reveal_pos: 'IF', badges: ['newcomer'],
      career_games: 0, career_games_base: 0, active: true,
      is_under18: under18, has_consent: false, deal_weight: 1,
    }).select('id').single()
    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? 'Could not create the player' }, { status: 500 })
    }
    const { data: moved } = await admin.from('club_lineups')
      .update({ player_id: created.id, player_name: null })
      .eq('grade', body.grade).eq('club_id', body.club_id).is('player_id', null).ilike('player_name', name)
      .select('id')
    return NextResponse.json({ ok: true, player_id: created.id, rows: (moved ?? []).length })
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 })
}