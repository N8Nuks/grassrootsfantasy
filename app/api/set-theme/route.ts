import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { THEMES } from '@/lib/clubhouse'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const siteTheme = body?.siteTheme
  const valid = siteTheme === 'grade' || (typeof siteTheme === 'string' && siteTheme in THEMES)
  if (!valid) return NextResponse.json({ error: 'Unknown theme' }, { status: 400 })

  const { error } = await supabase.from('profiles').update({ site_theme: siteTheme }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}