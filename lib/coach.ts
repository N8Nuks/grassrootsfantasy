import type { SupabaseClient } from '@supabase/supabase-js'

const NZ = 'Pacific/Auckland'

/* NZ local date + time to a UTC Date. NZ is +13 in daylight time and +12
   otherwise, so try both and keep the one that reads back as the same local
   time. A missing or TBC time counts as 08:00. */
export function nzToDate(day: string, time: string | null): Date {
  const t = !time || time === '23:59' ? '08:00' : time.slice(0, 5)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: NZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  for (const off of ['+13:00', '+12:00']) {
    const d = new Date(`${day}T${t}:00${off}`)
    const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]))
    if (`${p.year}-${p.month}-${p.day}` === day && `${p.hour}:${p.minute}` === t) return d
  }
  return new Date(`${day}T${t}:00+12:00`)
}

/* Coaches close at noon the day before a round's first game, so GF managers
   have the named teams for the evening before the GF lock. */
const COACH_CLOSE_TIME = '12:00'

function dayBefore(day: string): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export type CoachRound = {
  round_number: number
  opens_day: string
  starts_at: Date
  closes_at: Date
}

/* The round a coach is submitting for: the first round whose opening game has
   not started yet. Null once every round has begun. closes_at is the coach
   deadline (noon the day before), which falls before the game starts. */
export async function getCoachRound(
  admin: SupabaseClient,
  grade: 'mens' | 'womens',
): Promise<CoachRound | null> {
  const { data, error } = await admin.from('fixtures')
    .select('round_number, played_on, start_time, team_a, team_b')
    .eq('grade', grade)
    .order('round_number')

  const first = new Map<number, { day: string; at: Date }>()
  for (const f of data ?? []) {
    if (f.team_a === 'BYE' || f.team_b === 'BYE') continue
    const at = nzToDate(String(f.played_on), f.start_time)
    const rn = Number(f.round_number)
    const cur = first.get(rn)
    if (!cur || at < cur.at) first.set(rn, { day: String(f.played_on), at })
  }

  const now = new Date()
  for (const n of [...first.keys()].sort((a, b) => a - b)) {
    const r = first.get(n)!
    if (r.at > now) {
      return {
        round_number: n,
        opens_day: r.day,
        starts_at: r.at,
        closes_at: nzToDate(dayBefore(r.day), COACH_CLOSE_TIME),
      }
    }
  }

  console.error('getCoachRound found no upcoming round', JSON.stringify({
    grade,
    queryError: error?.message ?? null,
    rowsRead: (data ?? []).length,
    now: now.toISOString(),
  }))
  return null
}