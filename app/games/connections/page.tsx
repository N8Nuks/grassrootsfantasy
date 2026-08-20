import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import ConnectionsClient, { Group } from './ConnectionsClient'

const NEON = '#7DF9FF'

/* One puzzle a day, the same for everyone, seeded from the date in Auckland. */
function daySeed(): number {
  const nz = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
  let h = 0
  for (let i = 0; i < nz.length; i++) h = (h * 31 + nz.charCodeAt(i)) >>> 0
  return h
}
function seeded(n: number) {
  let h = n >>> 0
  return () => { h = (h * 1103515245 + 12345) >>> 0; return h / 4294967296 }
}

type Row = {
  id: string; full_name: string; grade: string; tier: string; positions: string[]
  stats: Record<string, number> | null
  clubs: { name: string } | null
}

export default async function Connections() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, grade, tier, positions, stats, clubs(name)')
    .eq('active', true)
    .or('is_under18.eq.false,has_consent.eq.true')

  const pool = ((players ?? []) as unknown as Row[])
    .filter(p => p.full_name)
    .sort((a, b) => a.id.localeCompare(b.id))

  /* Candidate categories, each with the players who satisfy it. The puzzle
     picks four that don't overlap, which is what stops a name belonging in
     two groups at once. */
  const candidates: { label: string; members: Row[] }[] = []

  const clubs = [...new Set(pool.map(p => p.clubs?.name).filter(Boolean))] as string[]
  for (const c of clubs) {
    for (const g of ['mens', 'womens']) {
      const m = pool.filter(p => p.clubs?.name === c && p.grade === g)
      if (m.length >= 5) candidates.push({ label: `${c} · ${g === 'mens' ? "Men's" : "Women's"}`, members: m })
    }
  }
  const posGroups: [string, (p: Row) => boolean][] = [
    ['Pitchers', p => (p.positions ?? []).includes('P')],
    ['Catchers', p => (p.positions ?? []).includes('C')],
    ['Outfielders only', p => {
      const s = new Set(p.positions ?? [])
      return ['LF','CF','RF'].some(x => s.has(x)) && !['B1','B2','B3','SS','P','C'].some(x => s.has(x))
    }],
    ['Two-way players', p => p.tier.startsWith('rare')],
    ['Elite tier', p => p.tier === 'elite'],
  ]
  for (const [label, test] of posGroups) {
    const m = pool.filter(test)
    if (m.length >= 5) candidates.push({ label, members: m })
  }
  const statGroups: [string, (p: Row) => boolean][] = [
    ['Hit a home run this season', p => (p.stats?.season_hr ?? 0) > 0],
    ['Stole a base this season', p => (p.stats?.season_sb ?? 0) > 0],
    ['Batting over .400', p => (p.stats?.season_ba ?? 0) >= 0.4],
    ['100+ fantasy points', p => (p.stats?.season_points ?? 0) >= 100],
  ]
  for (const [label, test] of statGroups) {
    const m = pool.filter(test)
    if (m.length >= 5) candidates.push({ label, members: m })
  }

  // Build four groups of four with no player appearing twice
  const rand = seeded(daySeed())
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => rand() - 0.5)

  let groups: Group[] = []
  for (let attempt = 0; attempt < 300 && groups.length < 4; attempt++) {
    groups = []
    const used = new Set<string>()
    for (const cand of shuffle(candidates)) {
      if (groups.length >= 4) break
      const free = shuffle(cand.members.filter(m => !used.has(m.id)))
      if (free.length < 4) continue
      const four = free.slice(0, 4)
      four.forEach(m => used.add(m.id))
      groups.push({ label: cand.label, names: four.map(m => m.full_name) })
    }
  }

  return (
    <ArcadeShell neon={NEON} eyebrow="Daily · Four of a kind" title="Connections">
      {groups.length < 4
        ? <p style={{ color: '#8FA0B4', fontSize: '13px' }}>
            Not enough to build today&apos;s puzzle — this one fills out as the season goes.
          </p>
        : <ConnectionsClient groups={groups} />}
    </ArcadeShell>
  )
}