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

/* Coaches are told the deadline is noon the day before a round's first game
   day, so GF managers have the named teams for the evening before the GF
   lock. Behind that sits a quiet soft close: a club that has not submitted
   yet can still send its team until 8pm that day. It is never shown to
   coaches.

   A round played over two days (a super round) has one team per day. The
   second day's team can be changed after the first day's games, up to 8pm
   the night before; a club that has not sent one at all can still send it
   until the first pitch. Projected Lineups reveal the second day's teams at
   that 8pm mark. */
const COACH_CLOSE_TIME = '12:00'
const COACH_HARD_CLOSE_TIME = '20:00'
const LATER_DAY_CLOSE_TIME = '20:00'

export function dayBefore(day: string): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/* When a later game day's teams become public: 8pm the night before. */
export function laterDayRevealAt(day: string): Date {
  return nzToDate(dayBefore(day), LATER_DAY_CLOSE_TIME)
}

export type CoachDay = {
  day: string            // YYYY-MM-DD, NZ date of the games
  starts_at: Date        // first game that day
  closes_at: Date        // the published deadline
  hard_closes_at: Date   // last moment for a club that has not yet submitted
}

export type CoachRound = {
  round_number: number
  opens_day: string      // first game day of the round
  starts_at: Date
  closes_at: Date        // the first day's deadline (back-compat)
  hard_closes_at: Date
  days: CoachDay[]       // every game day in the round, in order
}

export function coachDay(day: string, starts_at: Date, laterDay = false): CoachDay {
  const eve = dayBefore(day)
  if (laterDay) {
    return { day, starts_at, closes_at: laterDayRevealAt(day), hard_closes_at: starts_at }
  }
  return {
    day, starts_at,
    closes_at: nzToDate(eve, COACH_CLOSE_TIME),
    hard_closes_at: nzToDate(eve, COACH_HARD_CLOSE_TIME),
  }
}

/* The round a coach is submitting for: the first round with a game that has
   not started yet. Null once every game of every round has begun. */
export async function getCoachRound(
  admin: SupabaseClient,
  grade: 'mens' | 'womens',
): Promise<CoachRound | null> {
  const { data, error } = await admin.from('fixtures')
    .select('round_number, played_on, start_time, team_a, team_b')
    .eq('grade', grade)
    .order('round_number')

  // Per round, the first start time of each game day
  const byRound = new Map<number, Map<string, Date>>()
  for (const f of data ?? []) {
    if (f.team_a === 'BYE' || f.team_b === 'BYE') continue
    const rn = Number(f.round_number)
    const day = String(f.played_on)
    const at = nzToDate(day, f.start_time)
    const days = byRound.get(rn) ?? new Map<string, Date>()
    byRound.set(rn, days)
    const cur = days.get(day)
    if (!cur || at < cur) days.set(day, at)
  }

  const now = new Date()
  for (const n of [...byRound.keys()].sort((a, b) => a - b)) {
    const days = [...byRound.get(n)!.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const last = days[days.length - 1][1]
    if (last > now) {
      const list = days.map(([day, at], i) => coachDay(day, at, i > 0))
      return {
        round_number: n,
        opens_day: list[0].day,
        starts_at: list[0].starts_at,
        closes_at: list[0].closes_at,
        hard_closes_at: list[0].hard_closes_at,
        days: list,
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