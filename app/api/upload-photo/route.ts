import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  // Admin guard — same pattern as every other admin route
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const playerId = form.get('player_id') as string | null
  const playingNumberRaw = (form.get('playing_number') as string | null) ?? ''
  const isUnder18 = (form.get('is_under18') as string | null) === 'true'

  if (!playerId) {
    return NextResponse.json({ error: 'Missing player_id' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Confirm the player exists
  const { data: player, error: pErr } = await admin
    .from('players').select('id, full_name').eq('id', playerId).single()
  if (pErr || !player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const updates: Record<string, unknown> = {
    playing_number: playingNumberRaw === '' ? null : Number(playingNumberRaw),
    is_under18: isUnder18,
  }

  let photoUpdated = false
  if (file) {
    // Store as <player_id>.png — re-uploading the same player overwrites cleanly
    const path = `${playerId}.png`
    const bytes = await file.arrayBuffer()

    const { error: upErr } = await admin.storage
      .from('player-photos')
      .upload(path, bytes, { contentType: 'image/png', upsert: true })
    if (upErr) return NextResponse.json({ error: 'Upload failed: ' + upErr.message }, { status: 500 })

    // Public URL, cache-busted so a replaced photo shows immediately
    const { data: pub } = admin.storage.from('player-photos').getPublicUrl(path)
    updates.photo_url = `${pub.publicUrl}?v=${Date.now()}`
    photoUpdated = true
  }

  const { error: dbErr } = await admin
    .from('players').update(updates).eq('id', playerId)
  if (dbErr) return NextResponse.json({ error: 'DB update failed: ' + dbErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, name: player.full_name, photo: photoUpdated })
}