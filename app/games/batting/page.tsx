import ArcadeShell from '@/components/ArcadeShell'
import LegendsClient, { Legend } from './BattingClient'
import { HONOURS } from '@/lib/nfsHonours'

const NEON = '#B47CFF'

/* The cage is stocked from the Honours Board, so players who finished years ago
   still get to stand in it. Titles won stand in for the stats we don't have —
   more batting titles is a better eye, more pitching titles a better arm. */
const BAT_KEYS = ['batting', 'bat_ave', 'batting_champion', 'top_bat']
const PIT_KEYS = ['pitching', 'era', 'pitching_champion', 'top_pitcher', 'mvp_pitcher']

function tally(grade: 'men' | 'women', keys: string[]) {
  const counts = new Map<string, number>()
  for (const s of HONOURS) {
    for (const [key, winner] of Object.entries(s[grade])) {
      if (!winner) continue
      if (!keys.some(k => key.toLowerCase().includes(k))) continue
      counts.set(winner as string, (counts.get(winner as string) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function build(keys: string[]): Legend[] {
  const out: Legend[] = []
  for (const grade of ['men', 'women'] as const) {
    for (const [name, titles] of tally(grade, keys).slice(0, 5)) {
      out.push({ name, titles, grade: grade === 'men' ? 'M' : 'W' })
    }
  }
  return out.sort((a, b) => b.titles - a.titles)
}

export default function LegendsCage() {
  const batters = build(BAT_KEYS)
  const pitchers = build(PIT_KEYS)

  if (batters.length < 2 || pitchers.length < 2) {
    return (
      <ArcadeShell neon={NEON} eyebrow="Arcade · The archive" title="Legends Cage">
        <p style={{ color: '#8FA0B4', fontSize: '13px' }}>
          Not enough on the Honours Board to stock the cage yet.
        </p>
      </ArcadeShell>
    )
  }

  return (
    <ArcadeShell neon={NEON} eyebrow="Arcade · The archive" title="Legends Cage">
      <LegendsClient batters={batters} pitchers={pitchers} />
    </ArcadeShell>
  )
}