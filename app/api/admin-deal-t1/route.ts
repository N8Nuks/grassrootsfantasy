import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dealAndPersistT1 } from '@/lib/dealing'

/* Deal a starter pack to someone else — for a manager who registered in one
   grade and now wants the other. There's no path to this in the app itself,
   and the normal deal route only ever acts on whoever is logged in. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { email, grade } = await request.json() as { email?: string; grade?: string }
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (grade !== 'mens' && grade !== 'womens') {
    return NextResponse.json({ error: 'Grade must be mens or womens' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the login by email, then their profile
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) return NextResponse.json({ error: 'Lookup failed: ' + listErr.message }, { status: 500 })
  const target = list.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
  if (!target) return NextResponse.json({ error: 'No account with that email' }, { status: 404 })

  const { data: profile } = await admin
    .from('profiles').select('team_name').eq('id', target.id).single()
  if (!profile) return NextResponse.json({ error: 'That login has no team' }, { status: 404 })

  // Already holding cards in this grade? Dealing again would double their squad.
  const { count } = await admin.from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', target.id).eq('grade', grade)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `${profile.team_name} already holds ${count} cards in that grade` }, { status: 400 })
  }

  try {
    const r = await dealAndPersistT1(admin, target.id, grade)
    return NextResponse.json({ ok: true, team: profile.team_name, grade, dealt: r.dealt })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}