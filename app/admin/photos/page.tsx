import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PhotosClient from './PhotosClient'

export type PhotoPlayer = {
  id: string
  full_name: string
  club_id: string
  grade: string
  photo_url: string | null
}

export default async function AdminPhotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/team')

  const admin = createAdminClient()
  const { data: players, error } = await admin
    .from('players')
    .select('id, full_name, club_id, grade, photo_url')
    .order('club_id').order('full_name')

  if (error) return <pre style={{ color: '#FF6B6B', padding: '120px 40px' }}>{JSON.stringify(error, null, 2)}</pre>

  return <PhotosClient players={(players ?? []) as PhotoPlayer[]} />
}