import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { names, grade, round_number, unavailable = true } = await request.json() as {
    names: string[]; grade: 'mens' | 'womens'; round_number: number; unavailable?: boolean
  }
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: 'No names provided' }, { status: 400 })
  }

  const { data: round } = await admin.from('rounds')
    .select('id').eq('grade', grade).eq('round_number', round_number).maybeSingle()
  if (!round) return NextResponse.json({ error: `Round ${round_number} (${grade}) does not exist yet` }, { status: 400 })

  const { data: players } = await admin.from('players').select('id, full_name, club_id').eq('grade', grade)
  const { data: clubs } = await admin.from('clubs').select('id, name')
  const byName = new Map((players ?? []).map(p => [p.full_name.toLowerCase().trim(), p.id]))

  const rows: { player_id: string; round_id: string; unavailable: boolean }[] = []
  const clubRows: { player_id: string; round_id: string; unavailable: boolean; reason: string | null }[] = []
  const unmatched: string[] = []
  for (const raw of names) {
    const text = raw.trim()
    // "club:Marist United" marks the whole squad (a bye, a forfeit, a club pulling out)
    if (text.toLowerCase().startsWith('club:')) {
      const clubName = text.slice(5).trim().toLowerCase()
      const clubIds = (clubs ?? []).filter(c => c.name.toLowerCase() === clubName).map(c => c.id)
      const members = (players ?? []).filter(p => p.club_id && clubIds.includes(p.club_id))
      if (!members.length) { unmatched.push(raw); continue }
      for (const m of members) {
        clubRows.push({ player_id: m.id, round_id: round.id, unavailable, reason: unavailable ? 'Bye' : null })
      }
      continue
    }
    const id = byName.get(text.toLowerCase())
    if (!id) { unmatched.push(raw); continue }
    rows.push({ player_id: id, round_id: round.id, unavailable })
  }

  for (const batch of [rows, clubRows]) {
    if (!batch.length) continue
    const { error } = await admin.from('player_availability')
      .upsert(batch, { onConflict: 'player_id,round_id' })
    if (error) return NextResponse.json({ error: 'Availability insert failed: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ marked: rows.length + clubRows.length, unmatched })
}