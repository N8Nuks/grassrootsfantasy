import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import TeamClient, { TeamCard } from './TeamClient'

export default async function Team({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'
  const T = theme(grade)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('team_name, clubs(name)').eq('id', user!.id).single()

  const { data: cards } = await supabase
    .from('cards')
    .select('id, players(id, full_name, tier, positions, stats, clubs(name))')
    .eq('owner_id', user!.id).eq('grade', grade)

  const { data: lineup } = await supabase
    .from('lineups').select('id, lineup_slots(slot, card_id, batting_order)')
    .eq('owner_id', user!.id).eq('grade', grade)
    .order('submitted_at', { ascending: false }).limit(1).maybeSingle()

  // Latest round for this grade + its availability flags
  const { data: latestRound } = await supabase
    .from('rounds').select('id, round_number')
    .eq('grade', grade).order('round_number', { ascending: false }).limit(1).maybeSingle()

  let unavailableIds: string[] = []
  let t3Claimed = false
  if (latestRound) {
    const { data: claim } = await supabase
      .from('t3_claims').select('id')
      .eq('owner_id', user!.id).eq('grade', grade).eq('round_id', latestRound.id).maybeSingle()
    t3Claimed = !!claim
    const { data: avail } = await supabase
      .from('player_availability').select('player_id')
      .eq('round_id', latestRound.id).eq('unavailable', true)
    unavailableIds = (avail ?? []).map(a => a.player_id)
  }

  type Raw = { id: string; players: { id: string; full_name: string; tier: string; positions: string[]; stats: Record<string, number>; clubs: { name: string } | null } | null }
  const teamCards: TeamCard[] = ((cards ?? []) as unknown as Raw[]).map(c => ({
    id: c.id,
    playerId: c.players?.id ?? '',
    name: c.players?.full_name ?? '',
    club: c.players?.clubs?.name ?? '',
    tier: c.players?.tier ?? 'common',
    positions: c.players?.positions ?? [],
    stats: c.players?.stats ?? {},
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
          unavailableIds={unavailableIds}
          t3Claimed={t3Claimed}
          roundNumber={latestRound?.round_number ?? null}
        />
      </section>
      <Footer />
    </main>
  )
}