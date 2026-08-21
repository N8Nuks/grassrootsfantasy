import { createClient } from '@/lib/supabase/server'
import ArcadeShell from '@/components/ArcadeShell'
import SnakeClient, { ClubOption } from './SnakeClient'

const NEON = '#FFB800'

const clubSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

// Generic is the no-club fallback and Papatoetoe isn't in the competition —
// neither has a crest, so neither belongs in the picker
const EXCLUDE = ['Generic', 'Papatoetoe']

/* Each club's two colours, so the tail runs in their kit rather than the
   arcade amber. Taken from the same tints the cards use. */
const CLUB_COLOURS: Record<string, [string, string]> = {
  Bandits: ['#5B2D8E', '#C9A6F0'],
  Howick: ['#8A1E41', '#F0A6C0'],
  Marist: ['#2456E6', '#A6C4FF'],
  Otahuhu: ['#2B5C9E', '#A9CBF2'],
  Patriots: ['#B49759', '#F0E0BC'],
  Pukekohe: ['#2D9E4E', '#A6ECBC'],
  Ramblers: ['#C41E3A', '#F5A6B4'],
  Roosters: ['#C8102E', '#F7A9B5'],
  United: ['#E03A3E', '#FFB3B5'],
  'United-Marist': ['#C8102E', '#2456E6'],
  Waitakere: ['#FFB81C', '#FFE7A8'],
}

export default async function Snake() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: clubs }, { data: profile }] = await Promise.all([
    supabase.from('clubs').select('id, name').order('name'),
    user
      ? supabase.from('profiles').select('club_id').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const options: ClubOption[] = (clubs ?? [])
    .filter(c => !EXCLUDE.includes(c.name as string))
    .map(c => ({
      id: c.id as string,
      name: c.name as string,
      crest: `/clubs/${clubSlug(c.name as string)}.jpg`,
      colours: CLUB_COLOURS[c.name as string] ?? ['#FFB800', '#FFE7A8'],
    }))

  const myClubId = (profile as unknown as { club_id?: string })?.club_id ?? null
  const mine = options.find(o => o.id === myClubId) ?? null

  return (
    <ArcadeShell neon={NEON} eyebrow="Arcade · Don't hit the fence" title="Diamond Snake">
      <SnakeClient clubs={options} initialClub={mine} />
    </ArcadeShell>
  )
}