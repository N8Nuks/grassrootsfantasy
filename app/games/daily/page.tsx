import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import DailyClient, { DailyPlayer, PoolPlayer } from './DailyClient'

const NEON = '#FF2D95'

/* One player a day, the same for everyone, derived from the date in Auckland.
   Nothing is stored — the date is the seed, so tomorrow's player is already
   decided and yesterday's can't be looked up. */
function daySeed(): number {
  const nz = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
  let h = 0
  for (let i = 0; i < nz.length; i++) h = (h * 31 + nz.charCodeAt(i)) >>> 0
  return h
}

export default async function Daily() {
  const supabase = await createClient()

  // Whole active pool for now — career games are placeholders until the real
  // season data lands, at which point add .gte('career_games', 40) back so
  // obscure one-gamers don't make the puzzle unfair.
  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, grade, positions, career_games, stats, clubs(name)')
    .eq('active', true)
    .or('is_under18.eq.false,has_consent.eq.true')

  type Row = {
    id: string; full_name: string; grade: string; positions: string[]
    career_games: number | null; stats: Record<string, number> | null
    clubs: { name: string } | null
  }
  const all = ((players ?? []) as unknown as Row[])
    .sort((a, b) => a.id.localeCompare(b.id))   // stable order so the seed is reliable

  if (all.length === 0) {
    return (
      <ArcadeShell neon={NEON} eyebrow="Daily" title="Player of the Day">
        <p style={{ color: '#8FA0B4', fontSize: '13px' }}>No players available yet.</p>
      </ArcadeShell>
    )
  }

  const p = all[daySeed() % all.length]
  const games = p.career_games ?? 0
  const gamesBand = games >= 300 ? '300+' : games >= 200 ? '200–299' : games >= 100 ? '100–199' : 'Under 100'

  const answer: DailyPlayer = {
    name: p.full_name,
    grade: p.grade === 'womens' ? "Women's" : "Men's",
    club: p.clubs?.name ?? 'Unknown',
    positions: p.positions ?? [],
    gamesBand,
    seasonPoints: Number(p.stats?.season_points ?? 0),
    careerBa: p.stats?.career_ba != null ? Number(p.stats.career_ba).toFixed(3) : null,
  }

  /* The guess list carries each player's position and club so it can narrow as
     those clues unlock — the grade is applied here, since it's free from the
     first look and halves the scrolling. */
  const pool: PoolPlayer[] = all
    .filter(r => r.grade === p.grade)
    .map(r => ({
      name: r.full_name,
      positions: r.positions ?? [],
      club: r.clubs?.name ?? 'Unknown',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <ArcadeShell neon={NEON} eyebrow="Daily · One shot" title="Who is it?" page="game-daily">
      <DailyClient answer={answer} pool={pool} />
    </ArcadeShell>
  )
}