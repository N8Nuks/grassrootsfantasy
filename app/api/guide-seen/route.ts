import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* Which page guides a manager has already seen. Kept on the profile rather than
   only in localStorage, because a service-worker version bump or an iOS storage
   eviction wipes local state — and a guide that reappears every few days reads
   as a bug, not a welcome. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ seen: [] })
  const { data } = await supabase.from('profiles').select('guides_seen').eq('id', user.id).single()
  return NextResponse.json({ seen: data?.guides_seen ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true })   // signed out: localStorage only
  const { pageKey } = await request.json() as { pageKey?: string }
  if (!pageKey) return NextResponse.json({ error: 'Missing pageKey' }, { status: 400 })

  const { data } = await supabase.from('profiles').select('guides_seen').eq('id', user.id).single()
  const seen = new Set<string>(data?.guides_seen ?? [])
  seen.add(pageKey)
  await supabase.from('profiles').update({ guides_seen: [...seen] }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}