import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { grade } = await req.json() as { grade: 'mens' | 'womens' }
  const admin = createAdminClient()

  // Latest round for the grade — matchups always attach to the newest round
  const { data: round } = await admin.from('rounds')
    .select('id, round_number, status')
    .eq('grade', grade)
    .order('round_number', { ascending: false }).limit(1).maybeSingle()

  if (!round) return NextResponse.json({ error: 'No rounds exist for this grade yet' }, { status: 400 })
  if (round.status === 'confirmed') {
    return NextResponse.json({ error: `Round ${round.round_number} is confirmed and immutable` }, { status: 400 })
  }

  // A "team" is a distinct holder of T1 cards in this grade — same definition the dashboard uses
  const { data: t1Cards, error: cardErr } = await admin
    .from('cards').select('owner_id').eq('source', 't1').eq('grade', grade)
  if (cardErr) return NextResponse.json({ error: 'Card lookup failed: ' + cardErr.message }, { status: 500 })

  const owners = [...new Set((t1Cards ?? []).map(c => c.owner_id))]
  if (owners.length < 2) {
    return NextResponse.json({ error: `Only ${owners.length} team(s) in ${grade} — need at least 2` }, { status: 400 })
  }

  // Clear any existing pairings for this round so the button is safely re-runnable
  // after a new intake of users.
  const { error: delErr } = await admin.from('matchups').delete().eq('round_id', round.id)
  if (delErr) return NextResponse.json({ error: 'Could not clear old matchups: ' + delErr.message }, { status: 500 })

  // Shuffle so pairings differ round to round
  const pool = [...owners]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  // user_b is NOT NULL, so an odd field leaves one team unpaired.
  // Report it rather than inventing an opponent — admin adds a filler team and re-runs.
  const unpaired: string | null = pool.length % 2 === 1 ? pool[pool.length - 1] : null
  const pairable = unpaired ? pool.slice(0, -1) : pool

  const rows: { round_id: string; grade: string; user_a: string; user_b: string }[] = []
  for (let i = 0; i < pairable.length; i += 2) {
    rows.push({ round_id: round.id, grade, user_a: pairable[i], user_b: pairable[i + 1] })
  }

  const { error: insErr } = await admin.from('matchups').insert(rows)
  if (insErr) return NextResponse.json({ error: 'Insert failed: ' + insErr.message }, { status: 500 })

  // Name the unpaired team so admin knows exactly who is missing a fixture
  let unpairedName: string | null = null
  if (unpaired) {
    const { data: p } = await admin.from('profiles').select('team_name').eq('id', unpaired).maybeSingle()
    unpairedName = p?.team_name ?? unpaired
  }

  return NextResponse.json({
    ok: true,
    round_number: round.round_number,
    teams: owners.length,
    matchups: rows.length,
    unpaired: unpairedName,
  })
}