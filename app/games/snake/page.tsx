import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import SnakeClient, { ClubOption } from './SnakeClient'

const NEON = '#FFB800'

const clubSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

export default async function Snake() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: clubs }, { data: profile }] = await Promise.all([
    supabase.from('clubs').select('id, name').order('name'),
    user
      ? supabase.from('profiles').select('club_id').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  // Generic is the no-club fallback and Papatoetoe isn't in the competition —
  // neither has a crest, so neither belongs in the picker
  const EXCLUDE = ['Generic', 'Papatoetoe']
  const options: ClubOption[] = (clubs ?? [])
    .filter(c => !EXCLUDE.includes(c.name as string))
    .map(c => ({
    id: c.id as string,
    name: c.name as string,
    crest: `/clubs/${clubSlug(c.name as string)}.jpg`,
  }))

  const myClubId = (profile as unknown as { club_id?: string })?.club_id ?? null
  const mine = options.find(o => o.id === myClubId) ?? null

  return (
    <ArcadeShell neon={NEON} eyebrow="Arcade · Don't hit the fence" title="Diamond Snake">
      <SnakeClient clubs={options} initialClub={mine} />
    </ArcadeShell>
  )
}