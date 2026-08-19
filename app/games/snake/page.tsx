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

  const options: ClubOption[] = (clubs ?? []).map(c => ({
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