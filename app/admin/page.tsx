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

  // Users
  const { count: users } = await admin.from('profiles').select('id', { count: 'exact', head: true })

  // Teams per grade = distinct T1 holders
  const { data: t1Cards } = await admin.from('cards').select('owner_id, grade').eq('source', 't1')
  const teamOwners = { mens: new Set<string>(), womens: new Set<string>() }
  for (const c of t1Cards ?? []) {
    if (c.grade === 'mens') teamOwners.mens.add(c.owner_id)
    if (c.grade === 'womens') teamOwners.womens.add(c.owner_id)
  }

  // Cards by source
  const { data: allCards } = await admin.from('cards').select('source')
  const bySource = new Map<string, number>()
  for (const c of allCards ?? []) {
    bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1)
  }
  const cardsBySource = [...bySource.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => a.source.localeCompare(b.source))

  // Rounds scored (rounds with any user_scores)
  const { data: scoredRounds } = await admin.from('user_scores').select('round_id, grade')
  const scoredByGrade = { mens: new Set<string>(), womens: new Set<string>() }
  for (const s of scoredRounds ?? []) {
    if (s.grade === 'mens') scoredByGrade.mens.add(s.round_id)
    if (s.grade === 'womens') scoredByGrade.womens.add(s.round_id)
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

  // Weekly (T3) unclaimed for the current round per grade
  const weeklyUnclaimed = { mens: 0, womens: 0 }
  for (const grade of ['mens', 'womens'] as const) {
    const { data: r } = await admin.from('rounds')
      .select('id').eq('grade', grade)
      .order('round_number', { ascending: false }).limit(1).maybeSingle()
    if (!r) continue
    const { data: claims } = await admin.from('t3_claims')
      .select('owner_id').eq('grade', grade).eq('round_id', r.id)
    const claimed = new Set((claims ?? []).map(c => c.owner_id))
    weeklyUnclaimed[grade] = [...teamOwners[grade]].filter(o => !claimed.has(o)).length
  }

  const stats: AdminStats = {
    users: users ?? 0,
    teams: { mens: teamOwners.mens.size, womens: teamOwners.womens.size },
    cardsBySource,
    roundsScored: { mens: scoredByGrade.mens.size, womens: scoredByGrade.womens.size },
    latestRound,
    weeklyUnclaimed,
  }

  return <AdminClient stats={stats} />
}