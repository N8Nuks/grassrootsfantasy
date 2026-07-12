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
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { grade } = await request.json() as { grade: 'mens' | 'womens' }

  // All T1 holders in the grade
  const { data: t1Cards } = await admin.from('cards')
    .select('owner_id').eq('grade', grade).eq('source', 't1')
  const holders = [...new Set((t1Cards ?? []).map(c => c.owner_id))]

  // Those who already opened T2
  const { data: t2Cards } = await admin.from('cards')
    .select('owner_id').eq('grade', grade).eq('source', 't2')
  const opened = new Set((t2Cards ?? []).map(c => c.owner_id))
  const pending = holders.filter(h => !opened.has(h))

  if (pending.length === 0) return NextResponse.json({ forced: 0, message: 'All Pre-Season Packs already opened' })

  const { data: pool, error } = await admin.from('players')
    .select('id, full_name, tier, positions, stats').eq('grade', grade).eq('active', true)
  if (error || !pool) return NextResponse.json({ error: 'Player pool unavailable' }, { status: 500 })

  let forced = 0
  const failures: string[] = []

  for (const ownerId of pending) {
    try {
      const { data: owned } = await admin.from('cards').select('player_id')
        .eq('owner_id', ownerId).eq('grade', grade)
      const ownedIds = new Set((owned ?? []).map(c => c.player_id))

      const picks = dealT2(pool as Player[], ownedIds)
      if (picks.length === 0) { failures.push(ownerId); continue }

      const { data: inserted, error: insertError } = await admin.from('cards')
        .insert(picks.map(p => ({ owner_id: ownerId, player_id: p.id, grade, source: 't2' })))
        .select('id, player_id')
      if (insertError || !inserted) { failures.push(ownerId); continue }

      const { data: lineupRow } = await admin.from('lineups').select('id')
        .eq('owner_id', ownerId).eq('grade', grade)
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
      forced++
    } catch {
      failures.push(ownerId)
    }
  }

  return NextResponse.json({ forced, pending: pending.length, failures: failures.length })
}