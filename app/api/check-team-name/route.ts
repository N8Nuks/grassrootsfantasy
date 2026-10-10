import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { teamNameProblem } from '@/lib/team-name'

// Anonymous visitors can't read profiles, so the availability check runs here
// with admin rights. Returns only a yes/no plus a reason — no names, no ids.
export async function POST(request: Request) {
  let name = ''
  try {
    const body = await request.json()
    name = (body?.name ?? '').trim()
  } catch { /* empty */ }

  if (!name) return NextResponse.json({ available: false, error: 'No name given' }, { status: 400 })

  const problem = teamNameProblem(name)
  if (problem) return NextResponse.json({ available: false, error: problem })

  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles')
    .select('id').ilike('team_name', name).maybeSingle()
  if (error) return NextResponse.json({ available: true })  // fail open; the constraint still guards

  return NextResponse.json({ available: !data, error: data ? 'That name is taken.' : undefined })
}