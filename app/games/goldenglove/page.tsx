import ArcadeShell from '@/components/ArcadeShell'
import GoldenGloveClient from './GoldenGloveClient'

const NEON = '#FFC93C'

export default function GoldenGlove() {
  return (
    <ArcadeShell neon={NEON} eyebrow="Drill · Sixty seconds" title="Golden Glove" page="game-goldenglove">
      <GoldenGloveClient />
    </ArcadeShell>
  )
}