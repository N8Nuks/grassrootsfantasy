import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STAT_COLS = ['ab','singles','doubles','triples','hr','rbi','runs','bb','hbp','sb','cs','k_bat','ip','k_pit','win','er']

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
  if (round && round.status === 'open') {
    return NextResponse.json({ error: `Round ${round_number} is still open — lock it in Round Control before scoring` }, { status: 400 })
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

  // Parse: commas, tabs, or runs of 2+ spaces (clipboard artifacts) as delimiters
  const lines = csv.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const splitLine = (l: string) => l.includes(',')
    ? l.split(',').map(c => c.trim())
    : l.split(/\t+|\s{2,}/).map(c => c.trim()).filter(Boolean)
  const header = splitLine(lines[0]).map(h => h.toLowerCase())
  const nameIdx = header.indexOf('player')
  if (nameIdx === -1) return NextResponse.json({ error: 'CSV must have a "player" column' }, { status: 400 })

  const rows: { player_id: string; round_id: string; raw: Record<string, number> }[] = []
  const unmatched: string[] = []

  for (const line of lines.slice(1)) {
    const cells = splitLine(line)
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

  // ── Sanity warnings (advisory only, nothing blocks) ──
  const warnings: string[] = []
  if (!header.includes('ab')) {
    warnings.push('No "ab" column — season batting averages will not accrue from this round')
  }
  const { data: clubLookup } = await admin.from('players').select('id, clubs(name)').eq('grade', grade)
  const clubOf = new Map((clubLookup ?? []).map(p => [p.id, (p as unknown as { clubs: { name: string } | null }).clubs?.name ?? '?']))
  const winsByClub = new Map<string, string[]>()
  const nameOf = new Map((players ?? []).map(p => [p.id, p.full_name]))
  for (const r of rows) {
    const raw = r.raw
    const hits = (raw.singles ?? 0) + (raw.doubles ?? 0) + (raw.triples ?? 0) + (raw.hr ?? 0)
    const pname = nameOf.get(r.player_id) ?? '?'
    if (raw.ab != null && hits > raw.ab) warnings.push(`${pname}: ${hits} hits from ${raw.ab} at-bats`)
    if ((raw.hr ?? 0) > 4) warnings.push(`${pname}: ${raw.hr} HR in one round`)
    if ((raw.sb ?? 0) > 5) warnings.push(`${pname}: ${raw.sb} SB in one round`)
    if ((raw.win ?? 0) > 0) {
      const club = clubOf.get(r.player_id) ?? '?'
      winsByClub.set(club, [...(winsByClub.get(club) ?? []), pname])
    }
  }
  for (const [club, names] of winsByClub) {
    if (names.length > 1) warnings.push(`${club} has ${names.length} pitching Ws this round (${names.join(', ')}) — one WP per winning team per game`)
  }

  if (rows.length) {
    const { error } = await admin.from('player_stats').upsert(rows, { onConflict: 'player_id,round_id' })
    if (error) return NextResponse.json({ error: 'Stats insert failed: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ loaded: rows.length, unmatched, round_id: round!.id, overwriting, warnings })
}
