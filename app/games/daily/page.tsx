import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import DailyClient, { DailyPlayer } from './DailyClient'

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
  const pool = ((players ?? []) as unknown as Row[])
    .sort((a, b) => a.id.localeCompare(b.id))   // stable order so the seed is reliable

  if (pool.length === 0) {
    return (
      <ArcadeShell neon={NEON} eyebrow="Daily" title="Player of the Day">
        <p style={{ color: '#8FA0B4', fontSize: '13px' }}>No players available yet.</p>
      </ArcadeShell>
    )
  }

  const p = pool[daySeed() % pool.length]
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

  // Every name in the pool, for the guess box — the answer hides among them
  const names = pool.map(r => r.full_name).sort((a, b) => a.localeCompare(b))

  return (
    <ArcadeShell neon={NEON} eyebrow="Daily · One shot" title="Who is it?">
      <DailyClient answer={answer} names={names} />
    </ArcadeShell>
  )
}