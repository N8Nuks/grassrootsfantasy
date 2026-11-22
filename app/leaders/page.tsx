import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import LeadersClient, { type LeaderCat, type LeaderPlayer } from './LeadersClient'

/* `empty` is what a board says once the season is under way but nobody is on
   it yet — a rare stat (a women's home run) reads as a race, not a blank.
   Order runs points → power → hits → speed → average, then the pitching pair. */
const SEASON_CATS: LeaderCat[] = [
  { key: 'season_points', label: 'Fantasy Points', empty: ['No points on the board yet.', 'The first scores land when the round is scored.'] },
  { key: 'season_hr', label: 'Home Runs', empty: ['The first home run of the season is still out there.', 'Whoever hits it tops this board.'] },
  { key: 'season_rbi', label: 'RBI', empty: ['The first RBI of the season is still out there.', 'Whoever drives in a run tops this board.'] },
  { key: 'season_hits', label: 'Hits', empty: ['The first hit of the season is still out there.', 'Whoever gets it tops this board.'] },
  { key: 'season_2b', label: 'Doubles', empty: ['The first double of the season is still out there.', 'Whoever hits it tops this board.'] },
  { key: 'season_3b', label: 'Triples', empty: ['The first triple of the season is still out there.', 'Whoever legs one out tops this board.'] },
  { key: 'season_sb', label: 'Stolen Bases', empty: ['The first stolen base of the season is still out there.', 'Whoever swipes one tops this board.'] },
  { key: 'season_ba', label: 'Batting Average', format: 'ba', empty: ['No batting averages yet.', 'The board fills as hitters reach base.'] },
  { key: 'season_wins', label: 'Wins', kind: 'pitching', empty: ['The first win of the season is still out there.', 'Whoever earns it tops this board.'] },
  { key: 'season_k_pit', label: 'Strikeouts', kind: 'pitching', empty: ['The first strikeout of the season is still out there.', 'Whoever rings one up tops this board.'] },
]

/* Round boards read that round's stat line (player_stats.raw) and points
   (player_scores). Hits stands in for batting average — one round is too few
   at-bats for an average to mean anything — and Wins is left off because every
   winning pitcher sits on 1. */
function roundCats(n: number): LeaderCat[] {
  const empty: [string, string] = [`Nothing on this board for Round ${n}.`, 'It fills when the round is scored.']
  return [
    { key: 'r_points', label: 'Fantasy Points', empty },
    { key: 'r_hr', label: 'Home Runs', empty },
    { key: 'r_rbi', label: 'RBI', empty },
    { key: 'r_hits', label: 'Hits', empty },
    { key: 'r_2b', label: 'Doubles', empty },
    { key: 'r_3b', label: 'Triples', empty },
    { key: 'r_sb', label: 'Stolen Bases', empty },
    { key: 'r_runs', label: 'Runs Scored', empty },
    { key: 'r_wins', label: 'Wins', kind: 'pitching', empty },
    { key: 'r_k_pit', label: 'Strikeouts', kind: 'pitching', empty },
  ]
}

type View = 'season' | 'round'
const href = (grade: Grade, view: View, round?: number) =>
  `/leaders?grade=${grade}${view === 'round' ? `&view=round${round ? `&round=${round}` : ''}` : ''}`

const num = (v: unknown) => Number(v ?? 0) || 0

