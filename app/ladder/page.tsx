import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import PageGuide from '@/components/PageGuide'
import FactsTicker from '@/components/FactsTicker'

export default async function Ladder({ searchParams }: { searchParams: Promise<{ grade?: string; view?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'
  const validViews = ['points', 'h2h', 'weekly', 'clubs']
  const view = validViews.includes(params.view ?? '') ? (params.view as string) : 'points'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Front batch: profile, teams, and this view's primary query — all in parallel
  const [{ data: prof }, { data: teams }, primary] = await Promise.all([
    user
      ? supabase.from('profiles').select('site_theme').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from('public_teams').select('id, team_name, is_house, clubs(name)'),
    view === 'h2h'
      ? supabase.from('matchups').select('user_a, user_b, points_a, points_b, score_a, score_b')
          .eq('grade', grade).not('points_a', 'is', null)
      : view === 'weekly'
        ? supabase.from('user_scores')
            .select('round_id, rounds!inner(round_number, grade)')
            .eq('grade', grade)
            .order('rounds(round_number)', { ascending: false })
            .limit(1)
        : supabase.rpc('season_totals', { p_grade: grade }),
  ])
  const siteTheme = (prof as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  const T = theme(grade, siteTheme)
  const isW = grade === 'womens'
  const shimmer = T.shimmer ? ' gf-shimmer' : ''

  /* The record to beat. Shown on the weekly board because that's where people
     come to see what a big round looks like. */
  const { data: hiRows } = view === 'weekly'
    ? await supabase.rpc('current_high_score', { p_grade: grade })
    : { data: null }
  const hi = (hiRows as { points: number; team_name: string; round_number: number; is_new: boolean }[] | null)?.[0] ?? null

  type TeamRow = { id: string; team_name: string; is_house: boolean | null; clubs: { name: string } | null }
  const teamRows = (teams ?? []) as unknown as TeamRow[]
  const teamById = new Map(teamRows.map(t => [t.id, t]))
  const nameOf = (id: string) => teamById.get(id)?.team_name ?? 'Unknown team'
  const clubOf = (id: string) => teamById.get(id)?.clubs?.name ?? ''
  // GF House fills odd matchup slots — it plays, but it never ranks
  const isHouse = (id: string) => teamById.get(id)?.is_house === true

  type Row = { id: string; team: string; club: string; main: string; sub: string; sortKey: number; tieKey: number; unranked?: boolean }
  let rows: Row[] = []
  let weeklyRoundNumber: number | null = null
  if (view === 'points') {
    const scores = (primary.data ?? []) as { owner_id: string; points: number }[]
    const totals = new Map<string, number>()
    for (const s of scores) {
      if (isHouse(s.owner_id)) continue
      totals.set(s.owner_id, (totals.get(s.owner_id) ?? 0) + Number(s.points))
    }
    rows = [...totals.entries()].map(([id, points]) => ({
      id, team: nameOf(id), club: clubOf(id),
      main: String(points), sub: '', sortKey: points, tieKey: 0,
    }))
  } else if (view === 'h2h') {
    const matchups = (primary.data ?? []) as { user_a: string; user_b: string; points_a: number; points_b: number; score_a: number | null; score_b: number | null }[]
    type Rec = { w: number; d: number; l: number; pf: number }
    const recs = new Map<string, Rec>()
    const add = (id: string, pts: number, pf: number) => {
      if (isHouse(id)) return
      const r = recs.get(id) ?? { w: 0, d: 0, l: 0, pf: 0 }
      if (pts === 1) r.w++
      else if (pts === 0.5) r.d++
      else r.l++
      r.pf += pf
      recs.set(id, r)
    }
    for (const m of matchups) {
      add(m.user_a, Number(m.points_a), Number(m.score_a ?? 0))
      add(m.user_b, Number(m.points_b), Number(m.score_b ?? 0))
    }
    /* Ranked on wins, not win rate. A late joiner can't out-accumulate a team
       that's played all season, so nobody needs a games-played minimum and
       nobody gets shut out for starting late. Percentage breaks the tie. */
    rows = [...recs.entries()].map(([id, r]) => {
      const games = r.w + r.d + r.l
      const pct = games ? (r.w + 0.5 * r.d) / games : 0
      return {
        id, team: nameOf(id), club: clubOf(id),
        main: `${r.w}–${r.d}–${r.l}`,
        sub: `${pct.toFixed(3).replace(/^0/, '')} · ${r.pf} pts`,
        sortKey: r.w + 0.5 * r.d, tieKey: pct,
      }
    })
  } else if (view === 'weekly') {
    type LatestRow = { round_id: string; rounds: { round_number: number } }
    const latestRow = ((primary.data as unknown[] | null)?.[0] ?? null) as LatestRow | null
    if (latestRow) {
      weeklyRoundNumber = latestRow.rounds.round_number
      const { data: scores } = await supabase
        .from('user_scores').select('owner_id, points')
        .eq('grade', grade).eq('round_id', latestRow.round_id)
      rows = (scores ?? []).filter(s => !isHouse(s.owner_id)).map(s => ({
        id: s.owner_id, team: nameOf(s.owner_id), club: clubOf(s.owner_id),
        main: String(s.points), sub: '', sortKey: Number(s.points), tieKey: 0,
      }))
    }
  } else {
    const scores = (primary.data ?? []) as { owner_id: string; points: number }[]
    const userTotals = new Map<string, number>()
    for (const s of scores) {
      if (isHouse(s.owner_id)) continue
      userTotals.set(s.owner_id, (userTotals.get(s.owner_id) ?? 0) + Number(s.points))
    }
    type ClubAgg = { users: number; total: number }
    const clubs = new Map<string, ClubAgg>()
    for (const t of teamRows) {
      if (t.is_house === true) continue
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
                    {/* The all-time record, sitting above the week's champion */}
          {view === 'weekly' && hi && (
            <div className="rounded-2xl overflow-hidden mb-6 relative"
              style={{ background: '#07080D', border: `1px solid ${T.accent}55` }}>
              {/* Neon haze drifting behind the record — the arcade treatment,
                  turned down so the number still reads first. */}
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 40% 120% at 88% 50%, ${T.accent}22 0%, transparent 70%),
                               radial-gradient(ellipse 55% 140% at 8% 20%, ${T.accent}14 0%, transparent 72%)`,
                }} />
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: 0.5,
                  background: `repeating-linear-gradient(180deg, ${T.accent}0A 0px, ${T.accent}0A 1px, transparent 1px, transparent 5px)`,
                }} />
              <div className="relative flex items-center justify-between gap-4" style={{ padding: '18px 24px' }}>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: T.textDim }}>
                    All-time high score
                  </p>
                  <p className="text-sm font-black truncate" style={{ fontFamily: 'var(--font-heading)', color: T.text, marginTop: '5px' }}>
                    {hi.team_name}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: T.textDim, marginTop: '2px' }}>
                    Round {hi.round_number}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {hi.is_new && (
                    <span className="text-[9px] font-black uppercase tracking-[0.22em]"
                      style={{ background: T.accent, color: T.buttonText, padding: '5px 9px' }}>
                      New
                    </span>
                  )}
                  <p className="text-3xl sm:text-4xl font-black"
                    style={{ fontFamily: 'var(--font-heading)', color: T.accent, textShadow: T.glow }}>
                    {hi.points}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Weekly champion honour board */}
          {champion && (
            <div className="relative rounded-2xl overflow-hidden text-center mb-8 pinstripe-fine"
              style={{ background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `3px solid ${T.button}` }}>
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
                <p className={`text-5xl sm:text-6xl font-black ${isW && siteTheme === 'grade' ? 'electric' : ''}${T.shimmer ? ' gf-shimmer-text' : ''}`}
                  style={T.shimmer ? undefined : { color: T.accent, textShadow: isW && siteTheme === 'grade' ? undefined : T.glow }}>
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
                  {view === 'h2h' ? 'W–D–L' : view === 'clubs' ? 'Avg' : 'Points'}
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
                    <span className={"w-9 text-sm font-black shrink-0" + (T.shimmer && !row.unranked && rankNum <= 3 ? ' gf-shimmer-text' : '')}
                      style={T.shimmer && !row.unranked && rankNum <= 3 ? undefined : { color: !row.unranked && rankNum <= 3 ? T.accent : T.textDim }}>{rankLabel}</span>
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
          <div style={{ marginTop: '32px' }}>
            <FactsTicker compact />
          </div>
          <p className="text-[11px] text-center mt-6" style={{ color: T.textDim }}>
            {view === 'points' && 'Top 20 shown. Cumulative points from all scored rounds. Provisional scores update once official stats are confirmed.'}
            {view === 'h2h' && 'Top 20 shown. Ranked on wins, with a draw counting half. Ties broken by win rate, then by points scored. No minimum — join whenever, every win counts.'}
            {view === 'weekly' && 'Top score from the latest round. A new champion is crowned every week.'}
            {view === 'clubs' && 'Ranked on average points per team, minimum five teams to rank. Ties broken by club total.'}
          </p>
        </div>
      </section>
      <PageGuide pageKey="ladder" accent={T.accent} textColor={T.text} steps={[
        {
          title: 'Four competitions, one page',
          body: 'Ladder is season-long total points. H2H is your win-loss record. Weekly crowns the biggest single-round score. Clubs races club against club on average points.',
        },
        {
          title: 'Find yourself',
          body: "Your team is highlighted wherever you sit — and if you're outside the top 20, you're pinned at the bottom with your true rank.",
        },
      ]} />
      <Footer />
    </main>
  )
}