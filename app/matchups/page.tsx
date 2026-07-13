import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'

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

function TeamCard({ title, slots, T, winner, pointsByPlayer }: {
  title: string
  slots: SlotRow[]
  T: Palette
  winner: boolean
  pointsByPlayer: Map<string, number> | null
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
          <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: T.textDim, paddingRight: '16px' }}>Points</span>
        )}
      </div>
      {sorted.map((s, i) => {
        const pid = s.cards?.player_id
        const pts = pointsByPlayer && pid ? pointsByPlayer.get(pid) : undefined
        return (
          <div key={i} className="flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff08', padding: '10px 24px' }}>
            <span className="w-12 text-[10px] font-black uppercase shrink-0" style={{ color: T.textDim }}>{slotLabel(s.slot)}</span>
            <span className="flex-1 min-w-0 text-sm font-bold truncate" style={{ color: T.text }}>
              {s.batting_order != null && (
                <span className="text-[10px] font-black mr-2" style={{ color: T.textDim }}>{s.batting_order}.</span>
              )}
              {s.cards?.players?.full_name ?? '—'}
            </span>
            {pts != null && (
              <span className="w-14 text-right text-sm font-black shrink-0" style={{ color: T.accent, paddingRight: '16px' }}>{pts}</span>
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

  let siteTheme = 'grade'
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('site_theme').eq('id', user.id).single()
    siteTheme = (prof as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  }
  const T = theme(grade, siteTheme)

  const { data: round } = await supabase
    .from('rounds').select('id, round_number, lock_at')
    .eq('grade', grade).lte('lock_at', new Date().toISOString())
    .order('round_number', { ascending: false }).limit(1).maybeSingle()

  type Matchup = { user_a: string; user_b: string; score_a: number | null; score_b: number | null }
  let myMatchup: Matchup | null = null
  let allMatchups: Matchup[] = []
  let lineupA: LineupRec | null = null
  let lineupB: LineupRec | null = null
  let pointsByPlayer: Map<string, number> | null = null

  if (round) {
    await supabase.rpc('pair_round', { p_round_id: round.id })

    const { data: matchups } = await supabase
      .from('matchups').select('user_a, user_b, score_a, score_b')
      .eq('round_id', round.id)
    allMatchups = matchups ?? []
    if (user) myMatchup = allMatchups.find(m => m.user_a === user.id || m.user_b === user.id) ?? null

    if (myMatchup) {
      const { data: lineups } = await supabase
        .from('lineups')
        .select('id, owner_id, rounds!inner(round_number), lineup_slots(slot, batting_order, cards(player_id, players(full_name)))')
        .eq('grade', grade)
        .in('owner_id', [myMatchup.user_a, myMatchup.user_b])
      const rows = ((lineups ?? []) as unknown as LineupRec[])
        .filter(l => l.rounds.round_number <= round.round_number)
      const latest = (owner: string) =>
        rows.filter(l => l.owner_id === owner)
          .sort((a, b) => b.rounds.round_number - a.rounds.round_number)[0] ?? null
      lineupA = latest(myMatchup.user_a)
      lineupB = latest(myMatchup.user_b)

      if (myMatchup.score_a != null) {
        const ids = [...(lineupA?.lineup_slots ?? []), ...(lineupB?.lineup_slots ?? [])]
          .map(s => s.cards?.player_id).filter(Boolean) as string[]
        if (ids.length) {
          const { data: pscores } = await supabase
            .from('player_scores').select('player_id, points')
            .eq('round_id', round.id).in('player_id', ids)
          if (pscores?.length) {
            pointsByPlayer = new Map(pscores.map(p => [p.player_id, Number(p.points)]))
          }
        }
      }
    }
  }

  const { data: teams } = await supabase.from('public_teams').select('id, team_name')
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

          {!round && (
            <p className="text-sm text-center" style={{ color: T.textDim }}>Matchups appear once the first round locks.</p>
          )}

          {round && myMatchup && (
            <>
              {/* Scoreboard banner */}
              <div className="relative rounded-2xl overflow-hidden pinstripe-fine mb-8"
                style={{ background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `1px solid ${T.accent}45` }}>
                <div className="relative z-10 grid grid-cols-3 items-center" style={{ padding: '32px 24px' }}>
                  <div className="text-center" style={{ opacity: scored && !aWins ? 0.55 : 1 }}>
                    <p className="text-lg sm:text-2xl font-black truncate px-2" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{nameOf(myMatchup.user_a)}</p>
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
                    {bWins && <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1" style={{ color: '#3FBF63' }}>Winner</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 mb-12">
                <TeamCard title={nameOf(myMatchup.user_a)} slots={lineupA?.lineup_slots ?? []} T={T} winner={!!aWins} pointsByPlayer={pointsByPlayer} />
                <TeamCard title={nameOf(myMatchup.user_b)} slots={lineupB?.lineup_slots ?? []} T={T} winner={!!bWins} pointsByPlayer={pointsByPlayer} />
              </div>
            </>
          )}

          {round && user && !myMatchup && (
            <p className="text-sm text-center mb-12" style={{ color: T.textDim }}>No matchup for your team this round.</p>
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
      <Footer />
    </main>
  )
}