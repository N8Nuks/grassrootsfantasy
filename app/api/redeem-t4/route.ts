import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Player = { id: string; full_name: string; tier: string; positions: string[] }

function sample<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { code } = await request.json() as { code: string }
  if (!code?.trim()) return NextResponse.json({ error: 'No code entered' }, { status: 400 })

  const admin = createAdminClient()

  // Code must exist and be active
  const { data: codeRow } = await admin.from('t4_codes')
    .select('id, grade, active').eq('code', code.trim().toUpperCase()).maybeSingle()
  if (!codeRow || !codeRow.active) {
    return NextResponse.json({ error: 'Code not recognised or no longer active' }, { status: 400 })
  }
  const grade = codeRow.grade as 'mens' | 'womens'

  // Must have a team in this grade
  const { count: t1 } = await admin.from('cards').select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id).eq('grade', grade).eq('source', 't1')
  if (!t1) return NextResponse.json({ error: 'No team in this grade' }, { status: 400 })

  // Once per account per code
  const { data: existing } = await admin.from('t4_redemptions').select('id')
    .eq('owner_id', user.id).eq('code_id', codeRow.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'This code has already been used on your account' }, { status: 400 })

  // Owned players (no duplicates)
  const { data: owned } = await admin.from('cards').select('player_id')
    .eq('owner_id', user.id).eq('grade', grade)
  const ownedIds = new Set((owned ?? []).map(c => c.player_id))

  const { data: pool, error } = await admin.from('players')
    .select('id, full_name, tier, positions').eq('grade', grade).eq('active', true)
  if (error || !pool) return NextResponse.json({ error: 'Player pool unavailable' }, { status: 500 })

  const fresh = (pool as Player[]).filter(p => !ownedIds.has(p.id))
  const byTier = (t: string) => fresh.filter(p => p.tier === t)

  // 3 cards: 1 Elite + 1 Common guaranteed; third = 50% any Rare (2WP A or B) / 50% Elite
  const picks: Player[] = []
  const elite1 = sample(byTier('elite'))
  if (elite1) picks.push(elite1)
  const common1 = sample(byTier('common'))
  if (common1) picks.push(common1)

  const rarePool = [...byTier('rare_2wp_a'), ...byTier('rare_2wp_b')]
  const thirdIsRare = Math.random() < 0.5 && rarePool.length > 0
  const third = thirdIsRare
    ? sample(rarePool)
    : sample(byTier('elite').filter(p => !picks.includes(p)))
  if (third) picks.push(third)

  if (picks.length === 0) return NextResponse.json({ error: 'No cards available' }, { status: 500 })

  const { error: insertError } = await admin.from('cards')
    .insert(picks.map(p => ({ owner_id: user.id, player_id: p.id, grade, source: 't4' })))
  if (insertError) return NextResponse.json({ error: 'Deal failed: ' + insertError.message }, { status: 500 })

  await admin.from('t4_redemptions').insert({ owner_id: user.id, code_id: codeRow.id })

  return NextResponse.json({
    dealt: picks.length,
    players: picks.map(p => ({ name: p.full_name, tier: p.tier })),
    rare_hit: picks.some(p => p.tier.startsWith('rare')),
  })
}
