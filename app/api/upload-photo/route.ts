import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REVEAL_POS = ['P', 'C', 'IF', 'OF']

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
  const revealPosRaw = (form.get('reveal_pos') as string | null) ?? ''
  const isUnder18 = (form.get('is_under18') as string | null) === 'true'

  if (!playerId) {
    return NextResponse.json({ error: 'Missing player_id' }, { status: 400 })
  }
  if (revealPosRaw !== '' && !REVEAL_POS.includes(revealPosRaw)) {
    return NextResponse.json({ error: 'Unknown reveal position' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Confirm the player exists
  const { data: player, error: pErr } = await admin
    .from('players').select('id, full_name').eq('id', playerId).single()
  if (pErr || !player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const updates: Record<string, unknown> = {
    playing_number: playingNumberRaw === '' ? null : Number(playingNumberRaw),
    // Empty means "auto" — the reveal works it out from the positions array
    reveal_pos: revealPosRaw === '' ? null : revealPosRaw,
    is_under18: isUnder18,
  }

  let photoUpdated = false
  if (file) {
    const bytes = Buffer.from(await file.arrayBuffer())

    // Original kept at <player_id>.png — re-uploading the same player overwrites cleanly
    const { error: upErr } = await admin.storage
      .from('player-photos')
      .upload(`${playerId}.png`, bytes, { contentType: 'image/png', upsert: true })
    if (upErr) return NextResponse.json({ error: 'Upload failed: ' + upErr.message }, { status: 500 })

    /* The card only ever shows a photo ~500px tall, and premium cards draw it
       three times. Full-size uploads (1–2 MB each) made reveals crawl and some
       cards stall blank, so the card uses a 1000px WebP with the cut-out kept. */
    let small: Buffer
    try {
      small = await sharp(bytes).rotate()
        .resize({ height: 1000, withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90 }).toBuffer()
    } catch {
      return NextResponse.json({ error: 'Could not read that image — upload a PNG with a transparent background' }, { status: 400 })
    }
    const webPath = `web/${playerId}.webp`
    const { error: webErr } = await admin.storage
      .from('player-photos')
      .upload(webPath, small, { contentType: 'image/webp', upsert: true })
    if (webErr) return NextResponse.json({ error: 'Upload failed: ' + webErr.message }, { status: 500 })

    // Public URL, cache-busted so a replaced photo shows immediately
    const { data: pub } = admin.storage.from('player-photos').getPublicUrl(webPath)
    updates.photo_url = `${pub.publicUrl}?v=${Date.now()}`
    photoUpdated = true
  }

  const { error: dbErr } = await admin
    .from('players').update(updates).eq('id', playerId)
  if (dbErr) return NextResponse.json({ error: 'DB update failed: ' + dbErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, name: player.full_name, photo: photoUpdated })
}