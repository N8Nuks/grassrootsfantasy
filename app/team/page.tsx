import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import TeamClient, { TeamCard } from './TeamClient'

import { doubledInRound } from '@/lib/achievements'

export default async function Team({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Batch 1 — independent queries fired together
  const [
    { data: profile },
    { data: clubRows },
    { data: styleRow },
    { data: cards },
    { data: lineup },
    { data: latestRound },
    { data: t2Config },
    { count: t2Count },
  ] = await Promise.all([
    // Two foreign keys to clubs now (own club, avatar club) — the hints keep the joins unambiguous
    supabase.from('profiles')
      .select('team_name, site_theme, club_id, avatar_club_id, avatar_image, avatar_frame, club:clubs!club_id(name), avatar_club:clubs!avatar_club_id(name)')
      .eq('id', user!.id).single(),
    supabase.from('clubs').select('id, name').order('name'),
    supabase.from('site_settings').select('value').eq('key', 'card_style').maybeSingle(),
    supabase.from('cards')
      .select('id, source, players(id, full_name, tier, positions, stats, photo_url, playing_number, badges, speed_star, reveal_pos, clubs(name))')
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

  const prof = profile as unknown as {
    team_name: string; site_theme?: string; club_id: string | null
    avatar_club_id: string | null; avatar_frame: string | null; avatar_image: string | null
    club: { name: string } | null; avatar_club: { name: string } | null
  } | null
  const siteTheme = prof?.site_theme ?? 'grade'
  const cardStyle = (styleRow?.value ?? 'premium') as 'standard' | 'premium'
  const T = theme(grade, siteTheme)

  // A user who already holds a full squad has opened their T2, whatever a stale
  // count says. Registration deals T1 and T2 together, so the first load after
  // signup can otherwise show a button for a pack they've already revealed.
  // No starter pack in this grade means no team here, so no Pre-Season Pack either
  const hasStarter = (cards ?? []).some(c => (c as { source?: string }).source === 't1')
  const t2Available = !!t2Config?.t2_released && !t2Count && (cards?.length ?? 0) < 21 && hasStarter

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

  type Raw = { id: string; players: { id: string; full_name: string; tier: string; positions: string[]; stats: Record<string, number>; photo_url: string | null; playing_number: number | null; badges: string[] | null; speed_star: boolean | null; reveal_pos: string | null; clubs: { name: string } | null } | null }
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
    badges: c.players?.badges ?? [],
    speedStar: c.players?.speed_star ?? false,
    revealPos: c.players?.reveal_pos ?? null,
  }))

  const slots = (lineup?.lineup_slots ?? []) as { slot: string; card_id: string; batting_order: number | null }[]
  const { data: noticeRows } = await supabase.from('armband_notices')
    .select('id, round_number, bonus_player_name, moved_to_name')
    .eq('owner_id', user!.id).eq('grade', grade).eq('seen', false)
    .order('created_at', { ascending: false })
  const notices = (noticeRows ?? []) as { id: string; round_number: number; bonus_player_name: string; moved_to_name: string | null }[]
  const armbands = lineup as unknown as { captain_card_id: string | null; vice_captain_card_id: string | null } | null
  // from the raw stat line — drives the Earned column on the Lineup Card
  let earned: Record<string, { earned: number; reason: string | null }> = {}
  let earnedLabel: string | null = null
  if (latestRound) {
    const { data: scoredRound } = await supabase.from('rounds')
      .select('id, round_number').eq('grade', grade)
      .lte('round_number', latestRound.round_number)
      .in('status', ['provisional', 'confirmed'])
      .order('round_number', { ascending: false }).limit(1).maybeSingle()
    if (scoredRound) {
      const { data: earnRows } = await supabase.from('lineup_earnings')
        .select('player_id, earned, reason')
        .eq('owner_id', user!.id).eq('round_id', scoredRound.id)
      for (const r of earnRows ?? []) {
        earned[r.player_id] = { earned: Number(r.earned), reason: r.reason }
      }
      if ((earnRows ?? []).length > 0) earnedLabel = `Rd ${scoredRound.round_number}`
    }
  }

  // Players scoring double this round — cycle or perfect game earned last round
  const doubledMap = await doubledInRound(supabase, grade, latestRound?.round_number ?? null)
  const doubledIds = [...doubledMap.keys()]

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-4 sm:px-6" style={{ paddingTop: "70px", paddingBottom: "100px" }}>
        <TeamClient
          teamName={prof?.team_name ?? 'Your team'}
          clubName={prof?.club?.name ?? ''}
          avatar={{
            clubId: prof?.avatar_club_id ?? prof?.club_id ?? null,
            clubName: prof?.avatar_club?.name ?? prof?.club?.name ?? '',
            frame: prof?.avatar_frame ?? 'gold',
            image: prof?.avatar_image ?? null,
            ownClubId: prof?.club_id ?? null,
          }}
          clubs={(clubRows ?? []) as { id: string; name: string }[]}
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
          notices={notices}
          earned={earned}
          earnedLabel={earnedLabel}
        />
      </section>
      <Footer />
    </main>
  )
}