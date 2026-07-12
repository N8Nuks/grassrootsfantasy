import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Player = { id: string; full_name: string; tier: string; positions: string[]; stats?: Record<string, number> }

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return out
}

function dealT2(pool: Player[], ownedPlayerIds: Set<string>): Player[] {
  const fresh = pool.filter(p => !ownedPlayerIds.has(p.id))
  const elites = fresh.filter(p => p.tier === 'elite')
  const commons = fresh.filter(p => p.tier === 'common')
  for (let attempt = 0; attempt < 100; attempt++) {
    const picks = [...sample(elites, 3), ...sample(commons, 6)]
    if (picks.length !== 9) break
    const hasC = picks.some(p => p.positions.includes('C'))
    const hasP = picks.some(p => p.positions.includes('P'))
    if (hasC && hasP) return picks
  }
  return [...sample(elites, 3), ...sample(commons, 6)]
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

  // Release gate — Pre-Season Packs open when admin releases the grade
  const { data: config } = await admin.from('scoring_config')
    .select('t2_released').eq('grade', grade).single()
  if (!config?.t2_released) {
    return NextResponse.json({ error: 'Pre-Season Packs are not released yet' }, { status: 403 })
  }

  const { count: t1 } = await admin.from('cards').select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id).eq('grade', grade).eq('source', 't1')
  if (!t1) return NextResponse.json({ error: 'No Starter Pack found — register first' }, { status: 400 })
  const { count: t2 } = await admin.from('cards').select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id).eq('grade', grade).eq('source', 't2')
  if (t2 && t2 > 0) return NextResponse.json({ error: 'Pre-season pack already opened' }, { status: 400 })

  const { data: owned } = await admin.from('cards').select('player_id')
    .eq('owner_id', user.id).eq('grade', grade)
  const ownedIds = new Set((owned ?? []).map(c => c.player_id))

  const { data: pool, error } = await admin.from('players')
    .select('id, full_name, tier, positions, stats').eq('grade', grade).eq('active', true)
  if (error || !pool) return NextResponse.json({ error: 'Player pool unavailable' }, { status: 500 })

  const picks = dealT2(pool as Player[], ownedIds)
  if (picks.length === 0) return NextResponse.json({ error: 'No cards available to deal' }, { status: 500 })

  const { data: inserted, error: insertError } = await admin.from('cards')
    .insert(picks.map(p => ({ owner_id: user.id, player_id: p.id, grade, source: 't2' })))
    .select('id, player_id')
  if (insertError || !inserted) return NextResponse.json({ error: 'Deal failed: ' + insertError?.message }, { status: 500 })

  // Auto-populate bench (best 4) and reserve (rest 5) on the user's latest lineup for this grade
  const { data: lineupRow } = await admin.from('lineups').select('id')
    .eq('owner_id', user.id).eq('grade', grade)
    .order('submitted_at', { ascending: false }).limit(1).maybeSingle()

  if (lineupRow) {
    const tierRank = (t: string) => ['rare_2wp_a','rare_2wp_b','elite','common'].indexOf(t)
    const ranked = [...picks].sort((a, b) => {
      const tr = tierRank(a.tier) - tierRank(b.tier)
      if (tr !== 0) return tr
      return (Number(b.stats?.career_ba) || 0) - (Number(a.stats?.career_ba) || 0)
    })
    const cardIdByPlayer = new Map(inserted.map(c => [c.player_id, c.id]))
    const benchSlots = ['BENCH1','BENCH2','BENCH3','BENCH4']
    const resSlots = ['RES1','RES2','RES3','RES4','RES5']
    const slotRows = ranked.map((p, i) => ({
      lineup_id: lineupRow.id,
      slot: i < 4 ? benchSlots[i] : resSlots[i - 4],
      card_id: cardIdByPlayer.get(p.id),
      batting_order: null,
    }))
    await admin.from('lineup_slots').insert(slotRows)
  }

  return NextResponse.json({
    dealt: picks.length,
    players: picks.map(p => p.full_name),
    cards: picks.map(p => ({ name: p.full_name, tier: p.tier, positions: p.positions })),
  })
}