import ArcadeShell from '@/components/ArcadeShell'
import WhoKnowsClient from './WhoKnowsClient'

const NEON = '#4D7FFF'

export default function WhoKnows() {
  return (
    <ArcadeShell neon={NEON} eyebrow="Fifteen questions · One life" title="Who Thinks They Know The NFS" page="game-whoknows">
      <WhoKnowsClient />
    </ArcadeShell>
  )
}