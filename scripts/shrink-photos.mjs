import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const GO = process.argv.includes('--go')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: players, error } = await db.from('players')
  .select('id, full_name, photo_url').not('photo_url', 'is', null)
if (error) { console.error(error.message); process.exit(1) }

let before = 0, after = 0, done = 0, skipped = 0, failed = 0
for (const p of players) {
  if (p.photo_url.includes('/web/')) { skipped++; continue }   // already small
  try {
    const res = await fetch(p.photo_url)
    if (!res.ok) throw new Error(`fetch ${res.status}`)
    const src = Buffer.from(await res.arrayBuffer())
    const out = await sharp(src).rotate()
      .resize({ height: 1000, withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90 }).toBuffer()
    before += src.length; after += out.length
    console.log(`${p.full_name.padEnd(28)} ${Math.round(src.length/1024)} KB -> ${Math.round(out.length/1024)} KB`)
    if (GO) {
      const path = `web/${p.id}.webp`
      const { error: up } = await db.storage.from('player-photos')
        .upload(path, out, { contentType: 'image/webp', upsert: true })
      if (up) throw new Error(up.message)
      const { data: pub } = db.storage.from('player-photos').getPublicUrl(path)
      const { error: upd } = await db.from('players')
        .update({ photo_url: `${pub.publicUrl}?v=${Date.now()}` }).eq('id', p.id)
      if (upd) throw new Error(upd.message)
    }
    done++
  } catch (e) { failed++; console.log(`FAILED ${p.full_name}: ${e.message}`) }
}
console.log(`\n${GO ? 'DONE' : 'DRY RUN'} - ${done} photos, ${skipped} already small, ${failed} failed`)
console.log(`Total ${Math.round(before/1048576)} MB -> ${Math.round(after/1048576)} MB`)
