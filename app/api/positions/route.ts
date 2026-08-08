import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_POS = ['P', 'C', 'B1', 'B2', 'B3', 'SS', 'LF', 'CF', 'RF', 'PB']
const VALID_REVEAL = ['P', 'C', 'IF', 'OF']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { playerId, positions, revealPos } = await req.json() as {
    playerId: string
    positions: string[]
    revealPos: string | null
  }
  if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 })

  const cleanPositions = (positions ?? []).filter(p => VALID_POS.includes(p))
  const cleanReveal = revealPos && VALID_REVEAL.includes(revealPos) ? revealPos : null

  const admin = createAdminClient()
  const { error } = await admin.from('players')
    .update({ positions: cleanPositions, reveal_pos: cleanReveal })
    .eq('id', playerId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}