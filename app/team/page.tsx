import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import TeamClient, { TeamCard } from './TeamClient'

export default async function Team({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('team_name, site_theme, clubs(name)').eq('id', user!.id).single()

  const siteTheme = (profile as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  const T = theme(grade, siteTheme)

  const { data: cards } = await supabase
    .from('cards')
    .select('id, players(id, full_name, tier, positions, stats, photo_url, clubs(name))')
    .eq('owner_id', user!.id).eq('grade', grade)

  const { data: lineup } = await supabase
    .from('lineups').select('id, lineup_slots(slot, card_id, batting_order)')
    .eq('owner_id', user!.id).eq('grade', grade)
    .order('submitted_at', { ascending: false }).limit(1).maybeSingle()

  // Latest round for this grade + its availability flags
  const { data: latestRound } = await supabase
    .from('rounds').select('id, round_number, status')
    .eq('grade', grade).order('round_number', { ascending: false }).limit(1).maybeSingle()

  let unavailableIds: string[] = []
  let t3Claimed = false
  let thisRoundPoints: Record<string, number> = {}
  let lastRoundPoints: Record<string, number> = {}
  let thisRoundLabel: string | null = null
  let lastRoundLabel: string | null = null

  // Pre-Season Pack: released for this grade AND not yet opened by this user?
  const { data: t2Config } = await supabase
    .from('scoring_config').select('t2_released').eq('grade', grade).single()
  let t2Available = false
  if (t2Config?.t2_released) {
    const { count: t2Count } = await supabase
      .from('cards').select('id', { count: 'exact', head: true })
      .eq('owner_id', user!.id).eq('grade', grade).eq('source', 't2')
    t2Available = !t2Count
  }
  if (latestRound) {
    const { data: claim } = await supabase
      .from('t3_claims').select('id')
      .eq('owner_id', user!.id).eq('grade', grade).eq('round_id', latestRound.id).maybeSingle()
    t3Claimed = !!claim
    const { data: avail } = await supabase
      .from('player_availability').select('player_id')
      .eq('round_id', latestRound.id).eq('unavailable', true)
    unavailableIds = (avail ?? []).map(a => a.player_id)

    // Two most recent rounds with visible scores (includes the latest if scored)
    const { data: recentRounds } = await supabase
      .from('rounds').select('id, round_number')
      .eq('grade', grade).lte('round_number', latestRound.round_number)
      .order('round_number', { ascending: false }).limit(6)
    const scoredRounds: { round_number: number; points: Record<string, number> }[] = []
    for (const rr of recentRounds ?? []) {
      if (scoredRounds.length >= 2) break
      const { data: scores } = await supabase
        .from('player_scores').select('player_id, points')
        .eq('round_id', rr.id)
      if (scores?.length) {
        const pts: Record<string, number> = {}
        for (const s of scores) pts[s.player_id] = Number(s.points)
        scoredRounds.push({ round_number: rr.round_number, points: pts })
      }
    }
    if (scoredRounds[0]) {
      thisRoundPoints = scoredRounds[0].points
      thisRoundLabel = `Rd ${scoredRounds[0].round_number}`
    }
    if (scoredRounds[1]) {
      lastRoundPoints = scoredRounds[1].points
      lastRoundLabel = `Rd ${scoredRounds[1].round_number}`
    }
  }

  type Raw = { id: string; players: { id: string; full_name: string; tier: string; positions: string[]; stats: Record<string, number>; photo_url: string | null; clubs: { name: string } | null } | null }
  const teamCards: TeamCard[] = ((cards ?? []) as unknown as Raw[]).map(c => ({
    id: c.id,
    playerId: c.players?.id ?? '',
    name: c.players?.full_name ?? '',
    club: c.players?.clubs?.name ?? '',
    tier: c.players?.tier ?? 'common',
    positions: c.players?.positions ?? [],
    stats: c.players?.stats ?? {},
    photoUrl: c.players?.photo_url ?? null,
  }))

  const slots = (lineup?.lineup_slots ?? []) as { slot: string; card_id: string; batting_order: number | null }[]

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-4 sm:px-6" style={{ paddingTop: "70px", paddingBottom: "100px" }}>
        <TeamClient
          teamName={profile?.team_name ?? 'Your team'}
          clubName={(profile as unknown as { clubs: { name: string } | null })?.clubs?.name ?? ''}
          cards={teamCards}
          initialSlots={slots}
          grade={grade}
          siteTheme={siteTheme}
          unavailableIds={unavailableIds}
          t3Claimed={t3Claimed}
          t2Available={t2Available}
          roundNumber={latestRound?.round_number ?? null}
          roundOpen={latestRound?.status === 'open'}
          thisRoundPoints={thisRoundPoints}
          lastRoundPoints={lastRoundPoints}
          thisRoundLabel={thisRoundLabel}
          lastRoundLabel={lastRoundLabel}
        />
      </section>
      <Footer />
    </main>
  )
}