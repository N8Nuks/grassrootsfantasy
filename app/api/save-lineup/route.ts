import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STARTER_SLOTS = ['P','C','B1','B2','B3','SS','LF','CF','RF','DP','PB','DR']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { slots, grade, captainCardId, viceCaptainCardId } = await request.json() as {
    grade: 'mens' | 'womens'
    slots: { slot: string; card_id: string; batting_order: number | null }[]
    captainCardId?: string | null
    viceCaptainCardId?: string | null
  }

  // A lineup with no slots is never a legitimate save — an empty write would
  // replace the manager's real lineup with nothing, which is how teams have
  // appeared to vanish. Registration deals lineups through a different path.
  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'Nothing to save — your lineup is empty' }, { status: 400 })
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

  // Armbands — must be cards in this lineup, and can't both be the same player
  const inLineup = new Set(cardIds)
  const captain = captainCardId && inLineup.has(captainCardId) ? captainCardId : null
  let viceCaptain = viceCaptainCardId && inLineup.has(viceCaptainCardId) ? viceCaptainCardId : null
  if (viceCaptain && viceCaptain === captain) viceCaptain = null

  // Upsert lineup then replace slots
  const { data: lineupRow, error: lineupError } = await admin.from('lineups')
    .upsert({
      owner_id: user.id,
      round_id: round.id,
      grade,
      submitted_at: new Date().toISOString(),
      captain_card_id: captain,
      vice_captain_card_id: viceCaptain,
    }, { onConflict: 'owner_id,round_id' })
    .select('id').single()
  if (lineupError || !lineupRow) return NextResponse.json({ error: 'Lineup save failed' }, { status: 500 })

  await admin.from('lineup_slots').delete().eq('lineup_id', lineupRow.id)
  const { error: slotError } = await admin.from('lineup_slots')
    .insert(slots.map(s => ({ lineup_id: lineupRow.id, slot: s.slot, card_id: s.card_id, batting_order: s.batting_order })))
  if (slotError) return NextResponse.json({ error: 'Slot save failed: ' + slotError.message }, { status: 500 })

  return NextResponse.json({ saved: slots.length, captain, viceCaptain })
}