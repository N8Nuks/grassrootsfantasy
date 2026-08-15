import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Records a perfect game against a player. Cycles are detected automatically
// during scoring; perfect games can't be inferred from the stat columns we hold,
// so the scorer reports them and they're entered here.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { names, grade, round_number, remove } = await request.json() as {
    names: string[]; grade: 'mens' | 'womens'; round_number: number; remove?: boolean
  }
  if (!names?.length) return NextResponse.json({ error: 'No names given' }, { status: 400 })

  const { data: round } = await admin.from('rounds')
    .select('id, round_number').eq('grade', grade).eq('round_number', round_number).maybeSingle()
  if (!round) return NextResponse.json({ error: `Round ${round_number} not found for ${grade}` }, { status: 404 })

  const matched: string[] = []
  const unmatched: string[] = []
  const rows: {
    player_id: string; grade: string; kind: string
    earned_round_id: string; applies_round_number: number
  }[] = []

  for (const raw of names) {
    const name = raw.trim()
    if (!name) continue
    const { data: player } = await admin.from('players')
      .select('id, full_name').eq('grade', grade).ilike('full_name', name).maybeSingle()
    if (!player) { unmatched.push(name); continue }
    matched.push(player.full_name)
    rows.push({
      player_id: player.id,
      grade,
      kind: 'perfect_game',
      earned_round_id: round.id,
      applies_round_number: round.round_number + 1,
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({ marked: 0, matched, unmatched })
  }

  if (remove) {
    for (const r of rows) {
      await admin.from('player_achievements').delete()
        .eq('player_id', r.player_id).eq('earned_round_id', r.earned_round_id).eq('kind', 'perfect_game')
    }
    return NextResponse.json({ marked: rows.length, matched, unmatched, removed: true })
  }

  const { error } = await admin.from('player_achievements')
    .upsert(rows, { onConflict: 'player_id,earned_round_id,kind' })
  if (error) return NextResponse.json({ error: 'Save failed: ' + error.message }, { status: 500 })

  return NextResponse.json({ marked: rows.length, matched, unmatched })
}