export default async function Leaders({ searchParams }: { searchParams: Promise<{ grade?: string; view?: string; round?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let siteTheme = 'grade'
  let ownedPlayerIds: string[] = []
  if (user) {
    const [{ data: prof }, { data: myCards }] = await Promise.all([
      supabase.from('profiles').select('site_theme').eq('id', user.id).single(),
      supabase.from('cards').select('player_id').eq('owner_id', user.id),
    ])
    siteTheme = (prof as unknown as { site_theme?: string })?.site_theme ?? 'grade'
    ownedPlayerIds = (myCards ?? []).map(c => c.player_id)
  }
  const T = theme(grade, siteTheme)

  /* Every scored round for the grade, oldest first — the round picker, and
     the season has started once there is at least one. */
  const { data: roundRows } = await supabase.from('rounds')
    .select('id, round_number, status').eq('grade', grade)
    .in('status', ['provisional', 'confirmed', 'catchup'])
    .order('round_number', { ascending: true })
  type RoundRow = { id: string; round_number: number; status: string }
  const allRounds = (roundRows ?? []) as RoundRow[]
  /* A non-scoring round (rained off for GF, e.g. Round 5) still has player
     scores and stats, so it is in the round picker like any other. It just
     gave user teams nothing. A catch-up twin (stored as the negative of its
     round number) holds a scored round's late game: it is not a round of its
     own, and its lines are added to its round's board and the season totals. */
  const rounds = allRounds.filter(r => r.round_number > 0)
  const twinOf = (n: number) => allRounds.find(r => r.round_number === -n) ?? null
  // Catch-up games (postponed and replayed later) count in the season totals
  const catchupIds = allRounds.filter(r => r.status === 'catchup').map(r => r.id)
  // The latest round that counted for user teams: the default round view
  const scoredRounds = rounds.filter(r => r.status !== 'catchup')
  const latest = scoredRounds.length ? scoredRounds[scoredRounds.length - 1] : null
  const seasonStarted = scoredRounds.length > 0

  const view: View = params.view === 'round' && latest ? 'round' : 'season'
  const wanted = Number(params.round)
  const roundRow = view === 'round' ? (rounds.find(r => r.round_number === wanted) ?? latest) : null

  const [{ data: players }, { data: styleRow }] = await Promise.all([
    supabase
      .from('players')
      .select('id, full_name, tier, positions, badges, speed_star, stats, photo_url, playing_number, reveal_pos, clubs(name)')
      .eq('grade', grade).eq('active', true).or('is_under18.eq.false,has_consent.eq.true'),
    supabase.from('site_settings').select('value').eq('key', 'card_style').maybeSingle(),
  ])
  const cardStyle = (styleRow?.value ?? 'premium') as 'standard' | 'premium'

  type Row = {
    id: string; full_name: string; tier: string; positions: string[] | null; badges: string[] | null
    speed_star: boolean | null; stats: Record<string, number> | null; photo_url: string | null
    playing_number: number | null; reveal_pos: string | null; clubs: { name: string } | null
  }
  const all: LeaderPlayer[] = ((players ?? []) as unknown as Row[]).map(p => ({
    id: p.id,
    name: p.full_name,
    tier: p.tier,
    positions: p.positions ?? [],
    club: p.clubs?.name ?? '',
    playingNumber: p.playing_number,
    speedStar: !!p.speed_star,
    badges: p.badges ?? [],
    stats: p.stats ?? {},
    photoUrl: p.photo_url,
    revealPos: p.reveal_pos ?? null,
  }))

  /* Hits, doubles and triples aren't kept as season keys on the player, so
     the season boards total the round lines across every scored round. */
  let teamGames = 0
  if (view === 'season' && rounds.length) {
    const { data: lines } = await supabase.from('player_stats')
      .select('player_id, raw').in('round_id', [...new Set([...rounds.map(r => r.id), ...catchupIds])])
    const tot = new Map<string, { h: number; d: number; t: number; ab: number; g: number }>()
    for (const l of lines ?? []) {
      const r = (l.raw ?? {}) as Record<string, unknown>
      const cur = tot.get(l.player_id) ?? { h: 0, d: 0, t: 0, ab: 0, g: 0 }
      const d = num(r.doubles), t = num(r.triples)
      // A row is a game; gp overrides when the scorer gives it (2 for a double-header)
      const g = r.gp != null && r.gp !== '' ? num(r.gp) : 1
      tot.set(l.player_id, {
        h: cur.h + num(r.singles) + d + t + num(r.hr), d: cur.d + d, t: cur.t + t,
        ab: cur.ab + num(r.ab), g: cur.g + g,
      })
    }
    for (const p of all) {
      const x = tot.get(p.id)
      if (x) p.stats = { ...p.stats, season_hits: x.h, season_2b: x.d, season_3b: x.t, season_ab: x.ab }
    }
    /* Batting average qualifier: 1 at-bat per team game. Team games is the most
       games any player in the grade has played, so the bar rises with the season. */
    for (const x of tot.values()) teamGames = Math.max(teamGames, x.g)
  }
  const minAb = teamGames
  const seasonCats: LeaderCat[] = SEASON_CATS.map(c => c.key === 'season_ba' && minAb > 0
    ? { ...c, min: { key: 'season_ab', value: minAb }, note: `Min. ${minAb} AB` }
    : c)

  /* Round view: merge the round's line and points into each player's stats
     under r_* keys. Season keys are untouched, so an opened card still reads
     its season figures. */
  if (roundRow) {
    const twin = twinOf(roundRow.round_number)
    const ids = twin ? [roundRow.id, twin.id] : [roundRow.id]
    const [{ data: lines }, { data: scores }] = await Promise.all([
      supabase.from('player_stats').select('player_id, raw').in('round_id', ids),
      supabase.from('player_scores').select('player_id, points').in('round_id', ids),
    ])
    const byId = new Map<string, Record<string, number>>()
    const add = (id: string, line: Record<string, number>) => {
      const cur = byId.get(id) ?? {}
      for (const k of Object.keys(line)) cur[k] = (cur[k] ?? 0) + line[k]
      byId.set(id, cur)
    }
    for (const l of lines ?? []) {
      const r = (l.raw ?? {}) as Record<string, unknown>
      add(l.player_id, {
        r_hr: num(r.hr), r_rbi: num(r.rbi), r_sb: num(r.sb), r_runs: num(r.runs), r_k_pit: num(r.k_pit),
        r_2b: num(r.doubles), r_3b: num(r.triples), r_wins: num(r.win),
        r_hits: num(r.singles) + num(r.doubles) + num(r.triples) + num(r.hr),
      })
    }
    for (const s of scores ?? []) add(s.player_id, { r_points: num(s.points) })
    for (const p of all) {
      const r = byId.get(p.id)
      if (r) p.stats = { ...p.stats, ...r }
    }
  }

  /* Milestones and new longevity badges from the latest scored round, by player —
     same ribbon the Athlete Hall card wears. */
  const milestones: Record<string, { stat: string; milestone: number }[]> = {}
  if (latest) {
    const ids = new Set(all.map(p => p.id))
    const { data: msRows } = await supabase.from('milestones')
      .select('player_id, stat, milestone')
      .eq('grade', grade).eq('round_number', latest.round_number)
      .order('milestone', { ascending: false })
    for (const m of msRows ?? []) {
      if (!ids.has(m.player_id)) continue
      if (!milestones[m.player_id]) milestones[m.player_id] = []
      milestones[m.player_id].push({ stat: m.stat, milestone: Number(m.milestone) })
    }
    for (const id of Object.keys(milestones)) {
      milestones[id].sort((a, b) =>
        (a.stat === 'longevity' ? 1 : 0) - (b.stat === 'longevity' ? 1 : 0))
    }
  }

  const pill = (on: boolean) => ({
    fontSize: '10px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
    borderRadius: '999px', padding: '8px 16px', textDecoration: 'none',
    color: on ? T.field : T.accent, background: on ? T.accent : 'transparent',
    border: `1px solid ${T.accent}${on ? '' : '70'}`,
  })

  const eyebrow = roundRow
    ? `Round ${roundRow.round_number} · ${roundRow.status === 'catchup' ? 'Player scores only' : roundRow.status === 'confirmed' ? 'Confirmed' : 'Provisional'}`
    : '2026/27 Season'

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '90px' }}>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: T.accent }}>{eyebrow}</p>
            <h1 className="text-3xl sm:text-4xl font-black mb-4" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>
              {grade === 'mens' ? "Men's" : "Women's"} League Leaders
            </h1>
            {(roundRow ?? latest)?.status === 'provisional' && (
              <p className="text-[11px]" style={{ color: T.textDim, marginBottom: '14px' }}>
                Provisional scores. May change if official stats are corrected. Confirmed scores Tuesday 5pm.
              </p>
            )}
            {roundRow?.status === 'catchup' && (
              <p className="text-[11px]" style={{ color: T.textDim, marginBottom: '14px' }}>
                Round {roundRow.round_number} did not count for user teams. These are the players&apos; own scores and stats.
              </p>
            )}
            <div className="flex justify-center">
              <GradeSwitch grade={grade}
                mensHref={href('mens', view, roundRow?.round_number)}
                womensHref={href('womens', view, roundRow?.round_number)}
                palette={siteTheme !== 'grade' ? T : undefined} />
            </div>

            {seasonStarted && (
              <div className="flex flex-wrap items-center justify-center gap-2" style={{ marginTop: '18px' }}>
                <a href={href(grade, 'season')} style={pill(view === 'season')}>Season</a>
                <a href={href(grade, 'round')} style={pill(view === 'round')}>Round</a>
                {view === 'round' && (
                  <span className="flex flex-wrap items-center justify-center gap-2" style={{ marginLeft: '8px' }}>
                    {rounds.map(r => (
                      <a key={r.id} href={href(grade, 'round', r.round_number)}
                        style={{ ...pill(r.round_number === roundRow?.round_number), padding: '8px 12px' }}>
                        R{r.round_number}
                      </a>
                    ))}
                  </span>
                )}
              </div>
            )}
          </div>

          <LeadersClient
            cats={roundRow ? roundCats(roundRow.round_number) : seasonCats}
            players={all}
            grade={grade}
            siteTheme={siteTheme}
            seasonStarted={seasonStarted}
            ownedPlayerIds={ownedPlayerIds}
            cardStyle={cardStyle}
            milestones={milestones}
          />
        </div>
      </section>
      <Footer />
    </main>
  )
}