import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* Whether a signed-in manager has waved away the install prompt. On the profile
   rather than only in localStorage, because Safari clears script-written storage
   after about a week — long enough that a dismissed prompt keeps returning.
   Signed-out visitors have no profile, so localStorage is all they get, which is
   right: the prompt is the first thing we want a new visitor to see. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ dismissed: false })
  const { data } = await supabase.from('profiles').select('install_dismissed').eq('id', user.id).single()
  return NextResponse.json({ dismissed: data?.install_dismissed ?? false })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true })
  await supabase.from('profiles').update({ install_dismissed: true }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}