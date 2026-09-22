import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient from './AdminClient'

export type AdminStats = {
  users: number
  teams: { mens: number; womens: number }
  cardsBySource: { source: string; count: number }[]
  roundsScored: { mens: number; womens: number }
  latestRound: { grade: string; round_number: number; teamsScored: number; topScore: number | null }[]
  weeklyUnclaimed: { mens: number; womens: number }
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/team')

  const admin = createAdminClient()

  const { data: styleRow } = await admin.from('site_settings')
    .select('value').eq('key', 'card_style').maybeSingle()
  const cardStyle = styleRow?.value ?? 'premium'

  /* Big tables are counted in the database, not by pulling rows — a plain
     select is capped at 1,000 rows, which froze the teams and cards figures
     once the season passed 1,000 cards. */

  // Users
  const { count: users } = await admin.from('profiles').select('id', { count: 'exact', head: true })

  // Teams per grade = round-0 team entries (every starter pack creates exactly one)
  const teamCount = { mens: 0, womens: 0 }
  const { data: r0 } = await admin.from('rounds').select('id, grade').eq('round_number', 0)
  for (const r of r0 ?? []) {
    if (r.grade !== 'mens' && r.grade !== 'womens') continue
    const { count } = await admin.from('lineups')
      .select('id', { count: 'exact', head: true }).eq('round_id', r.id)
    teamCount[r.grade as 'mens' | 'womens'] += count ?? 0
  }

  // Cards by source
  const cardsBySource: AdminStats['cardsBySource'] = []
  for (const source of ['t1', 't2', 't3', 't4']) {
    const { count } = await admin.from('cards')
      .select('id', { count: 'exact', head: true }).eq('source', source)
    if (count) cardsBySource.push({ source, count })
  }

  // Rounds scored (rounds marked provisional or confirmed)
  const { data: scoredRounds } = await admin.from('rounds')
    .select('id, grade').in('status', ['provisional', 'confirmed'])
  const scoredByGrade = { mens: new Set<string>(), womens: new Set<string>() }
  for (const s of scoredRounds ?? []) {
    if (s.grade === 'mens') scoredByGrade.mens.add(s.id)
    if (s.grade === 'womens') scoredByGrade.womens.add(s.id)
  }

  // Latest scored round summary per grade
  const latestRound: AdminStats['latestRound'] = []
  for (const grade of ['mens', 'womens'] as const) {
    const { data: r } = await admin.from('rounds')
      .select('id, round_number')
      .eq('grade', grade).in('status', ['provisional', 'confirmed'])
      .order('round_number', { ascending: false }).limit(1).maybeSingle()
    if (!r) continue
    const { data: scores } = await admin.from('user_scores')
      .select('points').eq('round_id', r.id)
    latestRound.push({
      grade,
      round_number: r.round_number,
      teamsScored: scores?.length ?? 0,
      topScore: scores?.length ? Math.max(...scores.map(s => Number(s.points))) : null,
    })
  }

  // Weekly (T3) unclaimed for the current round per grade = teams minus claims
  const weeklyUnclaimed = { mens: 0, womens: 0 }
  for (const grade of ['mens', 'womens'] as const) {
    const { data: r } = await admin.from('rounds')
      .select('id').eq('grade', grade)
      .order('round_number', { ascending: false }).limit(1).maybeSingle()
    if (!r) continue
    const { count: claimed } = await admin.from('t3_claims')
      .select('id', { count: 'exact', head: true }).eq('grade', grade).eq('round_id', r.id)
    weeklyUnclaimed[grade] = Math.max(0, teamCount[grade] - (claimed ?? 0))
  }

  const stats: AdminStats = {
    users: users ?? 0,
    teams: teamCount,
    cardsBySource,
    roundsScored: { mens: scoredByGrade.mens.size, womens: scoredByGrade.womens.size },
    latestRound,
    weeklyUnclaimed,
  }

  return <AdminClient stats={stats} cardStyle={cardStyle} />
}