import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'

export default async function Ladder({ searchParams }: { searchParams: Promise<{ grade?: string; view?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'
  const validViews = ['points', 'h2h', 'weekly', 'clubs']
  const view = validViews.includes(params.view ?? '') ? (params.view as string) : 'points'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let siteTheme = 'grade'
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('site_theme').eq('id', user.id).single()
    siteTheme = (prof as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  }
  const T = theme(grade, siteTheme)
  const isW = grade === 'womens'
  const shimmer = T.shimmer ? ' gf-shimmer' : ''

  const { data: teams } = await supabase
    .from('public_teams').select('id, team_name, clubs(name)')
  type TeamRow = { id: string; team_name: string; clubs: { name: string } | null }
  const teamRows = (teams ?? []) as unknown as TeamRow[]
  const teamById = new Map(teamRows.map(t => [t.id, t]))
  const nameOf = (id: string) => teamById.get(id)?.team_name ?? 'Unknown team'
  const clubOf = (id: string) => teamById.get(id)?.clubs?.name ?? ''

  type Row = { id: string; team: string; club: string; main: string; sub: string; sortKey: number; tieKey: number; unranked?: boolean }
  let rows: Row[] = []
  let weeklyRoundNumber: number | null = null

  if (view === 'points') {
    const { data: scores } = await supabase
      .from('user_scores').select('owner_id, points').eq('grade', grade)
    const totals = new Map<string, number>()
    for (const s of scores ?? []) {
      totals.set(s.owner_id, (totals.get(s.owner_id) ?? 0) + Number(s.points))
    }
    rows = [...totals.entries()].map(([id, points]) => ({
      id, team: nameOf(id), club: clubOf(id),
      main: String(points), sub: '', sortKey: points, tieKey: 0,
    }))
  } else if (view === 'h2h') {
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
        id, team: nameOf(id), club: clubOf(id),
        main: pct.toFixed(3).replace(/^0/, ''), sub: `${r.w}–${r.d}–${r.l}`,
        sortKey: pct, tieKey: r.pf,
      }
    })
  } else if (view === 'weekly') {
    const { data: latest } = await supabase
      .from('user_scores')
      .select('round_id, rounds!inner(round_number, grade)')
      .eq('grade', grade)
      .order('rounds(round_number)', { ascending: false })
      .limit(1)
    type LatestRow = { round_id: string; rounds: { round_number: number } }
    const latestRow = (latest?.[0] ?? null) as unknown as LatestRow | null
    if (latestRow) {
      weeklyRoundNumber = latestRow.rounds.round_number
      const { data: scores } = await supabase
        .from('user_scores').select('owner_id, points')
        .eq('grade', grade).eq('round_id', latestRow.round_id)
      rows = (scores ?? []).map(s => ({
        id: s.owner_id, team: nameOf(s.owner_id), club: clubOf(s.owner_id),
        main: String(s.points), sub: '', sortKey: Number(s.points), tieKey: 0,
      }))
    }
  } else {
    const { data: scores } = await supabase
      .from('user_scores').select('owner_id, points').eq('grade', grade)
    const userTotals = new Map<string, number>()
    for (const s of scores ?? []) {
      userTotals.set(s.owner_id, (userTotals.get(s.owner_id) ?? 0) + Number(s.points))
    }
    type ClubAgg = { users: number; total: number }
    const clubs = new Map<string, ClubAgg>()
    for (const t of teamRows) {
      const club = t.clubs?.name
      if (!club) continue
      const agg = clubs.get(club) ?? { users: 0, total: 0 }
      agg.users += 1
      agg.total += userTotals.get(t.id) ?? 0
      clubs.set(club, agg)
    }
    rows = [...clubs.entries()].map(([club, agg]) => {
      const avg = agg.users ? agg.total / agg.users : 0
      const qualified = agg.users >= 5
      return {
        id: club, team: club, club: `${agg.users} team${agg.users === 1 ? '' : 's'}`,
        main: avg.toFixed(1), sub: `${agg.total} total`,
        sortKey: avg, tieKey: agg.total, unranked: !qualified,
      }
    })
    rows.sort((a, b) =>
      Number(!!a.unranked) - Number(!!b.unranked) || b.sortKey - a.sortKey || b.tieKey - a.tieKey)
  }
  if (view !== 'clubs') rows.sort((a, b) => b.sortKey - a.sortKey || b.tieKey - a.tieKey)

  const champion = view === 'weekly' && rows.length > 0 ? rows[0] : null

  const CAP = view === 'weekly' ? 10 : 20
  let listRows: Row[]
  let pinned: { row: Row; rank: number } | null = null

  if (view === 'clubs') {
    listRows = rows
  } else if (view === 'weekly') {
    listRows = rows.slice(1, 1 + CAP)
  } else {
    listRows = rows.slice(0, CAP)
    if (user) {
      const idx = rows.findIndex(r => r.id === user.id)
      if (idx >= CAP) pinned = { row: rows[idx], rank: idx + 1 }
    }
  }

  

  const titles: Record<string, string> = {
    points: 'Season Ladder', h2h: 'H2H Standings', weekly: 'Weekly High Score', clubs: 'Club Champion',
  }

  let rankCounter = 0

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className={"text-xs font-black uppercase tracking-[0.3em] mb-3" + (T.shimmer ? ' gf-shimmer-text' : '')}
              style={T.shimmer ? undefined : { color: T.accent }}>{titles[view]}</p>
            <h1 className="text-3xl sm:text-4xl font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text, marginBottom: '28px' }}>
              {grade === 'mens' ? "Men's" : "Women's"} Standings
            </h1>
            <div className="flex justify-center" style={{ marginBottom: '20px' }}>
              <GradeSwitch grade={grade} mensHref={`/ladder?grade=mens&view=${view}`} womensHref={`/ladder?grade=womens&view=${view}`} palette={siteTheme !== 'grade' ? T : undefined} />
            </div>
            <div className="flex justify-center">
              <div className="inline-flex rounded-full overflow-hidden flex-wrap justify-center" style={{ border: '1px solid #ffffff25' }}>
                {([['points','Ladder'],['h2h','H2H'],['weekly','Weekly'],['clubs','Clubs']] as const).map(([v, label], i) => (
                  <a key={v} href={`/ladder?grade=${grade}&view=${v}`}
                    className={"text-xs font-black uppercase tracking-widest transition-all flex items-center" + (view === v ? shimmer : '')}
                    style={{
                      color: view === v ? T.buttonText : T.textDim,
                      background: view === v ? T.button : 'transparent',
                      padding: '12px 24px',
                      minHeight: '44px',
                      ...(i > 0 ? { borderLeft: '1px solid #ffffff15' } : {}),
                    }}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly champion honour board */}
          {champion && (
            <div className="relative rounded-2xl overflow-hidden text-center mb-8 pinstripe-fine"
              style={{ background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `1px solid ${T.accent}45` }}>
              <div className="relative z-10" style={{ padding: '48px 32px 40px' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4" style={{ color: T.accent }}>
                  Round {weeklyRoundNumber} · High Score
                </p>
                <p className="text-4xl sm:text-5xl font-black mb-2" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>
                  {champion.team}
                </p>
                {champion.club && (
                  <p className="text-xs uppercase tracking-widest mb-5" style={{ color: T.textDim }}>{champion.club}</p>
                )}
                <p className={`text-5xl sm:text-6xl font-black ${isW && siteTheme === 'grade' ? 'electric' : ''}`}
                  style={{ color: T.accent, textShadow: isW && siteTheme === 'grade' ? undefined : T.glow }}>
                  {champion.main}
                </p>
                <p className="text-[10px] uppercase tracking-[0.3em] mt-2" style={{ color: T.textDim }}>points</p>
              </div>
            </div>
          )}

          {listRows.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
              <div className="flex items-center justify-between" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '16px 28px' }}>
                <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: T.text }}>
                  {view === 'weekly' ? 'The Chasing Pack' : view === 'clubs' ? 'Club' : 'Team'}
                </span>
                <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: T.text, paddingRight: '2px' }}>
                  {view === 'h2h' ? 'Win %' : view === 'clubs' ? 'Avg' : 'Points'}
                </span>
              </div>
              {listRows.map((row, i) => {
                let rankLabel: string
                if (view === 'weekly') {
                  rankLabel = String(i + 2)
                } else if (row.unranked) {
                  rankLabel = '–'
                } else {
                  rankCounter += 1
                  rankLabel = String(rankCounter)
                }
                const rankNum = Number(rankLabel)
                const isMe = !!user && row.id === user.id
                return (
                  <div key={row.id} className="flex items-center gap-4"
                    style={{
                      borderBottom: '1px solid #ffffff08',
                      opacity: row.unranked ? 0.45 : 1,
                      background: isMe ? T.accentSoft : 'transparent',
                      padding: '16px 28px',
                    }}>
                    <span className="w-9 text-sm font-black shrink-0" style={{ color: !row.unranked && rankNum <= 3 ? T.accent : T.textDim }}>{rankLabel}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{row.team}</p>
                      <p className="text-[10px]" style={{ color: T.textDim }}>{row.club}{row.unranked ? ' · needs 5 to rank' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black" style={{ color: T.text }}>{row.main}</p>
                      {row.sub && <p className="text-[10px]" style={{ color: T.textDim }}>{row.sub}</p>}
                    </div>
                  </div>
                )
              })}

              {pinned && (
                <>
                  <div className="text-center" style={{ borderBottom: '1px solid #ffffff08', padding: '4px 28px' }}>
                    <span className="text-xs font-black" style={{ color: T.textDim }}>⋯</span>
                  </div>
                  <div className="flex items-center gap-4"
                    style={{ background: T.accentSoft, borderTop: `1px solid ${T.accent}30`, padding: '16px 28px' }}>
                    <span className="w-9 text-sm font-black shrink-0" style={{ color: T.accent }}>{pinned.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{pinned.row.team}</p>
                      <p className="text-[10px]" style={{ color: T.accent }}>Your team</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black" style={{ color: T.text }}>{pinned.row.main}</p>
                      {pinned.row.sub && <p className="text-[10px]" style={{ color: T.textDim }}>{pinned.row.sub}</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {rows.length === 0 && (
            <div className="rounded-2xl overflow-hidden pinstripe" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
              <div style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '16px 28px' }}>
                <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: T.text }}>{titles[view]}</span>
              </div>
              <div className="text-center" style={{ padding: '48px 28px' }}>
                <p className="text-2xl font-black mb-3" style={{ fontFamily: 'var(--font-heading)', color: T.accent }}>
                  {view === 'weekly' ? 'The board awaits its first champion.' : view === 'clubs' ? 'The club race hasn\u2019t started.' : 'The season hasn\u2019t started.'}
                </p>
                <p className="text-sm" style={{ color: T.textDim, maxWidth: '380px', margin: '0 auto' }}>
                  {view === 'points' && 'Every team starts level. The ladder comes alive when Round 1 is scored — first pitch October 3.'}
                  {view === 'h2h' && 'Every team starts 0–0–0. Your first head-to-head opponent is drawn when Round 1 locks.'}
                  {view === 'weekly' && 'One team tops the league every single week. The first honour board is crowned after Round 1.'}
                  {view === 'clubs' && 'Every point your team scores counts toward your club. Five teams from a club opens their campaign.'}
                </p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-center mt-6" style={{ color: T.textDim }}>
            {view === 'points' && 'Top 20 shown. Cumulative points from all scored rounds. Provisional scores update once official stats are confirmed.'}
            {view === 'h2h' && 'Top 20 shown. Win percentage: W=1, D=0.5, L=0. Ties broken by total points scored. Minimum half a season to qualify for the title.'}
            {view === 'weekly' && 'Top score from the latest round. A new champion is crowned every week.'}
            {view === 'clubs' && 'Ranked on average points per team, minimum five teams to rank. Ties broken by club total.'}
          </p>
        </div>
      </section>
      <Footer />
    </main>
  )
}