import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import BattingClient, { Batter, Pitcher } from './BattingClient'

const NEON = '#B47CFF'

export default async function Batting() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, grade, tier, positions, stats, photo_url, clubs(name)')
    .eq('active', true)
    .or('is_under18.eq.false,has_consent.eq.true')

  type Row = {
    id: string; full_name: string; grade: string; tier: string; positions: string[]
    stats: Record<string, number> | null
    photo_url: string | null
    clubs: { name: string } | null
  }
  const rows = (players ?? []) as unknown as Row[]

  // Batters: anyone who has been to the plate. Their real average sets how
  // forgiving the timing window is, so picking well actually matters.
  const batters: Batter[] = rows
    .filter(p => (p.stats?.season_ba ?? 0) > 0)
    .map(p => ({
      id: p.id,
      name: p.full_name,
      club: p.clubs?.name ?? '',
      grade: p.grade === 'womens' ? "W" : "M",
      tier: p.tier,
      photoUrl: p.photo_url,
      ba: Number(p.stats?.season_ba ?? 0),
      hr: Number(p.stats?.season_hr ?? 0),
      points: Number(p.stats?.season_points ?? 0),
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 24)

  // The eight most prolific strikeout pitchers in the league, both grades.
  // More K's means faster and more movement.
  const pitchers: Pitcher[] = rows
    .filter(p => (p.stats?.season_k_pit ?? 0) > 0)
    .map(p => ({
      id: p.id,
      name: p.full_name,
      club: p.clubs?.name ?? '',
      grade: p.grade === 'womens' ? "W" : "M",
      photoUrl: p.photo_url,
      k: Number(p.stats?.season_k_pit ?? 0),
      wins: Number(p.stats?.season_wins ?? 0),
    }))
    .sort((a, b) => b.k - a.k)
    .slice(0, 8)

  if (batters.length === 0 || pitchers.length === 0) {
    return (
      <ArcadeShell neon={NEON} eyebrow="Arcade · Ten pitches" title="Batting Practice">
        <p style={{ color: '#8FA0B4', fontSize: '13px' }}>
          This one opens once a round has been scored — it needs real batters and real arms.
        </p>
      </ArcadeShell>
    )
  }

  return (
    <ArcadeShell neon={NEON} eyebrow="Arcade · Ten pitches" title="Batting Practice">
      <BattingClient batters={batters} pitchers={pitchers} />
    </ArcadeShell>
  )
}