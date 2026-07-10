import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STAT_COLS = ['singles','doubles','triples','hr','rbi','runs','bb','hbp','sb','cs','k_bat','ip','k_pit','win','er']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { csv, grade, round_number } = await request.json() as { csv: string; grade: 'mens'|'womens'; round_number: number }

  // Round: find or create — confirmed rounds are immutable
  let { data: round } = await admin.from('rounds').select('id, status').eq('grade', grade).eq('round_number', round_number).maybeSingle()
  if (round && round.status === 'confirmed') {
    return NextResponse.json({ error: `Round ${round_number} is confirmed and locked — stats cannot be changed` }, { status: 400 })
  }
  let overwriting = 0
  if (round) {
    const { count } = await admin.from('player_stats').select('id', { count: 'exact', head: true }).eq('round_id', round.id)
    overwriting = count ?? 0
  }
  if (!round) {
    const { data: created, error } = await admin.from('rounds')
      .insert({ grade, round_number, lock_at: new Date().toISOString(), status: 'provisional' })
      .select('id, status').single()
    if (error || !created) return NextResponse.json({ error: 'Round create failed' }, { status: 500 })
    round = created
  }

  // Players for name matching
  const { data: players } = await admin.from('players').select('id, full_name').eq('grade', grade)
  const byName = new Map((players ?? []).map(p => [p.full_name.toLowerCase().trim(), p.id]))

  // Parse CSV
  const lines = csv.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const nameIdx = header.indexOf('player')
  if (nameIdx === -1) return NextResponse.json({ error: 'CSV must have a "player" column' }, { status: 400 })

  const rows: { player_id: string; round_id: string; raw: Record<string, number> }[] = []
  const unmatched: string[] = []

  for (const line of lines.slice(1)) {
    const cells = line.split(',').map(c => c.trim())
    const name = cells[nameIdx]
    if (!name) continue
    const playerId = byName.get(name.toLowerCase())
    if (!playerId) { unmatched.push(name); continue }
    const raw: Record<string, number> = {}
    header.forEach((h, i) => {
      if (STAT_COLS.includes(h)) {
        const v = parseFloat(cells[i])
        if (!isNaN(v) && v !== 0) raw[h] = v
      }
    })
    rows.push({ player_id: playerId, round_id: round!.id, raw })
  }

  if (rows.length) {
    const { error } = await admin.from('player_stats').upsert(rows, { onConflict: 'player_id,round_id' })
    if (error) return NextResponse.json({ error: 'Stats insert failed: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ loaded: rows.length, unmatched, round_id: round!.id, overwriting })
}