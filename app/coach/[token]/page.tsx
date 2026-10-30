import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachRound } from '@/lib/coach'
import { clubKey } from '@/lib/clubMatch'
import CoachClient, { type Entry, type DayBlock } from './CoachClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Coach lineup', robots: { index: false, follow: false } }

const DAY = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Pacific/Auckland' })
const WHEN = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' })

const fmtTime = (t: string | null) => {
  if (!t || t === '23:59') return null
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${ampm}`
}
const fmtDay = (day: string) => DAY.format(new Date(day + 'T12:00:00+12:00'))

type PlayerRow = {
  id: string; full_name: string; active: boolean | null
  is_under18: boolean | null; has_consent: boolean | null; playing_number: number | string | null
}
type LuRow = { round_number: number; game_day: string; player_id: string | null; player_name: string | null; bat_order: number | null; pos: string }
type FxRow = {
  team_a: string; team_b: string; club_a: string | null; club_b: string | null
  played_on: string; location: string | null; venue: string | null; start_time: string | null
}
type SubRow = { game_day: string; submitted_at: string }

function Notice({ text }: { text: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0D0D0F' }}>
      <p className="text-sm text-white/70 text-center" style={{ maxWidth: '320px' }}>{text}</p>
    </main>
  )
}

export default async function CoachPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token.length !== 64) return <Notice text="That link isn't recognised. Ask for a new one." />

  const admin = createAdminClient()
  const { data: link } = await admin.from('coach_links')
    .select('grade, club_id').eq('token', token).maybeSingle()
  if (!link) return <Notice text="That link isn't recognised. Ask for a new one." />
  const grade = link.grade as 'mens' | 'womens'
  const clubId = link.club_id as string

  const cr = await getCoachRound(admin, grade)
  if (!cr) return <Notice text="There is no upcoming round to name a team for." />
  const rn = cr.round_number

  const [{ data: club }, { data: plRows }, { data: luRows }, { data: subRows }, { data: fxRows }] = await Promise.all([
    admin.from('clubs').select('name').eq('id', clubId).single(),
    admin.from('players')
      .select('id, full_name, active, is_under18, has_consent, playing_number')
      .eq('grade', grade).eq('club_id', clubId).order('full_name'),
    admin.from('club_lineups')
      .select('round_number, game_day, player_id, player_name, bat_order, pos')
      .eq('grade', grade).eq('club_id', clubId).lte('round_number', rn),
    admin.from('coach_submissions').select('game_day, submitted_at')
      .eq('grade', grade).eq('club_id', clubId).eq('round_number', rn),
    admin.from('fixtures')
      .select('team_a, team_b, club_a, club_b, played_on, location, venue, start_time')
      .eq('grade', grade).eq('round_number', rn),
  ])

  // This club's games this round: one per day it plays, with the opposition,
  // the time and the ground. A club with no game is on a bye and sees the
  // round's days anyway so it can still name a team.
  // Fixtures carry club names as free text ("United-Marist"); clubKey makes
  // word order, hyphens and case irrelevant.
  const key = clubKey(club?.name)
  type Game = { opponent: string | null; when: string | null; where: string | null }
  const gameOn = new Map<string, Game>()
  for (const f of (fxRows ?? []) as FxRow[]) {
    const a = !!f.club_a && clubKey(f.club_a) === key
    const b = !!f.club_b && clubKey(f.club_b) === key
    if (!a && !b) continue
    const other = a ? { team: f.team_b, club: f.club_b } : { team: f.team_a, club: f.club_a }
    if (gameOn.has(f.played_on)) continue
    gameOn.set(f.played_on, {
      opponent: other.team === 'BYE' ? 'Bye' : (other.club ?? other.team),
      when: fmtTime(f.start_time),
      where: [f.location, f.venue].filter(v => v && v !== 'Unallocated').join(' · ') || null,
    })
  }
  const clubDays = cr.days.filter(d => gameOn.has(d.day) && gameOn.get(d.day)!.opponent !== 'Bye')
  const days = clubDays.length ? clubDays : cr.days.slice(0, 1)

  const players = (plRows ?? []) as PlayerRow[]
  const byId = new Map(players.map(p => [p.id, p]))
  const shownOf = (p: PlayerRow) => !!p.active && (!p.is_under18 || !!p.has_consent)

  const toEntry = (r: LuRow): Entry => {
    if (r.player_id) {
      const p = byId.get(r.player_id)
      return {
        key: r.player_id, player_id: r.player_id, name: p?.full_name ?? 'Unknown player',
        shown: p ? shownOf(p) : false, pos: r.pos, number: p?.playing_number ?? null,
      }
    }
    return { key: 'n:' + r.player_name, player_id: null, name: r.player_name ?? '', shown: false, pos: r.pos, number: null }
  }

  // Teams on file, newest first by round then day
  const all = (luRows ?? []) as LuRow[]
  const teamKeys = [...new Set(all.map(r => `${String(r.round_number).padStart(3, '0')}|${r.game_day}`))].sort().reverse()
  const rowsFor = (k: string) => {
    const [rnS, day] = k.split('|')
    return all.filter(r => r.round_number === Number(rnS) && r.game_day === day)
      .sort((a, b) => (a.bat_order ?? 99) - (b.bat_order ?? 99))
  }
  const submitted = new Map(((subRows ?? []) as SubRow[]).map(s => [s.game_day, s.submitted_at]))

  const { data: flagRows } = await admin.from('coach_unavailable').select('player_id')
    .eq('grade', grade).eq('round_number', rn).in('player_id', players.map(p => p.id))
  const unavailable = (flagRows ?? []).map(f => f.player_id as string)

  const now = new Date()
  const blocks: DayBlock[] = days.map(d => {
    const thisKey = `${String(rn).padStart(3, '0')}|${d.day}`
    // Start from this day's team if named, else the latest team on file before it
    const srcKey = teamKeys.includes(thisKey) ? thisKey : teamKeys.find(k => k < thisKey) ?? null
    const rows = srcKey ? rowsFor(srcKey) : []
    const named = srcKey === thisKey
    const [srcRn, srcDay] = srcKey ? srcKey.split('|') : ['', '']
    const srcLabel = srcKey
      ? (Number(srcRn) === rn ? `${fmtDay(srcDay)} team` : `Round ${Number(srcRn)} lineup`)
      : ''
    const batters = rows.filter(r => r.bat_order != null).map(toEntry)
    const relievers = rows.filter(r => r.bat_order == null).map(toEntry)
    const used = new Set(rows.map(r => r.player_id).filter(Boolean) as string[])
    const squad: Entry[] = players.filter(p => !used.has(p.id)).map(p => ({
      key: p.id, player_id: p.id, name: p.full_name, shown: shownOf(p), pos: '', number: p.playing_number, active: !!p.active,
    }))
    const g = gameOn.get(d.day)
    const sub = submitted.get(d.day)
    return {
      day: d.day,
      dayLabel: fmtDay(d.day),
      opponent: g?.opponent ?? null,
      gameWhen: g?.when ?? null,
      gameWhere: g?.where ?? null,
      closesLabel: d.closes_at > now ? WHEN.format(d.closes_at) : '',
      closed: d.hard_closes_at <= now || (d.closes_at <= now && !!sub),
      sourceNote: named ? `Your team for ${fmtDay(d.day)}, as you last sent it`
        : srcKey ? `Filled in from your ${srcLabel}` : 'No team on file yet. Build one below',
      submittedLabel: sub ? WHEN.format(new Date(sub)) : null,
      batters, relievers, squad,
    }
  })

  return (
    <CoachClient
      token={token}
      grade={grade}
      gradeLabel={grade === 'mens' ? "Men's" : "Women's"}
      clubName={club?.name ?? 'Your club'}
      roundNumber={rn}
      days={blocks}
      unavailable={unavailable}
    />
  )
}