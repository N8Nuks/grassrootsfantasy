import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import HigherClient, { GamePlayer } from './HigherClient'

const NEON = '#00F0FF'

/* The whole pool is handed to the client at once — the run is endless, so
   round-tripping for every pair would feel sluggish. Every figure here is
   already public on the Leaders board, so nothing is given away.
   Hitting stats only: pitching figures only work between two pitchers. */
export default async function Higher() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, grade, tier, stats, photo_url, clubs(name)')
    .eq('active', true)
    .or('is_under18.eq.false,has_consent.eq.true')

  type Row = {
    id: string; full_name: string; grade: string; tier: string
    stats: Record<string, number> | null
    photo_url: string | null
    clubs: { name: string } | null
  }

  const pool: GamePlayer[] = ((players ?? []) as unknown as Row[]).map(p => ({
    id: p.id,
    name: p.full_name,
    club: p.clubs?.name ?? '',
    grade: p.grade === 'womens' ? "Women's" : "Men's",
    tier: p.tier,
    photoUrl: p.photo_url,
    stats: {
      season_points: Number(p.stats?.season_points ?? 0),
      season_hr: Number(p.stats?.season_hr ?? 0),
      season_rbi: Number(p.stats?.season_rbi ?? 0),
      season_sb: Number(p.stats?.season_sb ?? 0),
      season_ba: p.stats?.season_ba != null ? Number(p.stats.season_ba) : 0,
    },
  }))

  return (
    <ArcadeShell neon={NEON} eyebrow="Endless · Keep it alive" title="Higher or Lower" page="game-higher">
      {pool.length < 2
        ? <p style={{ color: '#8FA0B4', fontSize: '13px' }}>
            No scored players yet — this one opens once a round has been played.
          </p>
        : <HigherClient pool={pool} />}
    </ArcadeShell>
  )
}