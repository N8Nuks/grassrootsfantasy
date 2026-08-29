import ArcadeShell from '@/components/ArcadeShell'
import MergeClient from './MergeClient'

const NEON = '#39FF9E'

export default function Merge() {
  return (
    <ArcadeShell neon={NEON} eyebrow="Puzzle · Build the card" title="Tier Up" page="game-merge">
      <MergeClient />
    </ArcadeShell>
  )
}