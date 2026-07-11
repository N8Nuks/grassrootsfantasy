import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Player = { id: string; full_name: string; tier: string; positions: string[] }

// Weighted pick: players with fewer cards in circulation are more likely
function weightedPick(pool: Player[], circulation: Map<string, number>, n: number): Player[] {
  const picks: Player[] = []
  const candidates = [...pool]
  for (let i = 0; i < n && candidates.length > 0; i++) {
    const maxCirc = Math.max(...candidates.map(p => circulation.get(p.id) ?? 0), 1)
    // weight = (maxCirc + 1) - own circulation  ->  under-dispersed players weigh more
    const weights = candidates.map(p => (maxCirc + 1) - (circulation.get(p.id) ?? 0))
    const total = weights.reduce((a, b) => a + b, 0)
    let roll = Math.random() * total
    let idx = 0
    for (; idx < weights.length; idx++) {
      roll -= weights[idx]
      if (roll <= 0) break
    }
    idx = Math.min(idx, candidates.length - 1)
    picks.push(candidates[idx])
    candidates.splice(idx, 1)
  }
  return picks
}

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

  // Circulation counts (how many cards exist per player, this grade)
  const { data: allCards } = await admin.from('cards').select('player_id').eq('grade', grade)
  const circulation = new Map<string, number>()
  for (const c of allCards ?? []) {
    circulation.set(c.player_id, (circulation.get(c.player_id) ?? 0) + 1)
  }

  const { data: pool, error } = await admin.from('players')
    .select('id, full_name, tier, positions').eq('grade', grade).eq('active', true)
  if (error || !pool) return NextResponse.json({ error: 'Player pool unavailable' }, { status: 500 })

  const fresh = (pool as Player[]).filter(p => !ownedIds.has(p.id))
  // 2 cards: ~80% Common / ~20% Elite per slot
  const picks: Player[] = []
  for (let i = 0; i < 2; i++) {
    const tier = Math.random() < 0.2 ? 'elite' : 'common'
    const tierPool = fresh.filter(p => p.tier === tier && !picks.includes(p))
    const fallback = fresh.filter(p => (p.tier === 'common' || p.tier === 'elite') && !picks.includes(p))
    const source = tierPool.length > 0 ? tierPool : fallback
    picks.push(...weightedPick(source, circulation, 1))
  }
  if (picks.length === 0) return NextResponse.json({ error: 'No cards available' }, { status: 500 })

  const { error: insertError } = await admin.from('cards')
    .insert(picks.map(p => ({ owner_id: user.id, player_id: p.id, grade, source: 't3' })))
  if (insertError) return NextResponse.json({ error: 'Deal failed: ' + insertError.message }, { status: 500 })

  await admin.from('t3_claims').insert({ owner_id: user.id, grade, round_id: round.id })

  return NextResponse.json({ dealt: picks.length, players: picks.map(p => p.full_name) })
}
