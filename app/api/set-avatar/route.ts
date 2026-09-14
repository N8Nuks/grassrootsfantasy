import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FRAMES = ['gold', 'crystal', 'diamond']

/* Saves the manager's avatar: which club's crest, and which frame.
   clubId null = their own registered club. */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const clubId: string | null = body?.clubId ?? null
  const frame: string = body?.frame ?? 'gold'
  if (!FRAMES.includes(frame)) return NextResponse.json({ error: 'Unknown frame' }, { status: 400 })

  if (clubId) {
    const { data: club } = await supabase.from('clubs').select('id').eq('id', clubId).maybeSingle()
    if (!club) return NextResponse.json({ error: 'Unknown club' }, { status: 400 })
  }

  const { error } = await supabase.from('profiles')
    .update({ avatar_club_id: clubId, avatar_frame: frame }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}