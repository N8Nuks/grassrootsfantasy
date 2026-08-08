import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const playerId = searchParams.get('playerId')
  if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 })

  const admin = createAdminClient()
  const [{ data: stats }, { data: scores }] = await Promise.all([
    admin.from('player_stats')
      .select('round_id, raw, rounds!inner(round_number, status)')
      .eq('player_id', playerId),
    admin.from('player_scores')
      .select('round_id, points')
      .eq('player_id', playerId),
  ])

  const pointsByRound = new Map((scores ?? []).map(s => [s.round_id, Number(s.points)]))
  type StatRow = { round_id: string; raw: Record<string, number>; rounds: { round_number: number; status: string } }
  const rounds = ((stats ?? []) as unknown as StatRow[])
    .map(s => ({
      round: s.rounds.round_number,
      status: s.rounds.status,
      raw: s.raw ?? {},
      points: pointsByRound.get(s.round_id) ?? null,
    }))
    .sort((a, b) => b.round - a.round)

  return NextResponse.json({ rounds })
}