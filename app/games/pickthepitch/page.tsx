import ArcadeShell from '@/components/ArcadeShell'
import PickClient from './PickClient'

const NEON = '#FFD400'

export default function PickThePitch() {
  return (
    <ArcadeShell neon={NEON} eyebrow="Expert · Steal the signs" title="Pick the Pitch">
      <PickClient />
    </ArcadeShell>
  )
}