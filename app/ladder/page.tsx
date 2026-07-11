import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'

const THEMES = {
  mens: { accent: '#3FBF63', headerBg: '#1A2E1F' },
  womens: { accent: '#4D7FFF', headerBg: '#10214D' },
}

export default async function Ladder({ searchParams }: { searchParams: Promise<{ grade?: string; view?: string }> }) {
  const params = await searchParams
  const grade = params.grade === 'womens' ? 'womens' : 'mens'
  const view = params.view === 'h2h' ? 'h2h' : 'points'
  const T = THEMES[grade]

  const supabase = await createClient()

  const { data: teams } = await supabase
    .from('public_teams').select('id, team_name, clubs(name)')
  type TeamRow = { id: string; team_name: string; clubs: { name: string } | null }
  const teamById = new Map(((teams ?? []) as unknown as TeamRow[]).map(t => [t.id, t]))

  type Row = { id: string; team: string; club: string; main: string; sub: string; sortKey: number; tieKey: number }
  let rows: Row[] = []

  if (view === 'points') {
    const { data: scores } = await supabase
      .from('user_scores').select('owner_id, points').eq('grade', grade)
    const totals = new Map<string, number>()
    for (const s of scores ?? []) {
      totals.set(s.owner_id, (totals.get(s.owner_id) ?? 0) + Number(s.points))
    }
    rows = [...totals.entries()].map(([id, points]) => ({
      id,
      team: teamById.get(id)?.team_name ?? 'Unknown team',
      club: teamById.get(id)?.clubs?.name ?? '',
      main: String(points),
      sub: '',
      sortKey: points,
      tieKey: 0,
    }))
  } else {
    const { data: matchups } = await supabase
      .from('matchups').select('user_a, user_b, points_a, points_b, score_a, score_b')
      .eq('grade', grade).not('points_a', 'is', null)
    type Rec = { w: number; d: number; l: number; pf: number }
    const recs = new Map<string, Rec>()
    const add = (id: string, pts: number, pf: number) => {
      const r = recs.get(id) ?? { w: 0, d: 0, l: 0, pf: 0 }
      if (pts === 1) r.w++
      else if (pts === 0.5) r.d++
      else r.l++
      r.pf += pf
      recs.set(id, r)
    }
    for (const m of matchups ?? []) {
      add(m.user_a, Number(m.points_a), Number(m.score_a ?? 0))
      add(m.user_b, Number(m.points_b), Number(m.score_b ?? 0))
    }
    rows = [...recs.entries()].map(([id, r]) => {
      const games = r.w + r.d + r.l
      const pct = games ? (r.w + 0.5 * r.d) / games : 0
      return {
        id,
        team: teamById.get(id)?.team_name ?? 'Unknown team',
        club: teamById.get(id)?.clubs?.name ?? '',
        main: pct.toFixed(3).replace(/^0/, ''),
        sub: `${r.w}–${r.d}–${r.l}`,
        sortKey: pct,
        tieKey: r.pf,
      }
    })
  }
  rows.sort((a, b) => b.sortKey - a.sortKey || b.tieKey - a.tieKey)

  const tabStyle = (active: boolean) =>
    active
      ? { color: '#141210', background: T.accent }
      : { color: '#F5F1E860', border: '1px solid #ffffff20' }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '130px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: T.accent }}>
              {view === 'points' ? 'Season Ladder' : 'H2H Standings'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              {grade === 'mens' ? "Men's" : "Women's"} Standings
            </h1>
            <div className="flex justify-center gap-2 mb-3">
              <a href={`/ladder?grade=mens&view=${view}`}
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={grade === 'mens' ? { color: '#141210', background: '#3FBF63' } : { color: '#F5F1E860', border: '1px solid #ffffff20' }}>
                Men&apos;s
              </a>
              <a href={`/ladder?grade=womens&view=${view}`}
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={grade === 'womens' ? { color: '#141210', background: '#4D7FFF' } : { color: '#F5F1E860', border: '1px solid #ffffff20' }}>
                Women&apos;s
              </a>
            </div>
            <div className="flex justify-center gap-2">
              <a href={`/ladder?grade=${grade}&view=points`}
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={tabStyle(view === 'points')}>
                Ladder
              </a>
              <a href={`/ladder?grade=${grade}&view=h2h`}
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={tabStyle(view === 'h2h')}>
                H2H
              </a>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#181510', border: '1px solid #ffffff12' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a' }}>
              <span className="text-xs font-black uppercase tracking-[0.25em] text-[#F5F1E8]">Team</span>
              <span className="text-xs font-black uppercase tracking-[0.25em] text-[#F5F1E8]">
                {view === 'points' ? 'Points' : 'Win %'}
              </span>
            </div>
            {rows.map((row, i) => (
              <div key={row.id} className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid #ffffff08' }}>
                <span className="w-8 text-sm font-black" style={{ color: i < 3 ? T.accent : '#F5F1E850' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#F5F1E8] truncate" style={{ fontFamily: 'var(--font-heading)' }}>{row.team}</p>
                  <p className="text-[10px] text-[#F5F1E8]/35">{row.club}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-[#F5F1E8]">{row.main}</p>
                  {row.sub && <p className="text-[10px] text-[#F5F1E8]/35">{row.sub}</p>}
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="px-6 py-10 text-sm text-center text-[#F5F1E8]/40">
                {view === 'points'
                  ? 'No rounds scored yet — the ladder starts with Round 1.'
                  : 'No matchups resolved yet — H2H standings start with Round 1.'}
              </p>
            )}
          </div>

          <p className="text-[11px] text-center mt-6 text-[#F5F1E8]/30">
            {view === 'points'
              ? 'Cumulative points from all scored rounds. Provisional scores update once official stats are confirmed.'
              : 'Win percentage: W=1, D=0.5, L=0. Ties broken by total points scored. Minimum half a season to qualify for the title.'}
          </p>
        </div>
      </section>
      <Footer />
    </main>
  )
}
