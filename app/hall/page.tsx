import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'

// Placeholder tints until club logos/colours land
const CLUB_TINTS: Record<string, string> = {
  'Bandits': '#5B2D8E', 'Howick': '#8A1E41', 'Marist': '#2456E6',
  'Otahuhu': '#2B5C9E', 'Patriots': '#B49759', 'Pukekohe': '#2D9E4E',
  'Ramblers': '#C41E3A', 'Roosters': '#C8102E', 'United': '#E03A3E',
  'United-Marist': '#2456E6', 'Waitakere': '#FFB81C',
}
const tint = (name: string) => CLUB_TINTS[name] ?? '#E8D5A3'
const slug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

export default async function Hall() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: players } = await supabase
    .from('players').select('id, club_id, clubs(name)').eq('active', true)

  let ownedPlayerIds = new Set<string>()
  if (user) {
    const { data: myCards } = await supabase
      .from('cards').select('player_id').eq('owner_id', user.id)
    ownedPlayerIds = new Set((myCards ?? []).map(c => c.player_id))
  }

  type Row = { id: string; clubs: { name: string } | null }
  const byClub = new Map<string, { total: number; owned: number }>()
  for (const p of ((players ?? []) as unknown as Row[])) {
    const club = p.clubs?.name
    if (!club) continue
    const agg = byClub.get(club) ?? { total: 0, owned: 0 }
    agg.total += 1
    if (ownedPlayerIds.has(p.id)) agg.owned += 1
    byClub.set(club, agg)
  }
  const doors = [...byClub.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '56px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#E8D5A3' }}>Athlete Hall</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Every player. Every club.
            </h1>
            <p className="text-sm text-[#F5F1E8]/45" style={{ maxWidth: '440px', margin: '0 auto' }}>
              Walk the hall. Open a club&apos;s door to see every card — the ones you own in full colour, the rest waiting to be collected.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {doors.map(([club, agg]) => (
              <a key={club} href={`/hall/${slug(club)}`}
                className="group relative rounded-2xl overflow-hidden pinstripe transition-all hover:scale-[1.02]"
                style={{ background: '#181510', border: `1px solid ${tint(club)}40`, minHeight: '190px' }}>
                {/* Door face */}
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${tint(club)}18 0%, transparent 65%)` }} />
                <div className="relative z-10 flex flex-col justify-between h-full" style={{ padding: '24px 24px 20px', minHeight: '190px' }}>
                  <div>
                    {/* Crest placeholder until club logos land */}
                    <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center mb-4"
                      style={{ background: '#0D0B08', border: `1.5px solid ${tint(club)}60` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/clubs/${slug(club)}.jpg`} alt={club} className="w-full h-full object-contain" style={{ padding: '3px' }} />
                    </div>
                    <h2 className="text-xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{club}</h2>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#F5F1E8]/40">
                      {agg.total} players{agg.owned > 0 ? ` · ${agg.owned} owned` : ''}
                    </p>
                    <span className="text-xs font-black transition-transform group-hover:translate-x-1" style={{ color: tint(club) }}>→</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}