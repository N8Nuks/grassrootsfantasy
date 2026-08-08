import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PositionsClient from './PositionsClient'

export type PositionPlayer = {
  id: string
  full_name: string
  grade: string
  tier: string
  positions: string[]
  reveal_pos: string | null
  clubs: { name: string } | null
}

export default async function AdminPositionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/team')

  const admin = createAdminClient()
  const { data: players, error } = await admin
    .from('players')
    .select('id, full_name, grade, tier, positions, reveal_pos, clubs(name)')
    .eq('active', true)
    .order('full_name')

  if (error) return <pre style={{ color: '#FF6B6B', padding: '120px 40px' }}>{JSON.stringify(error, null, 2)}</pre>

  return <PositionsClient players={(players ?? []) as unknown as PositionPlayer[]} />
}