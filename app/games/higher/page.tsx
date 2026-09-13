import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import HigherClient, { GamePlayer } from './HigherClient'

const NEON = '#00F0FF'

/* The whole pool is handed to the client at once — the run is endless, so
   round-tripping for every pair would feel sluggish. Every figure here is
   already public on the Leaders board, so nothing is given away.
   Hitting stats only: pitching figures only work between two pitchers.

   Until the first round is scored there are no season figures, so the game
   runs on the 2023–26 career line instead. It switches itself back to season
   stats the moment anyone has season points. */
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
  const rows = (players ?? []) as unknown as Row[]

  const seasonLive = rows.some(r => Number(r.stats?.season_points ?? 0) > 0)
  const n = (v: unknown) => (v == null ? 0 : Number(v))

  const pool: GamePlayer[] = rows.map(p => {
    const s = p.stats ?? {}
    return {
      id: p.id,
      name: p.full_name,
      club: p.clubs?.name ?? '',
      grade: p.grade === 'womens' ? "Women's" : "Men's",
      tier: p.tier,
      photoUrl: p.photo_url,
      stats: seasonLive
        ? {
            season_points: n(s.season_points),
            season_hr: n(s.season_hr),
            season_rbi: n(s.season_rbi),
            season_sb: n(s.season_sb),
            season_ba: n(s.season_ba),
          }
        : {
            season_points: 0,
            season_hr: n(s.career_hr),
            season_rbi: n(s.career_rbi),
            season_sb: n(s.career_sb),
            season_ba: n(s.career_ba),
          },
    }
  })

  // Pre-season: only players with a career line are worth asking about
  const playable = seasonLive
    ? pool
    : pool.filter(p => p.stats.season_hr + p.stats.season_rbi + p.stats.season_sb + p.stats.season_ba > 0)

  return (
    <ArcadeShell neon={NEON} eyebrow="Endless · Keep it alive" title="Higher or Lower" page="game-higher">
      {playable.length < 2
        ? <p style={{ color: '#8FA0B4', fontSize: '13px' }}>
            No scored players yet — this one opens once a round has been played.
          </p>
        : <HigherClient pool={playable} />}
    </ArcadeShell>
  )
}