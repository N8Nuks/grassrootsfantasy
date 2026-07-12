import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { grade } = await request.json() as { grade: 'mens' | 'womens' }
  const { error } = await admin.from('scoring_config')
    .update({ t2_released: true }).eq('grade', grade)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ released: grade })
}