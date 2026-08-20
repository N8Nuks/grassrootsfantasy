import ArcadeShell from '@/components/ArcadeShell'
import SeasonClient, { SeasonCard } from './SeasonClient'
import { HONOURS, AWARD_LABELS } from '@/lib/nfsHonours'

const NEON = '#FF8A3D'

export default function GuessTheSeason() {
  /* Every season with enough on the board to make a fair question — three or
     more award winners across the two grades. The Honours Board is the whole
     dataset here, so nothing new is needed. */
  const cards: SeasonCard[] = HONOURS.map(s => {
    const rows: { grade: string; award: string; name: string }[] = []
    for (const grade of ['men', 'women'] as const) {
      for (const [key, winner] of Object.entries(s[grade])) {
        if (!winner) continue
        rows.push({
          grade: grade === 'men' ? "Men's" : "Women's",
          award: AWARD_LABELS[key] ?? key,
          name: winner as string,
        })
      }
    }
    return { season: s.season, rows }
  }).filter(c => c.rows.length >= 3)

  return (
    <ArcadeShell neon={NEON} eyebrow="Daily · From the archive" title="Guess the Season">
      {cards.length < 4
        ? <p style={{ color: '#8FA0B4', fontSize: '13px' }}>Not enough on the Honours Board yet.</p>
        : <SeasonClient cards={cards} />}
    </ArcadeShell>
  )
}