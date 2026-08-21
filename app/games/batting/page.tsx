import ArcadeShell from '@/components/ArcadeShell'
import LegendsClient, { Legend } from './BattingClient'
import { HONOURS } from '@/lib/nfsHonours'

const NEON = '#B47CFF'

/* The cage is stocked from the Honours Board, so players who finished years ago
   still get to stand in it. Titles won stand in for the stats we don't have —
   more Top Batter awards is a better eye, more Top Pitcher awards a better arm. */

/* Hand-picked replacements. Some names belong in the cage on reputation rather
   than title count, and a couple of the tail-enders don't. */
const BATTER_SWAPS: Record<string, string> = {
  'Sina Hunkin': 'Katrina Nukunuku',
  'Katie Hetherington': 'Nathan Nukunuku',
}

/* Which side they stood on. Right unless named here — every arm in the cage is
   right-handed bar one. */
const LEFTIES = new Set(['Kaleo Eldredge', 'Nathan Nukunuku', 'Heinie Shannon'])
const PITCHER_ADDS: Legend[] = [
  { name: 'Daniel Chapman', grade: 'M', titles: 1, lefty: false },
  { name: 'Blaire Luna', grade: 'W', titles: 1, lefty: false },
]

function tally(grade: 'men' | 'women', key: string): [string, number][] {
  const counts = new Map<string, number>()
  for (const s of HONOURS) {
    const w = s[grade][key]
    if (!w) continue
    // A shared award is recorded as one string — split so each winner counts
    for (const name of w.split('&').map(n => n.trim()).filter(Boolean)) {
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function build(key: string, swaps: Record<string, string> = {}): Legend[] {
  const out: Legend[] = []
  for (const grade of ['men', 'women'] as const) {
    for (const [name, titles] of tally(grade, key).slice(0, 5)) {
      const final = swaps[name] ?? name
      out.push({
        name: final, titles,
        grade: grade === 'men' ? 'M' : 'W',
        lefty: LEFTIES.has(final),
      })
    }
  }
  return out
}

export default function LegendsCage() {
  const batters = build('top_batter', BATTER_SWAPS).sort((a, b) => b.titles - a.titles)

  // The two named arms come in at the expense of the lowest title-holders
  const pitchers = [...build('top_pitcher').sort((a, b) => b.titles - a.titles).slice(0, 8), ...PITCHER_ADDS]
    .sort((a, b) => b.titles - a.titles)

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