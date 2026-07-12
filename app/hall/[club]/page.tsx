import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import HallClient, { HallPlayer } from './HallClient'

const deslug = (s: string) => s.replace(/-/g, ' ').toLowerCase()

export default async function ClubHall({ params, searchParams }: {
  params: Promise<{ club: string }>
  searchParams: Promise<{ grade?: string }>
}) {
  const { club: clubSlug } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clubs } = await supabase.from('clubs').select('id, name')
  const club = (clubs ?? []).find(c =>
    c.name.toLowerCase().replace(/\s+/g, '-') === clubSlug.toLowerCase()
    || c.name.toLowerCase() === deslug(clubSlug))

  if (!club) {
    return (
      <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
        <Nav />
        <section className="flex-1 px-6 flex items-center justify-center">
          <p className="text-sm text-[#F5F1E8]/40">Club not found. <a href="/hall" className="underline">Back to the Hall</a></p>
        </section>
        <Footer />
      </main>
    )
  }

  // United and Marist doors also include the combined United-Marist Women's roster
  const clubIds = [club.id]
  if (club.name === 'United' || club.name === 'Marist') {
    const um = (clubs ?? []).find(c => c.name === 'United-Marist')
    if (um) clubIds.push(um.id)
  }

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, grade, tier, positions, badges, speed_star, career_games, stats')
    .in('club_id', clubIds).eq('active', true)

  type Raw = {
    id: string; full_name: string; grade: string; tier: string
    positions: string[]; badges: string[] | null; speed_star: boolean
    career_games: number | null; stats: Record<string, number> | null
  }
  const all = ((players ?? []) as unknown as Raw[])
  const grades = [...new Set(all.map(p => p.grade))].sort() as ('mens' | 'womens')[]
  const grade = (sp.grade === 'womens' || sp.grade === 'mens') && grades.includes(sp.grade as 'mens' | 'womens')
    ? (sp.grade as 'mens' | 'womens')
    : grades[0] ?? 'mens'

  let ownedPlayerIds: string[] = []
  if (user) {
    const { data: myCards } = await supabase
      .from('cards').select('player_id').eq('owner_id', user.id)
    ownedPlayerIds = (myCards ?? []).map(c => c.player_id)
  }

  const roster: HallPlayer[] = all
    .filter(p => p.grade === grade)
    .map(p => ({
      id: p.id, name: p.full_name, tier: p.tier,
      positions: p.positions ?? [], badges: p.badges ?? [],
      speedStar: p.speed_star, careerGames: p.career_games,
      stats: p.stats ?? {},
    }))

  return (
    <HallClient
      clubName={club.name}
      clubSlug={clubSlug}
      grade={grade}
      grades={grades}
      roster={roster}
      ownedPlayerIds={ownedPlayerIds}
    />
  )
}