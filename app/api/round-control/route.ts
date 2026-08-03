import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { grade, action } = await req.json() as { grade: 'mens' | 'womens'; action: 'open' | 'lock' | 'provisional' | 'status' | 'advance' }
  const admin = createAdminClient()

  // Latest round for the grade
  const { data: round } = await admin.from('rounds')
    .select('id, round_number, status')
    .eq('grade', grade)
    .order('round_number', { ascending: false }).limit(1).maybeSingle()

  if (action === 'status') {
    return NextResponse.json({ round: round ?? null })
  }

  if (action === 'advance') {
    const nextNumber = (round?.round_number ?? 0) + 1
    const { error: advErr } = await admin.from('rounds')
      .insert({ grade, round_number: nextNumber, lock_at: new Date().toISOString(), status: 'open' })
    if (advErr) return NextResponse.json({ error: 'Advance failed: ' + advErr.message }, { status: 500 })
    return NextResponse.json({ ok: true, round_number: nextNumber, status: 'open' })
  }

  if (!round) return NextResponse.json({ error: 'No rounds exist for this grade yet' }, { status: 400 })
  if (round.status === 'confirmed') {
    return NextResponse.json({ error: `Round ${round.round_number} is confirmed and immutable` }, { status: 400 })
  }

  const status = action === 'open' ? 'open' : action === 'provisional' ? 'provisional' : 'locked'
  const { error } = await admin.from('rounds').update({ status }).eq('id', round.id)
  if (error) return NextResponse.json({ error: 'Update failed: ' + error.message }, { status: 500 })

  return NextResponse.json({ ok: true, round_number: round.round_number, status })
}