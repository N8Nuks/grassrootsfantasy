import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import GradeSwitch from '@/components/GradeSwitch'
import { slotPoints, StatLine, PointValues } from '@/lib/scoring'
import LineupClient, { PuzzleCard } from './LineupClient'
import type { Grade } from '@/lib/clubhouse'

const SCORING_SLOTS = ['P','C','B1','B2','B3','SS','LF','CF','RF','DP','PB','DR']

/* The hand is drawn from the round id plus a deal number, so everyone opening
   the same grade sees the same sixteen — and "new hand" simply advances the
   deal, giving a fresh set that is still reproducible. */
function seeded(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return () => { h = (h * 1103515245 + 12345) >>> 0; return h / 4294967296 }
}

export default async function LineupPuzzle({ searchParams }: {
  searchParams: Promise<{ grade?: string; deal?: string }>
}) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'
  const deal = Math.max(0, Math.min(999, Number(params.deal ?? 0) || 0))
  const gradeLabel = grade === 'womens' ? "Women's" : "Men's"

  const supabase = await createClient()

  const { data: round } = await supabase.from('rounds')
    .select('id, round_number')
    .eq('grade', grade)
    .in('status', ['provisional', 'confirmed'])
    .order('round_number', { ascending: false }).limit(1).maybeSingle()

  if (!round) {
    return <Shell grade={grade}>
      <p className="text-sm text-center text-white/60" style={{ paddingTop: '20px' }}>
        No {gradeLabel} round has been scored yet — try the other grade.
      </p>
    </Shell>
  }

  const [{ data: stats }, { data: config }] = await Promise.all([
    supabase.from('player_stats').select('player_id, raw').eq('round_id', round.id),
    supabase.from('scoring_config').select('values').eq('grade', grade).single(),
  ])
  if (!stats?.length || !config) {
    return <Shell grade={grade}><p className="text-sm text-center text-white/60" style={{ paddingTop: '20px' }}>Round data is still being prepared.</p></Shell>
  }
  const v = config.values as PointValues

  const ids = stats.map(s => s.player_id)
  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, tier, positions, photo_url, clubs(name)')
    .in('id', ids)
    .eq('active', true)
    .or('is_under18.eq.false,has_consent.eq.true')

  type Row = { id: string; full_name: string; tier: string; positions: string[]; photo_url: string | null; clubs: { name: string } | null }
  const byId = new Map(((players ?? []) as unknown as Row[]).map(p => [p.id, p]))
  const lineFor = new Map(stats.map(s => [s.player_id, s.raw as StatLine]))

  const candidates = ids.filter(id => byId.has(id))
  if (candidates.length < 20) {
    return <Shell grade={grade}><p className="text-sm text-center text-white/60" style={{ paddingTop: '20px' }}>Not enough players in this round to build a puzzle.</p></Shell>
  }

  // Draw sixteen, then check the set can legally fill all twelve slots —
  // an unsolvable hand is a broken puzzle, not a hard one.
  const rand = seeded(`${round.id}-${deal}`)
  let hand: string[] = []
  for (let attempt = 0; attempt < 60; attempt++) {
    const shuffled = [...candidates].sort(() => rand() - 0.5)
    const pick = shuffled.slice(0, 16)
    const covers = (slot: string) => pick.some(id => {
      const pos = byId.get(id)!.positions ?? []
      return slot === 'DP' || slot === 'DR' || pos.includes(slot)
    })
    if (SCORING_SLOTS.every(covers)) { hand = pick; break }
  }
  if (hand.length === 0) hand = candidates.slice(0, 16)

  const cards: PuzzleCard[] = hand.map(id => {
    const p = byId.get(id)!
    const line = lineFor.get(id) ?? {}
    // What this card is worth in every slot it could legally take
    const worth: Record<string, number> = {}
    for (const s of SCORING_SLOTS) {
      const eligible = s === 'DP' || s === 'DR' || (p.positions ?? []).includes(s)
      if (eligible) worth[s] = slotPoints(s, line, v)
    }
    return {
      id,
      name: p.full_name,
      club: p.clubs?.name ?? '',
      tier: p.tier,
      positions: p.positions ?? [],
      photoUrl: p.photo_url,
      worth,
    }
  })

  return (
    <Shell grade={grade}>
      <LineupClient
        key={`${grade}-${deal}`}
        cards={cards}
        roundNumber={round.round_number}
        grade={gradeLabel}
        nextDealHref={`/games/lineup?grade=${grade}&deal=${deal + 1}`}
      />
    </Shell>
  )
}

function Shell({ grade, children }: { grade: Grade; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />
      <section className="relative flex-1 px-5 sm:px-12 overflow-hidden" style={{ paddingTop: '76px', paddingBottom: '80px' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 45% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10" style={{ maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto' }}>
          <a href="/games" className="inline-block text-[11px] font-bold uppercase tracking-widest"
            style={{ color: '#ffffff60', marginBottom: '18px' }}>← Games</a>
          <div className="flex justify-center" style={{ marginBottom: '26px' }}>
            <GradeSwitch grade={grade}
              mensHref="/games/lineup?grade=mens"
              womensHref="/games/lineup?grade=womens" />
          </div>
          {children}
        </div>
      </section>
      <Footer />
    </main>
  )
}