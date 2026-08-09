import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Player = { id: string; full_name: string; positions: string[]; clubs: { name: string } | null }

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Not signed in', { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return new NextResponse('Admin only', { status: 403 })

  const { searchParams } = new URL(req.url)
  const grade = searchParams.get('grade') === 'womens' ? 'womens' : 'mens'

  const { data: pool } = await admin.from('players')
    .select('id, full_name, positions, clubs(name)')
    .eq('grade', grade).eq('active', true)
  const players = (pool ?? []) as unknown as Player[]
  if (players.length === 0) return new NextResponse('No active players', { status: 400 })

  const rand = Math.random
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]

  // ~8% sit out this round
  const absent = new Set<string>()
  for (const p of players) if (rand() < 0.08) absent.add(p.id)

  // Pitching: one starter per club from P/PB-eligible players; ~half the clubs win
  const byClub = new Map<string, Player[]>()
  for (const p of players) {
    if (absent.has(p.id)) continue
    const club = p.clubs?.name ?? '?'
    byClub.set(club, [...(byClub.get(club) ?? []), p])
  }
  const clubNames = [...byClub.keys()]
  const winners = new Set(clubNames.filter(() => rand() < 0.5))
  const pitcherOf = new Map<string, string>() // player_id -> 'win' | 'nodecision'
  for (const club of clubNames) {
    const eligible = (byClub.get(club) ?? []).filter(p => p.positions.includes('P') || p.positions.includes('PB'))
    if (eligible.length === 0) continue
    const starter = pick(eligible)
    pitcherOf.set(starter.id, winners.has(club) ? 'win' : 'nodecision')
    // Occasional relief appearance, never with a W
    if (eligible.length > 1 && rand() < 0.3) {
      const relief = pick(eligible.filter(p => p.id !== starter.id))
      if (relief) pitcherOf.set(relief.id, 'relief')
    }
  }

  const header = 'player\tab\tsingles\tdoubles\ttriples\thr\trbi\truns\tbb\thbp\tsb\tcs\tk_bat\tip\tk_pit\twin\ter'
  const lines: string[] = [header]
  for (const p of players) {
    if (absent.has(p.id)) continue
    const ab = pick([3, 3, 4, 4, 4])
    let hits = 0
    for (let i = 0; i < ab; i++) if (rand() < 0.42) hits++
    const doubles = hits >= 1 && rand() < 0.18 ? 1 : 0
    const triples = hits - doubles >= 1 && rand() < 0.05 ? 1 : 0
    const hr = hits - doubles - triples >= 1 && rand() < 0.06 ? 1 : 0
    const singles = hits - doubles - triples - hr
    const rbi = Math.min(4, hr + (hits >= 2 ? 1 : 0) + (rand() < 0.3 ? 1 : 0))
    const runs = Math.min(3, (hits >= 1 && rand() < 0.55 ? 1 : 0) + (rand() < 0.2 ? 1 : 0))
    const bb = rand() < 0.22 ? 1 : 0
    const hbp = rand() < 0.04 ? 1 : 0
    let sb = rand() < 0.14 ? 1 : 0
    if (sb && rand() < 0.15) sb++
    const cs = rand() < 0.05 ? 1 : 0
    let k_bat = 0
    for (let i = 0; i < ab - hits; i++) if (rand() < 0.35) k_bat++

    let ip = 0, k_pit = 0, win = 0, er = 0
    const role = pitcherOf.get(p.id)
    if (role === 'win' || role === 'nodecision') {
      ip = pick([4, 5, 5, 6, 7])
      k_pit = Math.max(0, Math.round(ip * (0.6 + rand() * 0.5)))
      er = Math.max(0, Math.round(ip * (0.3 + rand() * 0.5)))
      win = role === 'win' ? 1 : 0
    } else if (role === 'relief') {
      ip = pick([1, 2, 2, 3])
      k_pit = Math.max(0, Math.round(ip * (0.5 + rand() * 0.5)))
      er = Math.max(0, Math.round(ip * (0.2 + rand() * 0.6)))
    }

    lines.push([p.full_name, ab, singles, doubles, triples, hr, rbi, runs, bb, hbp, sb, cs, k_bat, ip, k_pit, win, er].join('\t'))
  }

  return new NextResponse(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}