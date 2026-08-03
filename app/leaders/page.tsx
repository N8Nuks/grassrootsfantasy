import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'

const CATS: { key: string; label: string; format?: 'ba' }[] = [
  { key: 'season_points', label: 'Points' },
  { key: 'season_hr', label: 'Home Runs' },
  { key: 'season_rbi', label: 'RBI' },
  { key: 'season_sb', label: 'Stolen Bases' },
  { key: 'season_ba', label: 'Batting Average', format: 'ba' },
  { key: 'season_wins', label: 'Pitching Wins' },
  { key: 'season_k_pit', label: 'Pitching Strikeouts' },
]

export default async function Leaders({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let siteTheme = 'grade'
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('site_theme').eq('id', user.id).single()
    siteTheme = (prof as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  }
  const T = theme(grade, siteTheme)

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, tier, stats, photo_url, clubs(name)')
    .eq('grade', grade).eq('active', true)

  type Row = { id: string; full_name: string; tier: string; stats: Record<string, number> | null; photo_url: string | null; clubs: { name: string } | null }
  const all = ((players ?? []) as unknown as Row[]).map(p => ({ ...p, stats: p.stats ?? {} }))

  const leadersFor = (key: string) =>
    all.filter(p => (p.stats[key] ?? 0) > 0)
      .sort((a, b) => (b.stats[key] ?? 0) - (a.stats[key] ?? 0))
      .slice(0, 5)

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '90px' }}>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: T.accent }}>2026/27 Season</p>
            <h1 className="text-3xl sm:text-4xl font-black mb-4" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>
              {grade === 'mens' ? "Men's" : "Women's"} League Leaders
            </h1>
            <div className="flex justify-center">
              <GradeSwitch grade={grade} mensHref="/leaders?grade=mens" womensHref="/leaders?grade=womens" palette={siteTheme !== 'grade' ? T : undefined} />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CATS.map(cat => {
              const rows = leadersFor(cat.key)
              return (
                <div key={cat.key} className="rounded-2xl overflow-hidden pinstripe" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
                  <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.accent}30`, padding: '14px 22px' }}>
                    <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: T.accent }}>{cat.label}</p>
                  </div>
                  {rows.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff08', padding: '10px 22px' }}>
                      <span className="w-6 text-sm font-black shrink-0" style={{ color: i === 0 ? '#FFD700' : T.textDim }}>{i + 1}</span>
                      <div className="w-9 h-9 rounded-full overflow-hidden flex items-end justify-center shrink-0" style={{ background: `${T.accent}18` }}>
                        {p.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.photo_url} alt={p.full_name} className="h-full w-auto object-contain" />
                        ) : (
                          <span className="text-xs font-black" style={{ color: T.textDim }}>{p.full_name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: T.text }}>{p.full_name}</p>
                        <p className="text-[10px] truncate" style={{ color: T.textDim }}>{p.clubs?.name ?? ''}</p>
                      </div>
                      <span className="text-base font-black shrink-0" style={{ fontFamily: 'var(--font-heading)', color: i === 0 ? '#FFD700' : T.text }}>
                        {cat.format === 'ba' ? Number(p.stats[cat.key]).toFixed(3) : p.stats[cat.key]}
                      </span>
                    </div>
                  ))}
                  {rows.length === 0 && <p className="text-sm text-center" style={{ color: T.textDim, padding: '28px' }}>Season not started</p>}
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}