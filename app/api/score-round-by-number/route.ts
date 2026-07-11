import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createAdminClient()
  const { data: adminProfile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { grade, round_number } = await request.json() as { grade: string; round_number: number }

  const { data: round } = await admin.from('rounds')
    .select('id').eq('grade', grade).eq('round_number', round_number).single()
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const origin = new URL(request.url).origin
  const res = await fetch(`${origin}/api/score-round`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') ?? '' },
    body: JSON.stringify({ round_id: round.id }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}