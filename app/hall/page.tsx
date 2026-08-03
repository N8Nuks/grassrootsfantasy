import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'

const CLUB_TINTS: Record<string, string> = {
  'Bandits': '#5B2D8E', 'Howick': '#8A1E41', 'Marist': '#2456E6',
  'Otahuhu': '#2B5C9E', 'Patriots': '#B49759', 'Pukekohe': '#2D9E4E',
  'Ramblers': '#C41E3A', 'Roosters': '#C8102E', 'United': '#E03A3E',
  'United-Marist': '#2456E6', 'Waitakere': '#FFB81C',
}
const tint = (name: string) => CLUB_TINTS[name] ?? '#E8D5A3'
const slug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

// Crest with a collection-progress ring drawn around it
function CrestRing({ club, owned, total }: { club: string; owned: number; total: number }) {
  const c = tint(club)
  const R = 46            // ring radius
  const CIRC = 2 * Math.PI * R
  const frac = total > 0 ? owned / total : 0
  return (
    <div className="relative" style={{ width: '112px', height: '112px' }}>
      <svg viewBox="0 0 112 112" className="absolute inset-0">
        {/* Track */}
        <circle cx="56" cy="56" r={R} fill="none" stroke="#ffffff12" strokeWidth="4" />
        {/* Progress arc — starts at 12 o'clock */}
        {frac > 0 && (
          <circle cx="56" cy="56" r={R} fill="none"
            stroke={c} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${CIRC * frac} ${CIRC}`}
            transform="rotate(-90 56 56)"
            style={{ filter: `drop-shadow(0 0 6px ${c}90)` }} />
        )}
      </svg>
      <div className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{ inset: '14px', background: '#0D0B08', border: `1.5px solid ${c}50` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/clubs/${slug(club)}.jpg`} alt={club} className="w-full h-full object-cover" />
      </div>
    </div>
  )
}

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
  const totals = doors.reduce((a, [, agg]) => ({ total: a.total + agg.total, owned: a.owned + agg.owned }), { total: 0, owned: 0 })

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      {/* Corridor light wash */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 40% at 50% 0%, #E8D5A30C 0%, transparent 60%)',
      }} />
      <Nav />
      <section className="relative flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '1080px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '56px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#E8D5A3' }}>Athlete Hall</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Every player. Every club.
            </h1>
            <p className="text-sm text-[#F5F1E8]/45" style={{ maxWidth: '440px', margin: '0 auto' }}>
              Walk the hall. Open a club&apos;s door to see every card — the ones you own in full colour, the rest waiting to be collected.
            </p>
            {user && totals.total > 0 && (
              <p className="text-xs font-black uppercase tracking-widest mt-5" style={{ color: '#E8C15A' }}>
                Collection: {totals.owned} / {totals.total} cards
              </p>
            )}
          </div>

          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {doors.map(([club, agg]) => {
              const c = tint(club)
              const complete = agg.owned === agg.total && agg.total > 0
              return (
                <a key={club} href={`/hall/${slug(club)}`}
                  className="group relative rounded-t-[52px] rounded-b-2xl overflow-hidden pinstripe-fine transition-all hover:scale-[1.03] hover:-translate-y-1 text-center"
                  style={{
                    background: `linear-gradient(180deg, ${c}22 0%, ${c}08 45%, #16120D 100%)`,
                    border: `1px solid ${c}45`,
                    borderTop: `2px solid ${c}70`,
                    boxShadow: `0 0 24px ${c}12, inset 0 1px 0 ${c}30`,
                    minHeight: '250px',
                  }}>
                  <div className="relative z-10 flex flex-col items-center justify-between h-full" style={{ padding: '26px 16px 18px', minHeight: '250px' }}>
                    <CrestRing club={club} owned={agg.owned} total={agg.total} />
                    <div>
                      <h2 className="text-lg font-black text-[#F5F1E8] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>{club}</h2>
                      {complete ? (
                        <p className="text-[10px] font-black uppercase tracking-widest mt-1.5" style={{ color: '#FFD700', textShadow: '0 0 8px #FFD70060' }}>
                          Full set ★
                        </p>
                      ) : (
                        <p className="text-[11px] mt-1.5 text-[#F5F1E8]/40">
                          {agg.owned > 0 ? `${agg.owned} / ${agg.total} collected` : `${agg.total} players`}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest transition-all group-hover:tracking-[0.3em]"
                      style={{ color: c }}>
                      Enter →
                    </span>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}