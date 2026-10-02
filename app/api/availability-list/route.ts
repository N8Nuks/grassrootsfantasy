import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/* Read-only list of players marked unavailable for one grade + round.
   Feeds the list under Panel 5 on the admin page. */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const url = new URL(req.url)
  const grade = url.searchParams.get('grade')
  const roundNumber = Number(url.searchParams.get('round'))
  if (grade !== 'mens' && grade !== 'womens') {
    return NextResponse.json({ error: 'Bad grade' }, { status: 400 })
  }
  if (!Number.isInteger(roundNumber)) {
    return NextResponse.json({ error: 'Bad round number' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: round } = await admin.from('rounds')
    .select('id').eq('grade', grade).eq('round_number', roundNumber).maybeSingle()
  if (!round) return NextResponse.json({ players: [], round_found: false })

  const { data: rows, error } = await admin.from('player_availability')
    .select('player_id, reason').eq('round_id', round.id).eq('unavailable', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows?.length) return NextResponse.json({ players: [], round_found: true })

  const { data: players } = await admin.from('players')
    .select('id, full_name').in('id', rows.map(r => r.player_id))
  const names = new Map((players ?? []).map(p => [p.id, p.full_name as string]))

  const list = rows
    .map(r => ({ name: names.get(r.player_id) ?? 'Unknown player', reason: r.reason as string | null }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ players: list, round_found: true })
}