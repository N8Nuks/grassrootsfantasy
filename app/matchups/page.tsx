import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'

const THEMES = {
  mens: { accent: '#3FBF63', headerBg: '#1A2E1F' },
  womens: { accent: '#4D7FFF', headerBg: '#10214D' },
}

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

function TeamCard({ title, slots, accent, carried }: { title: string; slots: SlotRow[]; accent: string; carried: boolean }) {
  const sorted = slots.filter(s => !s.slot.startsWith('RES'))
    .sort((a, b) => slotRank(a.slot) - slotRank(b.slot))
  return (
    <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: '#181510', border: '1px solid #ffffff12' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #ffffff0a' }}>
        <p className="text-xs font-black uppercase tracking-[0.25em] truncate" style={{ color: accent }}>{title}</p>
        {carried && <span className="text-[9px] uppercase tracking-widest" style={{ color: '#F5F1E840' }}>Carried forward</span>}
      </div>
      {sorted.map((s, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-2.5" style={{ borderBottom: '1px solid #ffffff08' }}>
          <span className="w-14 text-[10px] font-black uppercase" style={{ color: '#F5F1E850' }}>{slotLabel(s.slot)}</span>
          <span className="flex-1 text-sm font-bold text-[#F5F1E8] truncate">
            {s.cards?.players?.full_name ?? '—'}
          </span>
          {s.batting_order != null && (
            <span className="text-[10px] font-black" style={{ color: '#F5F1E840' }}>#{s.batting_order}</span>
          )}
        </div>
      ))}
      {sorted.length === 0 && <p className="px-5 py-8 text-sm text-center text-[#F5F1E8]/40">No team yet.</p>}
    </div>
  )
}

export default async function Matchups({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade = params.grade === 'womens' ? 'womens' : 'mens'
  const T = THEMES[grade]

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

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '130px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: T.accent }}>
              {round ? `Round ${round.round_number} Matchups` : 'Matchups'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              {grade === 'mens' ? "Men's" : "Women's"} Head to Head
            </h1>
            <div className="flex justify-center gap-2">
              <a href="/matchups?grade=mens"
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={grade === 'mens' ? { color: '#141210', background: '#3FBF63' } : { color: '#F5F1E860', border: '1px solid #ffffff20' }}>
                Men&apos;s
              </a>
              <a href="/matchups?grade=womens"
                className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all"
                style={grade === 'womens' ? { color: '#141210', background: '#4D7FFF' } : { color: '#F5F1E860', border: '1px solid #ffffff20' }}>
                Women&apos;s
              </a>
            </div>
          </div>

          {!round && (
            <p className="text-sm text-center text-[#F5F1E8]/40">Matchups appear once the first round locks.</p>
          )}

          {round && myMatchup && (
            <>
              <div className="flex items-center justify-center gap-4 mb-8">
                <p className="text-lg font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{nameOf(myMatchup.user_a)}</p>
                <span className="text-2xl font-black" style={{ color: T.accent }}>
                  {myMatchup.score_a != null && myMatchup.score_b != null
                    ? `${myMatchup.score_a} – ${myMatchup.score_b}` : 'vs'}
                </span>
                <p className="text-lg font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>{nameOf(myMatchup.user_b)}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 mb-12">
                <TeamCard title={nameOf(myMatchup.user_a)} slots={lineupA?.lineup_slots ?? []} accent={T.accent} carried={isCarried(lineupA)} />
                <TeamCard title={nameOf(myMatchup.user_b)} slots={lineupB?.lineup_slots ?? []} accent={T.accent} carried={isCarried(lineupB)} />
              </div>
            </>
          )}

          {round && user && !myMatchup && (
            <p className="text-sm text-center text-[#F5F1E8]/40 mb-12">No matchup for your team this round.</p>
          )}

          {round && allMatchups.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#181510', border: '1px solid #ffffff12' }}>
              <div className="px-6 py-4" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a' }}>
                <span className="text-xs font-black uppercase tracking-[0.25em] text-[#F5F1E8]">All Matchups</span>
              </div>
              {allMatchups.map((m, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid #ffffff08' }}>
                  <p className="flex-1 text-sm font-bold text-[#F5F1E8] text-right truncate">{nameOf(m.user_a)}</p>
                  <span className="px-3 text-xs font-black whitespace-nowrap" style={{ color: T.accent }}>
                    {m.score_a != null && m.score_b != null ? `${m.score_a} – ${m.score_b}` : 'vs'}
                  </span>
                  <p className="flex-1 text-sm font-bold text-[#F5F1E8] truncate">{nameOf(m.user_b)}</p>
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