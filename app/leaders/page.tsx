import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import LeadersClient, { type LeaderCat, type LeaderPlayer } from './LeadersClient'

/* `empty` is what a board says once the season is under way but nobody is on
   it yet — a rare stat (a women's home run) reads as a race, not a blank. */
const CATS: LeaderCat[] = [
  { key: 'season_points', label: 'Fantasy Points', empty: ['No points on the board yet.', 'The first scores land when the round is scored.'] },
  { key: 'season_hr', label: 'Home Runs', empty: ['The first home run of the season is still out there.', 'Whoever hits it tops this board.'] },
  { key: 'season_rbi', label: 'RBI', empty: ['The first RBI of the season is still out there.', 'Whoever drives in a run tops this board.'] },
  { key: 'season_sb', label: 'Stolen Bases', empty: ['The first stolen base of the season is still out there.', 'Whoever swipes one tops this board.'] },
  { key: 'season_ba', label: 'Batting Average', format: 'ba', empty: ['No batting averages yet.', 'The board fills as hitters reach base.'] },
  { key: 'season_wins', label: 'Pitching Wins', empty: ['The first win of the season is still out there.', 'Whoever earns it tops this board.'] },
  { key: 'season_k_pit', label: 'Pitching Strikeouts', empty: ['The first strikeout of the season is still out there.', 'Whoever rings one up tops this board.'] },
]

export default async function Leaders({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
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

  const [{ data: players }, { count: scoredRounds }, { data: styleRow }, { data: scoredRound }] = await Promise.all([
    supabase
      .from('players')
      .select('id, full_name, tier, positions, badges, speed_star, stats, photo_url, playing_number, reveal_pos, clubs(name)')
      .eq('grade', grade).eq('active', true).or('is_under18.eq.false,has_consent.eq.true'),
    // The season has started for this grade once any round is scored
    supabase
      .from('rounds')
      .select('id', { count: 'exact', head: true })
      .eq('grade', grade).in('status', ['provisional', 'confirmed']),
    supabase.from('site_settings').select('value').eq('key', 'card_style').maybeSingle(),
    // Latest scored round, for the milestone ribbons on an opened card
    supabase.from('rounds')
      .select('round_number').eq('grade', grade)
      .in('status', ['provisional', 'confirmed'])
      .order('round_number', { ascending: false }).limit(1).maybeSingle(),
  ])
  const seasonStarted = (scoredRounds ?? 0) > 0
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

  /* Milestones and new longevity badges from the latest scored round, by player —
     same ribbon the Athlete Hall card wears. */
  const milestones: Record<string, { stat: string; milestone: number }[]> = {}
  if (scoredRound) {
    const ids = new Set(all.map(p => p.id))
    const { data: msRows } = await supabase.from('milestones')
      .select('player_id, stat, milestone')
      .eq('grade', grade).eq('round_number', scoredRound.round_number)
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

          <LeadersClient
            cats={CATS}
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