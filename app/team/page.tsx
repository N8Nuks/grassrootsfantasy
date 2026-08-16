import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import TeamClient, { TeamCard } from './TeamClient'
import SandboxBanner from '@/components/SandboxBanner'
import { doubledInRound } from '@/lib/achievements'

export default async function Team({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Batch 1 — independent queries fired together
  const [
    { data: profile },
    { data: styleRow },
    { data: cards },
    { data: lineup },
    { data: latestRound },
    { data: t2Config },
    { count: t2Count },
  ] = await Promise.all([
    supabase.from('profiles').select('team_name, site_theme, clubs(name)').eq('id', user!.id).single(),
    supabase.from('site_settings').select('value').eq('key', 'card_style').maybeSingle(),
    supabase.from('cards')
      .select('id, players(id, full_name, tier, positions, stats, photo_url, playing_number, clubs(name))')
      .eq('owner_id', user!.id).eq('grade', grade),
    supabase.from('lineups')
      .select('id, captain_card_id, vice_captain_card_id, lineup_slots(slot, card_id, batting_order)')
      .eq('owner_id', user!.id).eq('grade', grade)
      .order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('rounds').select('id, round_number, status')
      .eq('grade', grade).order('round_number', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('scoring_config').select('t2_released').eq('grade', grade).single(),
    supabase.from('cards').select('id', { count: 'exact', head: true })
      .eq('owner_id', user!.id).eq('grade', grade).eq('source', 't2'),
  ])

  const siteTheme = (profile as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  const cardStyle = (styleRow?.value ?? 'premium') as 'standard' | 'premium'
  const T = theme(grade, siteTheme)

  // A user who already holds a full squad has opened their T2, whatever a stale
  // count says. Registration deals T1 and T2 together, so the first load after
  // signup can otherwise show a button for a pack they've already revealed.
  const t2Available = !!t2Config?.t2_released && !t2Count && (cards?.length ?? 0) < 21

  let unavailableIds: string[] = []
  let t3Claimed = false
  let thisRoundPoints: Record<string, number> = {}
  let lastRoundPoints: Record<string, number> = {}
  let thisRoundLabel: string | null = null
  let lastRoundLabel: string | null = null

  if (latestRound) {
    // Batch 2 — everything that depends on the latest round, fired together
    const [
      { data: claim },
      { data: avail },
      { data: recentRounds },
    ] = await Promise.all([
      supabase.from('t3_claims').select('id')
        .eq('owner_id', user!.id).eq('grade', grade).eq('round_id', latestRound.id).maybeSingle(),
      supabase.from('player_availability').select('player_id')
        .eq('round_id', latestRound.id).eq('unavailable', true),
      supabase.from('rounds').select('id, round_number')
        .eq('grade', grade).lte('round_number', latestRound.round_number)
        .order('round_number', { ascending: false }).limit(6),
    ])
    t3Claimed = !!claim
    unavailableIds = (avail ?? []).map(a => a.player_id)

    // Batch 3 — scores for all recent rounds fetched simultaneously, first two with data used
    const roundList = recentRounds ?? []
    const scoreResults = await Promise.all(
      roundList.map(rr =>
        supabase.from('player_scores').select('player_id, points').eq('round_id', rr.id)
      )
    )
    const scoredRounds: { round_number: number; points: Record<string, number> }[] = []
    roundList.forEach((rr, i) => {
      if (scoredRounds.length >= 2) return
      const scores = scoreResults[i].data
      if (scores?.length) {
        const pts: Record<string, number> = {}
        for (const s of scores) pts[s.player_id] = Number(s.points)
        scoredRounds.push({ round_number: rr.round_number, points: pts })
      }
    })
    if (scoredRounds[0]) {
      thisRoundPoints = scoredRounds[0].points
      thisRoundLabel = `Rd ${scoredRounds[0].round_number}`
    }
    if (scoredRounds[1]) {
      lastRoundPoints = scoredRounds[1].points
      lastRoundLabel = `Rd ${scoredRounds[1].round_number}`
    }
  }

  type Raw = { id: string; players: { id: string; full_name: string; tier: string; positions: string[]; stats: Record<string, number>; photo_url: string | null; playing_number: number | null; clubs: { name: string } | null } | null }
  const teamCards: TeamCard[] = ((cards ?? []) as unknown as Raw[]).map(c => ({
    id: c.id,
    playerId: c.players?.id ?? '',
    name: c.players?.full_name ?? '',
    club: c.players?.clubs?.name ?? '',
    tier: c.players?.tier ?? 'common',
    positions: c.players?.positions ?? [],
    stats: c.players?.stats ?? {},
    photoUrl: c.players?.photo_url ?? null,
    playingNumber: c.players?.playing_number ?? null,
  }))

  const slots = (lineup?.lineup_slots ?? []) as { slot: string; card_id: string; batting_order: number | null }[]
  const { data: noticeRows } = await supabase.from('armband_notices')
    .select('id, round_number, bonus_player_name, moved_to_name')
    .eq('owner_id', user!.id).eq('grade', grade).eq('seen', false)
    .order('created_at', { ascending: false })
  const notices = (noticeRows ?? []) as { id: string; round_number: number; bonus_player_name: string; moved_to_name: string | null }[]
  notices={notices}
  const armbands = lineup as unknown as { captain_card_id: string | null; vice_captain_card_id: string | null } | null

  // Players scoring double this round — cycle or perfect game earned last round
  const doubledMap = await doubledInRound(supabase, grade, latestRound?.round_number ?? null)
  const doubledIds = [...doubledMap.keys()]

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav /><SandboxBanner />
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
          cardStyle={cardStyle}
          lastRoundLabel={lastRoundLabel}
          doubledIds={doubledIds}
          initialCaptainId={armbands?.captain_card_id ?? null}
          initialViceCaptainId={armbands?.vice_captain_card_id ?? null}
        />
      </section>
      <Footer />
    </main>
  )
}