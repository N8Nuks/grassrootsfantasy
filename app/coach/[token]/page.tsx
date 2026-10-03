import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachRound } from '@/lib/coach'
import CoachClient, { type Entry } from './CoachClient'

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

type PlayerRow = {
  id: string; full_name: string; active: boolean | null
  is_under18: boolean | null; has_consent: boolean | null; playing_number: number | string | null
}
type LuRow = { round_number: number; player_id: string | null; player_name: string | null; bat_order: number | null; pos: string }
type FxRow = {
  team_a: string; team_b: string; club_a: string | null; club_b: string | null
  location: string | null; venue: string | null; start_time: string | null
}

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

  const [{ data: club }, { data: plRows }, { data: luRows }, { data: sub }, { data: fxRows }] = await Promise.all([
    admin.from('clubs').select('name').eq('id', clubId).single(),
    admin.from('players')
      .select('id, full_name, active, is_under18, has_consent, playing_number')
      .eq('grade', grade).eq('club_id', clubId).order('full_name'),
    admin.from('club_lineups')
      .select('round_number, player_id, player_name, bat_order, pos')
      .eq('grade', grade).eq('club_id', clubId).lte('round_number', rn),
    admin.from('coach_submissions').select('submitted_at')
      .eq('grade', grade).eq('club_id', clubId).eq('round_number', rn).maybeSingle(),
    admin.from('fixtures')
      .select('team_a, team_b, club_a, club_b, location, venue, start_time')
      .eq('grade', grade).eq('round_number', rn),
  ])

  // This club's game this round: the opposition, the time and the ground
  const key = (club?.name ?? '').trim().toLowerCase()
  let opponent: string | null = null
  let gameWhen: string | null = null
  let gameWhere: string | null = null
  for (const f of (fxRows ?? []) as FxRow[]) {
    const a = (f.club_a ?? '').trim().toLowerCase() === key
    const b = (f.club_b ?? '').trim().toLowerCase() === key
    if (!a && !b) continue
    const other = a ? { team: f.team_b, club: f.club_b } : { team: f.team_a, club: f.club_a }
    opponent = other.team === 'BYE' ? 'Bye' : (other.club ?? other.team)
    gameWhen = fmtTime(f.start_time)
    gameWhere = [f.location, f.venue].filter(v => v && v !== 'Unallocated').join(' · ') || null
    break
  }

  const players = (plRows ?? []) as PlayerRow[]
  const byId = new Map(players.map(p => [p.id, p]))
  const shownOf = (p: PlayerRow) => !!p.active && (!p.is_under18 || !!p.has_consent)

  // Start from the latest team on file (this round if already named, else the last round)
  const all = (luRows ?? []) as LuRow[]
  const latest = all.reduce((m, r) => Math.max(m, r.round_number), 0)
  const rows = all.filter(r => r.round_number === latest)
    .sort((a, b) => (a.bat_order ?? 99) - (b.bat_order ?? 99))

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
  const batters = rows.filter(r => r.bat_order != null).map(toEntry)
  const relievers = rows.filter(r => r.bat_order == null).map(toEntry)
  const used = new Set(rows.map(r => r.player_id).filter(Boolean) as string[])

  const squad: Entry[] = players.filter(p => !used.has(p.id)).map(p => ({
    key: p.id, player_id: p.id, name: p.full_name, shown: shownOf(p), pos: '', number: p.playing_number, active: !!p.active,
  }))

  const { data: flagRows } = await admin.from('coach_unavailable').select('player_id')
    .eq('grade', grade).eq('round_number', rn).in('player_id', players.map(p => p.id))
  const unavailable = (flagRows ?? []).map(f => f.player_id as string)

  const named = latest === rn
  return (
    <CoachClient
      token={token}
      grade={grade}
      gradeLabel={grade === 'mens' ? "Men's" : "Women's"}
      clubName={club?.name ?? 'Your club'}
      roundNumber={rn}
      dayLabel={DAY.format(new Date(cr.opens_day + 'T12:00:00+12:00'))}
      closesLabel={WHEN.format(cr.closes_at)}
      closed={cr.closes_at <= new Date()}
      opponent={opponent}
      gameWhen={gameWhen}
      gameWhere={gameWhere}
      sourceNote={
        named ? `Your team for Round ${rn}, as you last sent it`
          : latest > 0 ? `Filled in from your Round ${latest} lineup` : 'No team on file yet. Build one below'
      }
      submittedLabel={sub?.submitted_at ? WHEN.format(new Date(sub.submitted_at)) : null}
      batters={batters}
      relievers={relievers}
      squad={squad}
      unavailable={unavailable}
    />
  )
}