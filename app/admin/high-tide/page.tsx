import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import HighTideClient from './HighTideClient'

export type Listing = {
  id: string
  business_name: string
  blurb: string
  category: string
  area: string | null
  phone: string | null
  email: string | null
  website: string | null
  socials: string | null
  logo_url: string | null
  status: 'pending' | 'needs_info' | 'approved' | 'rejected'
  admin_note: string | null
  active: boolean
  paid_until: string | null
  created_at: string
  approved_at: string | null
  player_id: string | null
  player_name: string | null
}

export const CATEGORIES = ['Trades', 'Food & hospo', 'Professional services', 'Health & fitness', 'Retail', 'Side hustle / other'] as const

export default async function AdminHighTidePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/team')

  const admin = createAdminClient()
  const counts: Record<string, number> = {}
  for (const status of ['pending', 'needs_info', 'approved', 'rejected']) {
    const { count } = await admin.from('listings').select('id', { count: 'exact', head: true }).eq('status', status)
    counts[status] = count ?? 0
  }

  return <HighTideClient counts={counts} />
}