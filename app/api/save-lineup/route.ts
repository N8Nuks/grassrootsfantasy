import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STARTER_SLOTS = ['P','C','B1','B2','B3','SS','LF','CF','RF','DP','PB','DR']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { slots, grade } = await request.json() as {
    grade: 'mens' | 'womens'
    slots: { slot: string; card_id: string; batting_order: number | null }[]
  }

  const admin = createAdminClient()

  // Current open round for grade
  const { data: round } = await admin.from('rounds')
    .select('id, status').eq('grade', grade).eq('status', 'open')
    .order('round_number', { ascending: false }).limit(1).single()
  if (!round) return NextResponse.json({ error: 'No open round — lineups are locked' }, { status: 400 })

  // All submitted cards must belong to this user
  const cardIds = slots.map(s => s.card_id)
  const { data: owned } = await admin.from('cards')
    .select('id, players(positions)').eq('owner_id', user.id).in('id', cardIds)
  if (!owned || owned.length !== cardIds.length) {
    return NextResponse.json({ error: 'Card ownership check failed' }, { status: 403 })
  }

  // Eligibility check per slot
  const posByCard = new Map(owned.map(c => [c.id, (c.players as unknown as { positions: string[] })?.positions ?? []]))
  for (const s of slots) {
    if (!STARTER_SLOTS.includes(s.slot) && !s.slot.startsWith('BENCH') && !s.slot.startsWith('RES')) {
      return NextResponse.json({ error: `Unknown slot ${s.slot}` }, { status: 400 })
    }
    if (STARTER_SLOTS.includes(s.slot) && s.slot !== 'DP' && s.slot !== 'DR') {
      const pos = posByCard.get(s.card_id) ?? []
      if (!pos.includes(s.slot)) {
        return NextResponse.json({ error: `Card not eligible for ${s.slot}` }, { status: 400 })
      }
    }
  }

  // Upsert lineup then replace slots
  const { data: lineupRow, error: lineupError } = await admin.from('lineups')
    .upsert({ owner_id: user.id, round_id: round.id, grade, submitted_at: new Date().toISOString() },
            { onConflict: 'owner_id,round_id' })
    .select('id').single()
  if (lineupError || !lineupRow) return NextResponse.json({ error: 'Lineup save failed' }, { status: 500 })

  await admin.from('lineup_slots').delete().eq('lineup_id', lineupRow.id)
  const { error: slotError } = await admin.from('lineup_slots')
    .insert(slots.map(s => ({ lineup_id: lineupRow.id, slot: s.slot, card_id: s.card_id, batting_order: s.batting_order })))
  if (slotError) return NextResponse.json({ error: 'Slot save failed: ' + slotError.message }, { status: 500 })

  return NextResponse.json({ saved: slots.length })
}