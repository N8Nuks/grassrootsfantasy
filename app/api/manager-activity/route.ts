import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* Manager activity for Admin: who is still playing and who has drifted off.

   How "set their lineup" is read: a lineup row's submitted_at is the last time
   the manager saved. Next Round carries each lineup into the new round and
   copies that timestamp with it, so an untouched lineup keeps its old date. A
   lineup counts as set for a round when it was saved after the round before
   it locked.

   How "opened their pack" is read: packs nobody claimed are dealt in one batch
   at Next Round, so those claims share a timestamp. A claim with a timestamp
   of its own was opened by the manager. */

type Grade = 'mens' | 'womens'

// Plain selects stop at 1,000 rows; read every page
async function all<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

async function emailsAndSignIns(admin: SupabaseClient) {
  const email = new Map<string, string>()
  const seen = new Map<string, string | null>()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    for (const u of data.users) {
      if (u.email) email.set(u.id, u.email)
      seen.set(u.id, u.last_sign_in_at ?? null)
    }
    if (data.users.length < 1000) break
  }
  return { email, seen }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const g = new URL(req.url).searchParams.get('grade')
  if (g !== 'mens' && g !== 'womens') return NextResponse.json({ error: 'Bad grade' }, { status: 400 })
  const grade: Grade = g

  try {
    type RoundRow = { id: string; round_number: number; status: string; lock_at: string | null }
    const { data: roundRows } = await admin.from('rounds')
      .select('id, round_number, status, lock_at').eq('grade', grade).gte('round_number', 0).order('round_number')
    const rounds = (roundRows ?? []) as RoundRow[]
    const current = rounds.length ? rounds[rounds.length - 1] : null
    if (!current) return NextResponse.json({ round: null, managers: [], trend: [], summary: null })

    const now = Date.now()
    const lockMs = (r: RoundRow) => {
      const t = r.lock_at ? new Date(r.lock_at).getTime() : NaN
      return Number.isFinite(t) && t <= now ? t : null      // an open round's lock is far in the future
    }
    // The moment the round before each one locked: a save after it is for this round
    const openedMs = new Map<string, number | null>()
    rounds.forEach((r, i) => {
      let t: number | null = null
      for (let j = i - 1; j >= 0 && t == null; j--) t = lockMs(rounds[j])
      openedMs.set(r.id, t)
    })
    const roundById = new Map(rounds.map(r => [r.id, r]))
    const playRounds = rounds.filter(r => r.round_number > 0 && r.status !== 'catchup')

    type LineupRow = { owner_id: string; round_id: string; submitted_at: string | null }
    type ClaimRow = { owner_id: string; round_id: string; claimed_at: string }
    type ProfileRow = { id: string; team_name: string | null; created_at: string | null }
    const [lineups, claims, profiles, auth] = await Promise.all([
      all<LineupRow>((a, b) => admin.from('lineups').select('owner_id, round_id, submitted_at').eq('grade', grade).order('id').range(a, b)),
      all<ClaimRow>((a, b) => admin.from('t3_claims').select('owner_id, round_id, claimed_at').eq('grade', grade).order('id').range(a, b)),
      all<ProfileRow>((a, b) => admin.from('profiles').select('id, team_name, created_at').order('id').range(a, b)),
      emailsAndSignIns(admin),
    ])
    const profileOf = new Map(profiles.map(p => [p.id, p]))

    const wasSet = (l: LineupRow) => {
      if (!l.submitted_at) return false
      const opened = openedMs.get(l.round_id)
      return opened == null ? true : new Date(l.submitted_at).getTime() > opened
    }

    // Packs dealt automatically share a timestamp across several managers
    const batch = new Map<string, number>()
    for (const c of claims) batch.set(`${c.round_id}|${c.claimed_at}`, (batch.get(`${c.round_id}|${c.claimed_at}`) ?? 0) + 1)
    const openedSelf = (c: ClaimRow) => (batch.get(`${c.round_id}|${c.claimed_at}`) ?? 0) < 3

    // Round by round: teams entered, lineups set by hand, packs opened by hand
    const trend = playRounds.map(r => {
      const ls = lineups.filter(l => l.round_id === r.id)
      const cs = claims.filter(c => c.round_id === r.id)
      return {
        round_number: r.round_number,
        status: r.status,
        teams: ls.length,
        set: ls.filter(wasSet).length,
        packs: cs.filter(openedSelf).length,
      }
    })

    // Per manager, from their lineup in the current round
    const packRounds = playRounds.filter(r => r.id !== current.id || claims.some(c => c.round_id === r.id))
    const mine = lineups.filter(l => l.round_id === current.id)
    const managers = mine.map(l => {
      const saved = l.submitted_at ? new Date(l.submitted_at).getTime() : null
      // The round their last save was for: the first one that locked after it, else the current round
      let lastSet: number | null = null
      if (saved != null) {
        const target = rounds.find(r => r.round_number > 0 && (lockMs(r) ?? Infinity) > saved)
        lastSet = target ? target.round_number : current.round_number
      }
      const roundsSince = lastSet == null ? null
        : playRounds.filter(r => r.round_number > lastSet! && r.round_number <= current.round_number).length
      const myClaims = claims.filter(c => c.owner_id === l.owner_id && openedSelf(c))
      const lastPack = myClaims
        .map(c => roundById.get(c.round_id)?.round_number ?? 0)
        .reduce((a, b) => Math.max(a, b), 0)
      const p = profileOf.get(l.owner_id)
      return {
        id: l.owner_id,
        team: p?.team_name ?? '(no team name)',
        email: auth.email.get(l.owner_id) ?? null,
        joined: p?.created_at ?? null,
        last_saved: l.submitted_at,
        last_set_round: lastSet,
        rounds_since: roundsSince,
        packs_opened: myClaims.length,
        last_pack_round: lastPack || null,
        last_sign_in: auth.seen.get(l.owner_id) ?? null,
      }
    }).sort((a, b) => (b.rounds_since ?? 999) - (a.rounds_since ?? 999) || a.team.localeCompare(b.team))

    const count = (f: (m: typeof managers[number]) => boolean) => managers.filter(f).length
    return NextResponse.json({
      round: { round_number: current.round_number, status: current.status },
      pack_rounds: packRounds.length,
      summary: {
        teams: managers.length,
        this_round: count(m => m.rounds_since === 0),
        last_round: count(m => m.rounds_since === 1),
        coasting: count(m => m.rounds_since === 2 || m.rounds_since === 3),
        quiet: count(m => m.rounds_since == null || m.rounds_since >= 4),
      },
      trend,
      managers,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Could not build the activity view: ' + (e as Error).message }, { status: 500 })
  }
}
