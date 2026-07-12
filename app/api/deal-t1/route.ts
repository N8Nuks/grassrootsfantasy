import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dealAndPersistT1 } from '@/lib/dealing'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let grades: ('mens' | 'womens')[] = ['mens']
  try {
    const body = await request.json()
    if (Array.isArray(body?.grades) && body.grades.length > 0) {
      grades = body.grades.filter((g: string) => g === 'mens' || g === 'womens')
    }
  } catch { /* no body: default mens */ }

  const admin = createAdminClient()
  const results: Record<string, number | string> = {}
  const packs: { grade: string; cards: { name: string; tier: string; positions: string[] }[] }[] = []

  for (const grade of grades) {
    try {
      const r = await dealAndPersistT1(admin, user.id, grade)
      results[grade] = r.dealt
      packs.push({ grade, cards: r.cards })
    } catch (e) {
      results[grade] = (e as Error).message
    }
  }
  return NextResponse.json({ ...results, packs })
}