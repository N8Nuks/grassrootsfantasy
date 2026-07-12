import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreRound } from '@/lib/score-round'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { grade, round_number } = await request.json() as { grade: string; round_number: number }
  const { data: round } = await admin.from('rounds')
    .select('id').eq('grade', grade).eq('round_number', round_number).single()
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const result = await scoreRound(admin, round.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}