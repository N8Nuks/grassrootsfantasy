import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { style } = await req.json() as { style: 'standard' | 'premium' }
  if (style !== 'standard' && style !== 'premium') {
    return NextResponse.json({ error: 'Invalid style' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('site_settings')
    .upsert({ key: 'card_style', value: style })
  if (error) return NextResponse.json({ error: 'Update failed: ' + error.message }, { status: 500 })

  return NextResponse.json({ ok: true, style })
}