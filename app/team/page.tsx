import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import TeamClient, { TeamCard } from './TeamClient'

export default async function Team({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade = params.grade === 'womens' ? 'womens' : 'mens'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('team_name, clubs(name)').eq('id', user!.id).single()

  const { data: cards } = await supabase
    .from('cards')
    .select('id, players(full_name, tier, positions, stats, clubs(name))')
    .eq('owner_id', user!.id).eq('grade', grade)

  const { data: lineup } = await supabase
    .from('lineups').select('id, lineup_slots(slot, card_id, batting_order)')
    .eq('owner_id', user!.id).eq('grade', grade)
    .order('submitted_at', { ascending: false }).limit(1).maybeSingle()

  type Raw = { id: string; players: { full_name: string; tier: string; positions: string[]; stats: Record<string, number>; clubs: { name: string } | null } | null }
  const teamCards: TeamCard[] = ((cards ?? []) as unknown as Raw[]).map(c => ({
    id: c.id,
    name: c.players?.full_name ?? '',
    club: c.players?.clubs?.name ?? '',
    tier: c.players?.tier ?? 'common',
    positions: c.players?.positions ?? [],
    stats: c.players?.stats ?? {},
  }))

  const slots = (lineup?.lineup_slots ?? []) as { slot: string; card_id: string; batting_order: number | null }[]

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="flex-1 px-4 sm:px-6" style={{ paddingTop: "120px", paddingBottom: "100px" }}>
        <TeamClient
          teamName={profile?.team_name ?? 'Your team'}
          clubName={(profile as unknown as { clubs: { name: string } | null })?.clubs?.name ?? ''}
          cards={teamCards}
          initialSlots={slots}
          grade={grade}
        />
      </section>
      <Footer />
    </main>
  )
}