import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAvatarImage } from '@/lib/avatars'

const FRAMES = ['gold', 'crystal', 'diamond']

/* Saves the manager's avatar. Either a club crest (clubId; null = own club)
   or a figure image from the gallery — never both. Plus the frame. */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const frame: string = body?.frame ?? 'gold'
  if (!FRAMES.includes(frame)) return NextResponse.json({ error: 'Unknown frame' }, { status: 400 })

  const image: string | null = body?.image ?? null
  if (image !== null && !isAvatarImage(image)) return NextResponse.json({ error: 'Unknown image' }, { status: 400 })

  const clubId: string | null = image ? null : (body?.clubId ?? null)
  if (clubId) {
    const { data: club } = await supabase.from('clubs').select('id').eq('id', clubId).maybeSingle()
    if (!club) return NextResponse.json({ error: 'Unknown club' }, { status: 400 })
  }

  const { error } = await supabase.from('profiles')
    .update({ avatar_club_id: clubId, avatar_image: image, avatar_frame: frame }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}