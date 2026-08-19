import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import MemoryClient, { MemoryPlayer } from './MemoryClient'

const NEON = '#FF6B9D'

export default async function Memory() {
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

  // The best-known names make the better game — you should half-recognise
  // every card on the board.
  const pool: MemoryPlayer[] = ((players ?? []) as unknown as Row[])
    .map(p => ({
      id: p.id,
      name: p.full_name,
      club: p.clubs?.name ?? '',
      tier: p.tier,
      photoUrl: p.photo_url,
      points: Number(p.stats?.season_points ?? 0),
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 40)

  return (
    <ArcadeShell neon={NEON} eyebrow="Memory · Find the pairs" title="Card Sharp">
      {pool.length < 8
        ? <p style={{ color: '#8FA0B4', fontSize: '13px' }}>Not enough cards yet — this one opens as the season fills out.</p>
        : <MemoryClient pool={pool} />}
    </ArcadeShell>
  )
}