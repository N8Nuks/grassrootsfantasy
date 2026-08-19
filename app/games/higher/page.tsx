import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import HigherClient, { GamePlayer } from './HigherClient'

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
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />
      <section className="relative flex-1 px-5 sm:px-12 overflow-hidden" style={{ paddingTop: '76px', paddingBottom: '80px' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 45% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10" style={{ maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
          <a href="/games" className="inline-block text-[11px] font-bold uppercase tracking-widest"
            style={{ color: '#ffffff60', marginBottom: '18px' }}>← Games</a>
          {pool.length < 2
            ? <p className="text-sm text-center text-white/60" style={{ paddingTop: '40px' }}>
                No scored players yet — this one opens once a round has been played.
              </p>
            : <HigherClient pool={pool} />}
        </div>
      </section>
      <Footer />
    </main>
  )
}