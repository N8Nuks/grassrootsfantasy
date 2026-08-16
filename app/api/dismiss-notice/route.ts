import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await request.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // RLS restricts this to the caller's own notices
  const { error } = await supabase.from('armband_notices')
    .update({ seen: true }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}