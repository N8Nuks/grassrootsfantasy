import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { names, grade, round_number, unavailable = true } = await request.json() as {
    names: string[]; grade: 'mens' | 'womens'; round_number: number; unavailable?: boolean
  }
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: 'No names provided' }, { status: 400 })
  }

  const { data: round } = await admin.from('rounds')
    .select('id').eq('grade', grade).eq('round_number', round_number).maybeSingle()
  if (!round) return NextResponse.json({ error: `Round ${round_number} (${grade}) does not exist yet` }, { status: 400 })

  const { data: players } = await admin.from('players').select('id, full_name').eq('grade', grade)
  const byName = new Map((players ?? []).map(p => [p.full_name.toLowerCase().trim(), p.id]))

  const rows: { player_id: string; round_id: string; unavailable: boolean }[] = []
  const unmatched: string[] = []
  for (const raw of names) {
    const id = byName.get(raw.toLowerCase().trim())
    if (!id) { unmatched.push(raw); continue }
    rows.push({ player_id: id, round_id: round.id, unavailable })
  }

  if (rows.length) {
    const { error } = await admin.from('player_availability')
      .upsert(rows, { onConflict: 'player_id,round_id' })
    if (error) return NextResponse.json({ error: 'Availability insert failed: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ marked: rows.length, unmatched })
}
