import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Parses lines like "Floyd Nola, 99" / "Floyd Nola	99" / "Floyd Nola 99"
function parseLines(text: string): { name: string; number: number }[] {
  const out: { name: string; number: number }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^(.*?)[,\t ]+(\d{1,3})$/)
    if (!m) continue
    const name = m[1].replace(/,$/, '').trim().replace(/\s+/g, ' ')
    const number = Number(m[2])
    if (name && number >= 0) out.push({ name, number })
  }
  return out
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { text, grade, confirm } = await req.json() as { text: string; grade: 'mens' | 'womens'; confirm: boolean }
  if (!text?.trim()) return NextResponse.json({ error: 'Nothing pasted' }, { status: 400 })

  const entries = parseLines(text)
  if (entries.length === 0) return NextResponse.json({ error: 'No valid "name, number" lines found' }, { status: 400 })

  const admin = createAdminClient()
  const { data: players } = await admin
    .from('players').select('id, full_name, playing_number')
    .eq('grade', grade).eq('active', true)

  const byName = new Map((players ?? []).map(p => [p.full_name.toLowerCase().replace(/\s+/g, ' '), p]))

  const matched: { id: string; name: string; number: number; had: number | null }[] = []
  const unmatched: string[] = []
  for (const e of entries) {
    const p = byName.get(e.name.toLowerCase())
    if (p) matched.push({ id: p.id, name: p.full_name, number: e.number, had: p.playing_number })
    else unmatched.push(`${e.name}, ${e.number}`)
  }

  // Preview mode: report only, write nothing
  if (!confirm) {
    return NextResponse.json({ matched, unmatched, wrote: 0 })
  }

  let wrote = 0
  for (const m of matched) {
    const { error } = await admin.from('players')
      .update({ playing_number: m.number }).eq('id', m.id)
    if (!error) wrote++
  }
  return NextResponse.json({ matched, unmatched, wrote })
}