import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachRound } from '@/lib/coach'

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
    const [{ data: links }, { data: subs }] = await Promise.all([
      admin.from('coach_links').select('club_id, token').eq('grade', grade),
      cr
        ? admin.from('coach_submissions').select('club_id, submitted_at')
            .eq('grade', grade).eq('round_number', cr.round_number)
        : Promise.resolve({ data: [] as { club_id: string; submitted_at: string }[] }),
    ])
    const submitted = new Map((subs ?? []).map(s => [s.club_id as string, s.submitted_at as string]))
    const clubs = (links ?? [])
      .map(l => ({
        club_id: l.club_id as string,
        club: clubName.get(l.club_id as string) ?? 'Unknown club',
        token: l.token as string,
        submitted_at: submitted.get(l.club_id as string) ?? null,
      }))
      .sort((a, b) => a.club.localeCompare(b.club))
    grades.push({
      grade,
      round_number: cr?.round_number ?? null,
      closes_at: cr ? cr.closes_at.toISOString() : null,
      clubs,
    })
  }
  return NextResponse.json({ grades })
}

export async function POST(req: Request) {
  const denied = await adminCheck()
  if (denied) return denied

  const body = await req.json().catch(() => null) as
    { action?: string; grade?: string; club_id?: string } | null
  if (!body || body.action !== 'regenerate'
      || (body.grade !== 'mens' && body.grade !== 'womens') || !body.club_id) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  const admin = createAdminClient()
  const { data, error } = await admin.from('coach_links')
    .update({ token }).eq('grade', body.grade).eq('club_id', body.club_id)
    .select('token').maybeSingle()
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'No link found for that club' }, { status: 500 })
  }
  return NextResponse.json({ token })
}