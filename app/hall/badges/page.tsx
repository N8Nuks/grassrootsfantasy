import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { splitName } from '@/lib/names'

const GOLD = '#E8C15A'
const SILVER = '#4DA6FF'

/* Every mark a card can carry, what earns it, and who holds it. This doubles as
   the legend — someone who sees a badge on a card can find out what it is. */

type Badge = {
  key: string
  label: string
  crit: string
  accent: string
  img: string
  /* Rare enough that naming the holders is the point of the entry. */
  nameHolders?: boolean
  pending?: string
}

const GROUPS: { title: string; note: string; badges: Badge[] }[] = [
  {
    title: 'Longevity',
    note: 'Premier games across NRC, AFC and NFS. A card carries the highest tier reached and nothing below it.',
    badges: [
      { key: 'icon', label: 'Icon', crit: '300 or more Premier games', accent: '#FFD700', img: '/badges/07-icon.png', nameHolders: true },
      { key: 'club_legend', label: 'Club Legend', crit: '200–299 Premier games', accent: '#E8C15A', img: '/badges/06-club-legend.png', nameHolders: true },
      { key: 'veteran', label: 'Veteran', crit: '100–199 Premier games', accent: '#9B59D0', img: '/badges/05-veteran.png' },
      { key: 'established', label: 'Established', crit: '50–99 Premier games', accent: '#4DA6FF', img: '/badges/04-established.png' },
      { key: 'prospect', label: 'Prospect', crit: '25–49 Premier games', accent: '#3FBF63', img: '/badges/03-prospect.png' },
      { key: 'rookie', label: 'Rookie', crit: '1–24 Premier games', accent: '#C97F3D', img: '/badges/02-rookie.png' },
      { key: 'newcomer', label: 'Newcomer', crit: 'First season, no Premier games yet', accent: '#C9CDD4', img: '/badges/01-newcomer.png' },
    ],
  },
  {
    title: 'Representative',
    note: 'From the association\u2019s ratified lists. A card carries the highest honour only.',
    badges: [
      { key: 'nz_senior', label: 'Black Sox / White Sox', crit: 'Selected for New Zealand at senior level', accent: '#E8E4DC', img: '/badges/11-black-sox.png', nameHolders: true },
      { key: 'nz_junior', label: 'NZ Junior', crit: 'Selected for New Zealand at junior level', accent: '#C9CDD4', img: '/badges/09-nz-junior.png', nameHolders: true },
      { key: 'akl_senior', label: 'Auckland Senior', crit: 'Selected for Auckland at senior level', accent: '#2456E6', img: '/badges/10-auckland-senior.png' },
      { key: 'akl_junior', label: 'Auckland Junior', crit: 'Selected for Auckland at junior level', accent: '#4DA6FF', img: '/badges/08-auckland-junior.png' },
    ],
  },
  {
    title: 'Honour and special',
    note: 'Earned in the competition, or given.',
    badges: [
      { key: 'mvp', label: 'MVP', crit: 'Named Premier MVP in any season', accent: '#E8C15A', img: '/badges/12-mvp.png', nameHolders: true },
      { key: 'superstar', label: 'Superstar', crit: 'Awarded by Grassroots Fantasy. Rare, and never by accident.', accent: '#FFD700', img: '/badges/13-superstar.png', nameHolders: true },
      { key: 'speed', label: 'Speed', crit: 'Top ten percent career stolen base rate among active players', accent: '#C9CDD4', img: '/badges/14-speed.png', pending: 'Arrives with the full career stats' },
    ],
  },
]

export default async function Badges() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('players')
    .select('full_name, badges, career_games')
    .eq('active', true)

  type Row = { full_name: string; badges: string[] | null; career_games: number | null }
  const rows = (data ?? []) as Row[]

  const holders = new Map<string, Row[]>()
  for (const p of rows) {
    for (const b of p.badges ?? []) {
      const k = b.toLowerCase()
      if (!holders.has(k)) holders.set(k, [])
      holders.get(k)!.push(p)
    }
  }

  const nameList = (key: string) => {
    const list = (holders.get(key) ?? [])
      .sort((a, b) => (b.career_games ?? 0) - (a.career_games ?? 0))
    const shown = list.slice(0, 8).map(p => {
      const s = splitName(p.full_name)
      return `${s.first} ${s.last}`
    })
    if (list.length > 8) shown.push(`and ${list.length - 8} more`)
    return shown.join(' · ')
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      <section className="px-5 sm:px-12" style={{ paddingTop: '84px', paddingBottom: '30px' }}>
        <div className="text-center" style={{ maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
          <a href="/hall" className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#F5F1E860' }}>← Hall</a>
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: GOLD, margin: '20px 0 12px' }}>The Athlete Hall</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: 'var(--font-heading)', marginBottom: '16px' }}>
            Badges
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#F5F1E870' }}>
            Every mark a card can carry, what it takes to earn one, and who holds it.
            A card shows its longevity badge on the front — the rest are on the career side.
          </p>
        </div>
      </section>

      <section className="px-5 sm:px-12" style={{ paddingBottom: '72px' }}>
        <div style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
          {GROUPS.map(g => (
            <div key={g.title} style={{ marginBottom: '40px' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: SILVER, marginBottom: '8px' }}>
                {g.title}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#F5F1E845', maxWidth: '52ch', marginBottom: '18px' }}>
                {g.note}
              </p>

              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {g.badges.map(b => {
                  const count = (holders.get(b.key) ?? []).length
                  return (
                    <div key={b.key} className="rounded-xl flex gap-4"
                      style={{ background: '#1A1A22', border: '1px solid #ffffff10', borderLeft: `3px solid ${b.accent}`, padding: '18px 16px' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.img} alt="" className="shrink-0"
                        style={{ height: '64px', width: 'auto', filter: 'drop-shadow(0 2px 8px #00000090)' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white" style={{ fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
                          {b.label}
                        </p>
                        <p className="text-[11px] leading-relaxed" style={{ color: '#F5F1E845', marginBottom: '8px' }}>
                          {b.crit}
                        </p>
                        {b.pending ? (
                          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#F5F1E835' }}>
                            {b.pending}
                          </p>
                        ) : (
                          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: count > 0 ? GOLD : '#F5F1E835' }}>
                            {count === 0 ? 'None yet' : count === 1 ? '1 player' : `${count} players`}
                          </p>
                        )}
                        {b.nameHolders && count > 0 && (
                          <p className="text-[11px] leading-relaxed" style={{ color: '#F5F1E840', marginTop: '5px' }}>
                            {nameList(b.key)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  )
}