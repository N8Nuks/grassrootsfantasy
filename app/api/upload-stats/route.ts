import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STAT_COLS = ['gp','ab','singles','doubles','triples','hr','rbi','runs','bb','hbp','sac','sb','cs','k_bat','ip','k_pit','win','er']

// ── Name matching ──
// Names are compared with capitals, macrons, apostrophes, hyphens and extra
// spaces removed, so "Ogden Kiri" and "Ogden-Kiri" are the same name.
const normName = (s: string) => s
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/['’`]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

// Number of single-letter changes needed to turn one name into the other
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return row[b.length]
}

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
  const pool = (players ?? []).map(p => ({ id: p.id as string, name: p.full_name as string, key: normName(p.full_name) }))
  const byKey = new Map(pool.map(p => [p.key, p]))

  // Closest GF name to a name that has no exact match. Accepted only when it is
  // within two letters (three for long names) AND no other player is nearly as
  // close — two similar names (siblings, say) are left for a person to decide.
  const closestTo = (name: string) => {
    const key = normName(name)
    let best: typeof pool[number] | null = null
    let bestD = Infinity
    let secondD = Infinity
    for (const p of pool) {
      const d = editDistance(key, p.key)
      if (d < bestD) { secondD = bestD; bestD = d; best = p }
      else if (d < secondD) secondD = d
    }
    const limit = key.length >= 14 ? 3 : 2
    const accepted = best !== null && bestD <= limit && secondD - bestD >= 2
    return { best, accepted }
  }

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
  const warnings: string[] = []

  // Players named exactly in this file — a closest-spelling match must never
  // land on one of them, or two rows would load onto the same player.
  const taken = new Set<string>()
  for (const line of lines.slice(1)) {
    const name = splitLine(line)[nameIdx]
    const exact = name ? byKey.get(normName(name)) : undefined
    if (exact) taken.add(exact.id)
  }

  for (const line of lines.slice(1)) {
    const cells = splitLine(line)
    const name = cells[nameIdx]
    if (!name) continue

    let playerId = byKey.get(normName(name))?.id
    if (!playerId) {
      const { best, accepted } = closestTo(name)
      if (best && accepted && !taken.has(best.id)) {
        playerId = best.id
        taken.add(best.id)
        warnings.push(`"${name}" loaded as ${best.name} (closest spelling) — check it is the right player`)
      } else {
        unmatched.push(best ? `${name} (closest: ${best.name})` : name)
        continue
      }
    }

    const raw: Record<string, number> = {}
    header.forEach((h, i) => {
      if (STAT_COLS.includes(h)) {
        const v = parseFloat(cells[i])
        if (!isNaN(v) && (v !== 0 || h === 'gp')) raw[h] = v
      }
    })
    rows.push({ player_id: playerId, round_id: round!.id, raw })
  }

  // ── Sanity warnings (advisory only, nothing blocks) ──
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