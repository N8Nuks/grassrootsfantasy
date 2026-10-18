import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/* Top three fantasy scorers for the latest scored round of a grade — the
   Collection page's pointer into the Leaders board. Same visibility rule as
   every manager-facing read: active, and no unconsented under-18s. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const grade = url.searchParams.get('grade') === 'womens' ? 'womens' : 'mens'
  const admin = createAdminClient()

  const { data: round } = await admin.from('rounds')
    .select('id, round_number, status').eq('grade', grade)
    .in('status', ['provisional', 'confirmed'])
    .order('round_number', { ascending: false }).limit(1).maybeSingle()
  if (!round) return NextResponse.json({ round: null, top: [] })

  const { data: rows } = await admin.from('player_scores')
    .select('player_id, points, players(full_name, active, is_under18, has_consent, clubs(name))')
    .eq('round_id', round.id).order('points', { ascending: false }).limit(12)

  type Row = {
    player_id: string; points: number
    players: { full_name: string; active: boolean; is_under18: boolean; has_consent: boolean; clubs: { name: string } | null } | null
  }
  const top = ((rows ?? []) as unknown as Row[])
    .filter(r => r.players && r.players.active && (!r.players.is_under18 || r.players.has_consent))
    .slice(0, 3)
    .map(r => ({ id: r.player_id, name: r.players!.full_name, club: r.players!.clubs?.name ?? '', points: Number(r.points) }))

  return NextResponse.json({ round: { number: round.round_number, status: round.status }, top })
}