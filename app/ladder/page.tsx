import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'

const THEMES = {
  mens: { accent: '#3FBF63', headerBg: '#1A2E1F' },
  womens: { accent: '#4D7FFF', headerBg: '#10214D' },
}

export default async function Ladder({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade = params.grade === 'womens' ? 'womens' : 'mens'
  const T = THEMES[grade]

  const supabase = await createClient()

  const { data: scores } = await supabase
    .from('user_scores').select('owner_id, points').eq('grade', grade)

  const { data: teams } = await supabase
    .from('public_teams').select('id, team_name, clubs(name)')

  type TeamRow = { id: string; team_name: string; clubs: { name: string } | null }
  const teamById = new Map(((teams ?? []) as unknown as TeamRow[]).map(t => [t.id, t]))

  const totals = new Map<string, number>()
  for (const s of scores ?? []) {
    totals.set(s.owner_id, (totals.get(s.owner_id) ?? 0) + Number(s.points))
  }
  const ladder = [...totals.entries()]
    .map(([id, points]) => ({
      id,
      team: teamById.get(id)?.team_name ?? 'Unknown team',
      club: teamById.get(id)?.clubs?.name ?? '',
      points,
    }))
    .sort((a, b) => b.points - a.points)

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: "130px", paddingBottom: "100px" }}>
        <div style={{ maxWidth: "680px", marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-center" style={{ marginBottom: "40px" }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: T.accent }}>Season Ladder</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              {grade === 'mens' ? "Men's" : "Women's"} Standings
            </h1>
            <div className="flex justify-center gap-2">
              <a href="/ladder?grade=mens"
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={grade === 'mens' ? { color: '#141210', background: '#3FBF63' } : { color: '#F5F1E860', border: '1px solid #ffffff20' }}>
                Men&apos;s
              </a>
              <a href="/ladder?grade=womens"
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={grade === 'womens' ? { color: '#141210', background: '#4D7FFF' } : { color: '#F5F1E860', border: '1px solid #ffffff20' }}>
                Women&apos;s
              </a>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#181510', border: '1px solid #ffffff12' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a' }}>
              <span className="text-xs font-black uppercase tracking-[0.25em] text-[#F5F1E8]">Team</span>
              <span className="text-xs font-black uppercase tracking-[0.25em] text-[#F5F1E8]">Points</span>
            </div>
            {ladder.map((row, i) => (
              <div key={row.id} className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid #ffffff08' }}>
                <span className="w-8 text-sm font-black" style={{ color: i < 3 ? T.accent : '#F5F1E850' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#F5F1E8] truncate" style={{ fontFamily: 'var(--font-heading)' }}>{row.team}</p>
                  <p className="text-[10px] text-[#F5F1E8]/35">{row.club}</p>
                </div>
                <span className="text-base font-black text-[#F5F1E8]">{row.points}</span>
              </div>
            ))}
            {ladder.length === 0 && (
              <p className="px-6 py-10 text-sm text-center text-[#F5F1E8]/40">No rounds scored yet — the ladder starts with Round 1.</p>
            )}
          </div>

          <p className="text-[11px] text-center mt-6 text-[#F5F1E8]/30">
            Cumulative points from all scored rounds. Provisional scores update once official stats are confirmed.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  )
}