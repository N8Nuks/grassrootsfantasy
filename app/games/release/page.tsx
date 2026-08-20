import ArcadeShell from '@/components/ArcadeShell'
import ReleaseClient from './ReleaseClient'

const NEON = '#FF4FD8'

export default function Release() {
  return (
    <ArcadeShell neon={NEON} eyebrow="Reaction · One frame" title="Release Point">
      <ReleaseClient />
    </ArcadeShell>
  )
}