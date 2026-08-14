import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import PageGuide from '@/components/PageGuide'

const SLOT_ORDER = ['P', 'C', 'B1', 'B2', 'B3', 'SS', 'LF', 'CF', 'RF', 'DP', 'PB', 'DR',
  'BENCH1', 'BENCH2', 'BENCH3', 'BENCH4']
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const slotRank = (s: string) => {
  const i = SLOT_ORDER.indexOf(s)
  return i === -1 ? 999 : i
}
const slotLabel = (s: string) => SLOT_LABELS[s] ?? s

type SlotRow = {
  slot: string
  batting_order: number | null
  cards: { player_id: string; players: { full_name: string } | null } | null
}
type LineupRec = {
  id: string
  owner_id: string
  rounds: { round_number: number }
  lineup_slots: SlotRow[]
}
type Palette = ReturnType<typeof theme>

function TeamCard({ title, slots, T, winner, pointsByPlayer, pointsRoundLabel }: {
  title: string
  slots: SlotRow[]
  T: Palette
  winner: boolean
  pointsByPlayer: Map<string, number> | null
  pointsRoundLabel: string | null
}) {
  const sorted = slots.filter(s => !s.slot.startsWith('RES'))
    .sort((a, b) => slotRank(a.slot) - slotRank(b.slot))
  return (
    <div className="flex-1 rounded-2xl overflow-hidden pinstripe"
      style={{ background: T.surface, border: winner ? `1px solid ${T.accent}70` : '1px solid #ffffff12' }}>
      <div className="flex items-center justify-between gap-3" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '12px 24px' }}>
        <div className="flex items-center gap-2 min-w-0">
          {winner && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0" style={{ color: '#141210', background: '#3FBF63' }}>W</span>
          )}
          <p className="text-xs font-black uppercase tracking-[0.2em] truncate" style={{ color: T.accent }}>{title}</p>
        </div>
        {pointsByPlayer && (
          <span className="w-14 text-center text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>
            {pointsRoundLabel ?? 'Points'}
          </span>
        )}
      </div>
      {sorted.map((s, i) => {
        const pid = s.cards?.player_id
        const pts = pointsByPlayer && pid ? pointsByPlayer.get(pid) : undefined
        return (
          <div key={i} className="flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff08', padding: '10px 24px' }}>
            <span className="w-12 text-[10px] font-black uppercase shrink-0" style={{ color: T.textDim }}>{slotLabel(s.slot)}</span>
            <span className="flex-1 min-w-0 text-sm font-bold truncate" style={{ color: T.text }}>
              {s.cards?.players?.full_name ?? '—'}
            </span>
            {pointsByPlayer && (
              <span className="w-14 text-center text-sm font-black shrink-0" style={{ color: pts != null ? T.accent : T.textDim }}>{pts ?? '—'}</span>
            )}
          </div>
        )
      })}
      {sorted.length === 0 && <p className="text-sm text-center" style={{ color: T.textDim, padding: '32px 24px' }}>No team yet.</p>}
    </div>
  )
}

