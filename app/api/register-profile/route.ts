import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamNameProblem } from '@/lib/team-name'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

/* Writes the new user's profile. The user must already be signed in (signUp
   has just run in the browser). The team name is checked here, on the server,
   so the blocklist and the uniqueness check can't be skipped. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return bad('Not signed in.', 401)

  const body = await request.json().catch(() => null) as
    { team_name?: string; club_id?: string; full_name?: string | null; phone?: string | null } | null
  const teamName = (body?.team_name ?? '').trim()
  const clubId = (body?.club_id ?? '').trim()
  if (!teamName || !clubId) return bad('Team name and club are required.')

  const problem = teamNameProblem(teamName)
  if (problem) return bad(problem)

  const admin = createAdminClient()
  const { data: club } = await admin.from('clubs').select('id').eq('id', clubId).maybeSingle()
  if (!club) return bad('That club could not be found.')

  const { error } = await admin.from('profiles').insert({
    id: user.id,
    team_name: teamName,
    club_id: clubId,
    full_name: (body?.full_name ?? '').toString().trim().slice(0, 80) || null,
    phone: (body?.phone ?? '').toString().trim().slice(0, 30) || null,
  })
  if (error) {
    // The unique constraint fires if someone claimed the name in the seconds
    // between the browser check and this insert.
    const clash = error.code === '23505' || /duplicate key|team_name/i.test(error.message)
    return bad(clash
      ? `"${teamName}" is already taken. Choose a different team name and press Register again.`
      : 'Something went wrong setting up your team. Try again, or email info@grassrootsfantasy.co.nz.', clash ? 409 : 500)
  }
  return NextResponse.json({ ok: true })
}
