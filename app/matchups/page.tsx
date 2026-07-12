import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'

const SLOT_ORDER = ['P', 'C', 'B1', 'B2', 'B3', 'SS', 'LF', 'CF', 'RF', 'DP', 'PB', 'DR',
  'BENCH1', 'BENCH2', 'BENCH3', 'BENCH4']
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B' }
const slotRank = (s: string) => {
  const i = SLOT_ORDER.indexOf(s)
  return i === -1 ? 999 : i
}
const slotLabel = (s: string) => SLOT_LABELS[s] ?? s

type SlotRow = {
  slot: string
  batting_order: number | null
  cards: { players: { full_name: string } | null } | null
}
type LineupRec = {
  id: string
  owner_id: string
  rounds: { round_number: number }
  lineup_slots: SlotRow[]
}
type Palette = ReturnType<typeof theme>

function TeamCard({ title, slots, T, carried }: { title: string; slots: SlotRow[]; T: Palette; carried: boolean }) {
  const sorted = slots.filter(s => !s.slot.startsWith('RES'))
    .sort((a, b) => slotRank(a.slot) - slotRank(b.slot))
  return (
    <div className="flex-1 rounded-2xl overflow-hidden pinstripe" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
      <div className="flex items-center justify-between" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '12px 24px' }}>
        <p className="text-xs font-black uppercase tracking-[0.2em] truncate" style={{ color: T.accent }}>{title}</p>
        {carried && <span className="text-[9px] uppercase tracking-widest shrink-0" style={{ color: T.textDim }}>Carried forward</span>}
      </div>
      {sorted.map((s, i) => (
        <div key={i} className="flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff08', padding: '10px 24px' }}>
          <span className="w-14 text-[10px] font-black uppercase shrink-0" style={{ color: T.textDim }}>{slotLabel(s.slot)}</span>
          <span className="flex-1 text-sm font-bold truncate" style={{ color: T.text }}>
            {s.cards?.players?.full_name ?? '—'}
          </span>
          {s.batting_order != null && (
            <span className="text-[10px] font-black shrink-0" style={{ color: T.textDim }}>#{s.batting_order}</span>
          )}
        </div>
      ))}
      {sorted.length === 0 && <p className="text-sm text-center" style={{ color: T.textDim, padding: '32px 24px' }}>No team yet.</p>}
    </div>
  )
}

export default async function Matchups({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'
  const T = theme(grade)
  const isW = grade === 'womens'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: round } = await supabase
    .from('rounds').select('id, round_number, lock_at')
    .eq('grade', grade).lte('lock_at', new Date().toISOString())
    .order('round_number', { ascending: false }).limit(1).maybeSingle()

  type Matchup = { user_a: string; user_b: string; score_a: number | null; score_b: number | null }
  let myMatchup: Matchup | null = null
  let allMatchups: Matchup[] = []
  let lineupA: LineupRec | null = null
  let lineupB: LineupRec | null = null

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
    }
  }

  const { data: teams } = await supabase.from('public_teams').select('id, team_name')
  const nameOf = (id: string) =>
    (teams ?? []).find(t => t.id === id)?.team_name ?? 'Unknown team'
  const isCarried = (l: LineupRec | null) =>
    !!l && !!round && l.rounds.round_number < round.round_number

  const gradeTab = (active: boolean, accent: string) =>
    active
      ? { color: '#0E0B08', background: accent }
      : { color: T.textDim, border: '1px solid #ffffff20' }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '130px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: T.accent }}>
              {round ? `Round ${round.round_number} Matchups` : 'Matchups'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black mb-4" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>
              {grade === 'mens' ? "Men's" : "Women's"} Head to Head
            </h1>
            <div className="flex justify-center gap-2">
              <a href="/matchups?grade=mens"
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={gradeTab(grade === 'mens', '#FFC425')}>
                Men&apos;s
              </a>
              <a href="/matchups?grade=womens"
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={gradeTab(grade === 'womens', '#4D7FFF')}>
                Women&apos;s
              </a>
            </div>
          </div>

          {!round && (
            <p className="text-sm text-center" style={{ color: T.textDim }}>Matchups appear once the first round locks.</p>
          )}

          {round && myMatchup && (
            <>
              <div className="flex items-center justify-center gap-5 mb-8 flex-wrap">
                <p className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{nameOf(myMatchup.user_a)}</p>
                <span className={`text-2xl font-black ${isW && myMatchup.score_a != null ? 'electric' : ''}`}
                  style={{ color: T.accent, textShadow: isW ? undefined : T.glow }}>
                  {myMatchup.score_a != null && myMatchup.score_b != null
                    ? `${myMatchup.score_a} – ${myMatchup.score_b}` : 'vs'}
                </span>
                <p className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{nameOf(myMatchup.user_b)}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 mb-12">
                <TeamCard title={nameOf(myMatchup.user_a)} slots={lineupA?.lineup_slots ?? []} T={T} carried={isCarried(lineupA)} />
                <TeamCard title={nameOf(myMatchup.user_b)} slots={lineupB?.lineup_slots ?? []} T={T} carried={isCarried(lineupB)} />
              </div>
            </>
          )}

          {round && user && !myMatchup && (
            <p className="text-sm text-center mb-12" style={{ color: T.textDim }}>No matchup for your team this round.</p>
          )}

          {round && allMatchups.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
              <div style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '16px 28px' }}>
                <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: T.text }}>All Matchups</span>
              </div>
              {allMatchups.map((m, i) => (
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