export default async function Matchups({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'
  const isW = grade === 'womens'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: prof }, { data: round }, { data: teams }, { data: newestRound }] = await Promise.all([
    user
      ? supabase.from('profiles').select('site_theme').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from('rounds').select('id, round_number, lock_at')
      .eq('grade', grade).lte('lock_at', new Date().toISOString())
      .order('round_number', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('public_teams').select('id, team_name'),
    // The live round, locked or not — used to explain why an open round isn't shown yet
    supabase.from('rounds').select('round_number, status')
      .eq('grade', grade).order('round_number', { ascending: false }).limit(1).maybeSingle(),
  ])
  const siteTheme = (prof as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  const T = theme(grade, siteTheme)

  // An open round sitting above the one on screen: matchups aren't drawn until it locks
  const pendingRound = newestRound && newestRound.status === 'open'
    && (!round || newestRound.round_number > round.round_number)
    ? newestRound.round_number : null

  type Matchup = { user_a: string; user_b: string; score_a: number | null; score_b: number | null }
  let myMatchup: Matchup | null = null
  let allMatchups: Matchup[] = []
  let lineupA: LineupRec | null = null
  let lineupB: LineupRec | null = null
  let pointsByPlayer: Map<string, number> | null = null
  let pointsRoundNumber: number | null = null
  const seasonTotals = new Map<string, number>()

  if (round) {
    await supabase.rpc('pair_round', { p_round_id: round.id })
    const { data: matchups } = await supabase
      .from('matchups').select('user_a, user_b, score_a, score_b')
      .eq('round_id', round.id)
    allMatchups = matchups ?? []
    if (user) myMatchup = allMatchups.find(m => m.user_a === user.id || m.user_b === user.id) ?? null

    if (myMatchup) {
      const [{ data: lineups }, { data: seasonScores }] = await Promise.all([
        supabase
          .from('lineups')
          .select('id, owner_id, rounds!inner(round_number), lineup_slots(slot, batting_order, cards(player_id, players(full_name)))')
          .eq('grade', grade)
          .in('owner_id', [myMatchup.user_a, myMatchup.user_b]),
        supabase.from('user_scores').select('owner_id, points').eq('grade', grade)
          .in('owner_id', [myMatchup.user_a, myMatchup.user_b]),
      ])
      for (const s of seasonScores ?? []) {
        seasonTotals.set(s.owner_id, (seasonTotals.get(s.owner_id) ?? 0) + Number(s.points))
      }
      const rows = ((lineups ?? []) as unknown as LineupRec[])
        .filter(l => l.rounds.round_number <= round.round_number)
      const latest = (owner: string) =>
        rows.filter(l => l.owner_id === owner)
          .sort((a, b) => b.rounds.round_number - a.rounds.round_number)[0] ?? null
      lineupA = latest(myMatchup.user_a)
      lineupB = latest(myMatchup.user_b)
      const ids = [...(lineupA?.lineup_slots ?? []), ...(lineupB?.lineup_slots ?? [])]
        .map(s => s.cards?.player_id).filter(Boolean) as string[]
      if (ids.length) {
        const { data: pscores } = await supabase
          .from('player_scores').select('player_id, points')
          .eq('round_id', round.id).in('player_id', ids)
        if (pscores?.length) {
          pointsByPlayer = new Map(pscores.map(p => [p.player_id, Number(p.points)]))
          pointsRoundNumber = round.round_number
        } else {
          // Current round not scored/visible yet — fall back to the previous round
          const { data: prevRound } = await supabase
            .from('rounds').select('id, round_number')
            .eq('grade', grade).lt('round_number', round.round_number)
            .order('round_number', { ascending: false }).limit(1).maybeSingle()
          if (prevRound) {
            const { data: prevScores } = await supabase
              .from('player_scores').select('player_id, points')
              .eq('round_id', prevRound.id).in('player_id', ids)
            if (prevScores?.length) {
              pointsByPlayer = new Map(prevScores.map(p => [p.player_id, Number(p.points)]))
              pointsRoundNumber = prevRound.round_number
            }
          }
        }
      }
    }
  }

  const nameOf = (id: string) =>
    (teams ?? []).find(t => t.id === id)?.team_name ?? 'Unknown team'
  const scored = myMatchup?.score_a != null && myMatchup?.score_b != null
  const aWins = scored && Number(myMatchup!.score_a) > Number(myMatchup!.score_b)
  const bWins = scored && Number(myMatchup!.score_b) > Number(myMatchup!.score_a)
  const otherMatchups = allMatchups.filter(m => !myMatchup || m.user_a !== myMatchup.user_a || m.user_b !== myMatchup.user_b)

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '90px' }}>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className={"text-xs font-black uppercase tracking-[0.3em] mb-3" + (T.shimmer ? ' gf-shimmer-text' : '')}
              style={T.shimmer ? undefined : { color: T.accent }}>
              {round ? `Round ${round.round_number} Matchups` : 'Matchups'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black mb-4" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>
              {grade === 'mens' ? "Men's" : "Women's"} Head to Head
            </h1>
            <div className="flex justify-center">
              <GradeSwitch grade={grade} mensHref="/matchups?grade=mens" womensHref="/matchups?grade=womens" palette={siteTheme !== 'grade' ? T : undefined} />
            </div>
          </div>

          {/* Round open but not locked — explain why the new draw isn't here yet */}
          {pendingRound !== null && (
            <div className="rounded-2xl text-center mb-8"
              style={{ background: T.surface, border: `1px solid ${T.accent}40`, padding: '20px 24px' }}>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: T.accent }}>
                Round {pendingRound} is open
              </p>
              <p className="text-sm leading-relaxed" style={{ color: T.textDim, maxWidth: '520px', margin: '0 auto' }}>
                Your new matchup is drawn when lineups lock. Until then you&apos;re looking at how
                {round ? ` Round ${round.round_number}` : ' the last round'} finished — so get your lineup set.
              </p>
            </div>
          )}

          {!round && (
            <p className="text-sm text-center" style={{ color: T.textDim }}>Matchups appear once the first round locks.</p>
          )}
          {round && myMatchup && (
            <>
              {/* Scoreboard banner */}
              <div className="relative rounded-2xl overflow-hidden pinstripe-fine mb-8"
                style={{ background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `3px solid ${T.button}` }}>
                <div className="relative z-10 flex flex-col gap-3 sm:grid sm:grid-cols-3 items-center" style={{ padding: '32px 24px' }}>
                  <div className="text-center" style={{ opacity: scored && !aWins ? 0.55 : 1 }}>
                    <p className="text-lg sm:text-2xl font-black truncate px-2" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{nameOf(myMatchup.user_a)}</p>
                    <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: T.textDim }}>Season: {seasonTotals.get(myMatchup.user_a) ?? 0} pts</p>
                    {aWins && <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1" style={{ color: '#3FBF63' }}>Winner</p>}
                  </div>
                  <div className="text-center">
                    <p className={`text-3xl sm:text-5xl font-black whitespace-nowrap ${isW && scored && siteTheme === 'grade' ? 'electric' : ''}${T.shimmer ? ' gf-shimmer-text' : ''}`}
                      style={T.shimmer ? undefined : { color: T.accent, textShadow: isW && siteTheme === 'grade' ? undefined : T.glow }}>
                      {scored ? `${myMatchup.score_a} – ${myMatchup.score_b}` : 'VS'}
                    </p>
                    {!scored && <p className="text-[10px] uppercase tracking-[0.3em] mt-1" style={{ color: T.textDim }}>locks in — good luck</p>}
                  </div>
                  <div className="text-center" style={{ opacity: scored && !bWins ? 0.55 : 1 }}>
                    <p className="text-lg sm:text-2xl font-black truncate px-2" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{nameOf(myMatchup.user_b)}</p>
                    <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: T.textDim }}>Season: {seasonTotals.get(myMatchup.user_b) ?? 0} pts</p>
                    {bWins && <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1" style={{ color: '#3FBF63' }}>Winner</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 mb-12">
                <TeamCard title={nameOf(myMatchup.user_a)} slots={lineupA?.lineup_slots ?? []} T={T} winner={!!aWins} pointsByPlayer={pointsByPlayer} pointsRoundLabel={pointsRoundNumber != null ? `Rd ${pointsRoundNumber} Pts` : null} />
                <TeamCard title={nameOf(myMatchup.user_b)} slots={lineupB?.lineup_slots ?? []} T={T} winner={!!bWins} pointsByPlayer={pointsByPlayer} pointsRoundLabel={pointsRoundNumber != null ? `Rd ${pointsRoundNumber} Pts` : null} />
              </div>
            </>
          )}
          {round && user && !myMatchup && (
            <p className="text-sm text-center mb-12" style={{ color: T.textDim }}>
              No matchup for your team in Round {round.round_number} — you&apos;ll be drawn in when the next round locks.
            </p>
          )}
          {round && otherMatchups.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
              <div style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '16px 28px' }}>
                <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: T.text }}>
                  {myMatchup ? 'Around the Grounds' : 'All Matchups'}
                </span>
              </div>
              {otherMatchups.map((m, i) => (
                <div key={i} className="flex items-center gap-4" style={{ borderBottom: '1px solid #ffffff08', padding: '16px 28px' }}>
                  <p className="flex-1 text-sm font-bold text-right truncate" style={{ color: T.text }}>{nameOf(m.user_a)}</p>
                  <span className="px-3 text-xs font-black whitespace-nowrap shrink-0" style={{ color: T.accent }}>
                    {m.score_a != null && m.score_b != null ? `${m.score_a} – ${m.score_b}` : 'vs'}
                  </span>
                  <p className="flex-1 text-sm font-bold truncate" style={{ color: T.text }}>{nameOf(m.user_b)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <PageGuide pageKey="matchups" accent={T.accent} textColor={T.text} steps={[
        {
          title: 'Head to Head',
          body: "Every round you're drawn against another team — highest points on the weekend wins the matchup. Wins build your record on the H2H standings.",
        },
        {
          title: 'When your matchup appears',
          body: "The draw happens when lineups lock, not when the round opens. While a round is open you'll see how the last one finished — that's your window to set your lineup.",
        },
        {
          title: 'The two lineups',
          body: "Your card against theirs, player by player, with each player's round points once games are scored. Scroll down for every other matchup around the grounds.",
        },
      ]} />
      <Footer />
    </main>
  )
}