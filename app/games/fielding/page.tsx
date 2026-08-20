import ArcadeShell from '@/components/ArcadeShell'
import FieldingClient from './FieldingClient'

const NEON = '#5CFF6B'

export default function Fielding() {
  return (
    <ArcadeShell neon={NEON} eyebrow="Endless · Three lanes" title="Take the Field">
      <FieldingClient />
    </ArcadeShell>
  )
}