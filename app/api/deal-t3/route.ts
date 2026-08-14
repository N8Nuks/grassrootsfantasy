import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pickTwo, toDealtCards, loadPoolAndCirculation } from '@/lib/dealT3'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  let grade: 'mens' | 'womens' = 'mens'
  try {
    const body = await request.json()
    if (body?.grade === 'womens') grade = 'womens'
  } catch { /* default mens */ }

  // Latest round for grade = the claim window
  const { data: round } = await admin.from('rounds').select('id, round_number')
    .eq('grade', grade).order('round_number', { ascending: false }).limit(1).maybeSingle()
  if (!round) return NextResponse.json({ error: 'No rounds exist for this grade yet' }, { status: 400 })

  // Must hold a T1 (i.e. registered in this grade)
  const { count: t1 } = await admin.from('cards').select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id).eq('grade', grade).eq('source', 't1')
  if (!t1) return NextResponse.json({ error: 'No team in this grade' }, { status: 400 })

  // One claim per round per grade
  const { data: existing } = await admin.from('t3_claims').select('id')
    .eq('owner_id', user.id).eq('grade', grade).eq('round_id', round.id).maybeSingle()
  if (existing) return NextResponse.json({ error: `Round ${round.round_number} pack already claimed` }, { status: 400 })

  // Owned players (no duplicates)
  const { data: owned } = await admin.from('cards').select('player_id')
    .eq('owner_id', user.id).eq('grade', grade)
  const ownedIds = new Set((owned ?? []).map(c => c.player_id))

  const loaded = await loadPoolAndCirculation(admin, grade)
  if (!loaded) return NextResponse.json({ error: 'Player pool unavailable' }, { status: 500 })

  const picks = pickTwo(loaded.pool, ownedIds, loaded.circulation)
  if (picks.length === 0) return NextResponse.json({ error: 'No cards available' }, { status: 500 })

  const { error: insertError } = await admin.from('cards')
    .insert(picks.map(p => ({ owner_id: user.id, player_id: p.id, grade, source: 't3' })))
  if (insertError) return NextResponse.json({ error: 'Deal failed: ' + insertError.message }, { status: 500 })

  await admin.from('t3_claims').insert({ owner_id: user.id, grade, round_id: round.id })

  return NextResponse.json({
    dealt: picks.length,
    players: picks.map(p => p.full_name),
    cards: toDealtCards(picks),
  })
}