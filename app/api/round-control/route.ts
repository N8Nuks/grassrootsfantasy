import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoDealUnclaimed } from '@/lib/dealT3'

const FAR_FUTURE = () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { grade, action } = await req.json() as { grade: 'mens' | 'womens'; action: 'open' | 'lock' | 'provisional' | 'status' | 'advance' }
  const admin = createAdminClient()

  // Latest round for the grade
  const { data: round } = await admin.from('rounds')
    .select('id, round_number, status')
    .eq('grade', grade)
    .order('round_number', { ascending: false }).limit(1).maybeSingle()

  if (action === 'status') {
    return NextResponse.json({ round: round ?? null })
  }

  if (action === 'advance') {
    // Anyone who never claimed the closing round's Weekly Pack gets it dealt
    // straight into their collection — no reveal, but nobody loses cards.
    let auto = { dealt: 0, cards: 0 }
    if (round) {
      try {
        auto = await autoDealUnclaimed(admin, grade, round.id)
      } catch (e) {
        return NextResponse.json(
          { error: 'Auto-deal failed, round not advanced: ' + (e as Error).message },
          { status: 500 })
      }
    }

    // Next Round is the Tuesday cut-off: a scored (provisional) round becomes
    // confirmed, which locks its stats, before the next round opens.
    if (round && round.status === 'provisional') {
      const { error: confErr } = await admin.from('rounds')
        .update({ status: 'confirmed' }).eq('id', round.id)
      if (confErr) {
        return NextResponse.json(
          { error: 'Could not confirm the round, not advanced: ' + confErr.message },
          { status: 500 })
      }
    }

    const nextNumber = (round?.round_number ?? 0) + 1
    // New rounds open with lineups hidden from opponents until Lock stamps lock_at
    const { data: newRound, error: advErr } = await admin.from('rounds')
      .insert({ grade, round_number: nextNumber, lock_at: FAR_FUTURE(), status: 'open' })
      .select('id').single()
    if (advErr || !newRound) {
      return NextResponse.json({ error: 'Advance failed: ' + (advErr?.message ?? 'no round returned') }, { status: 500 })
    }

    /* Auto team: every team gets its latest lineup carried into the new round,
       so anyone who doesn't re-save still has a side on /matchups and in
       scoring. Runs in the database (carry_forward_lineups) because the slot
       copy runs to thousands of rows, past the 1,000-row select cap. Teams
       that already have a lineup in the new round are skipped, so a re-run is
       harmless. */
    const { data: carried, error: cfErr } = await admin
      .rpc('carry_forward_lineups', { p_to: newRound.id })
    if (cfErr) {
      return NextResponse.json({
        error: `Round ${nextNumber} created, but carrying lineups forward failed: ${cfErr.message}. ` +
               `Run carry_forward_lineups for this round in SQL before locking.`,
      }, { status: 500 })
    }
    const cf = Array.isArray(carried) ? carried[0] : carried

    return NextResponse.json({
      ok: true, round_number: nextNumber, status: 'open',
      auto_dealt: auto.dealt, auto_cards: auto.cards,
      lineups_carried: cf?.lineups_created ?? 0,
      slots_carried: cf?.slots_copied ?? 0,
    })
  }

  if (!round) return NextResponse.json({ error: 'No rounds exist for this grade yet' }, { status: 400 })
  if (round.status === 'confirmed') {
    return NextResponse.json({ error: `Round ${round.round_number} is confirmed and immutable` }, { status: 400 })
  }

  const status = action === 'open' ? 'open' : action === 'provisional' ? 'provisional' : 'locked'
  const patch: Record<string, string> = { status }
  if (action === 'lock') patch.lock_at = new Date().toISOString()   // reveal lineups
  if (action === 'open') patch.lock_at = FAR_FUTURE()               // hide lineups again
  const { error } = await admin.from('rounds').update(patch).eq('id', round.id)
  if (error) return NextResponse.json({ error: 'Update failed: ' + error.message }, { status: 500 })

  return NextResponse.json({ ok: true, round_number: round.round_number, status })
}