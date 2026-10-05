import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CAREER_RECORDS } from '@/lib/nfsRecords'
import { splitName } from '@/lib/names'
import SeasonRecords, { type SeasonRec } from './SeasonRecords'
import MilestonesPopout, { type MilestoneEntry } from './MilestonesPopout'

/* Single-season records are built but held back for launch. While this is
   false only admins see the section (tagged "Admin preview"); everyone else
   sees the page exactly as before. At launch, change this one word to true. */
const SEASON_RECORDS_PUBLIC = true

/* Ranked on what could fall in a single round, not raw difference. Hits, home
   runs and RBI all move at the same rate — any of them can come in one
   afternoon. Games are a quarter of that: one a round however well you play.
   Strikeouts are recorded and celebrated once reached, but deliberately not
   watched: a public countdown puts a pitcher under pressure mid-game. */
const BAT = 4
const WATCH: { key: string; label: string; rate: number; marks: number[] }[] = [
  { key: 'career_games', label: 'Games', rate: BAT * 0.25, marks: range(50, 1000, 50) },
  { key: 'career_h', label: 'Hits', rate: BAT, marks: range(100, 1000, 100) },
  { key: 'career_hr', label: 'Home runs', rate: BAT, marks: range(50, 500, 50) },
  { key: 'career_rbi', label: 'RBI', rate: BAT, marks: range(100, 1000, 100) },
]
const HORIZON = 6   // rounds — anything further out isn't a watch yet

function range(from: number, to: number, step: number) {
  const out: number[] = []
  for (let n = from; n <= to; n += step) out.push(n)
  return out
}

const nameOf = (n: string) => (
  <>{splitName(n).first} <span className="bk-sur">{splitName(n).last}</span></>
)

export default async function BookOfRecords({ searchParams }: { searchParams: Promise<{ grade?: string; rec?: string }> }) {
  const params = await searchParams
  const grade: 'mens' | 'womens' = params.grade === 'womens' ? 'womens' : 'mens'
  const supabase = await createClient()

  // Pool filter: active players only, and no under-18 player without consent
  const { data: players } = await supabase
    .from('players').select('full_name, stats, career_games')
    .eq('grade', grade).eq('active', true)
    .or('is_under18.eq.false,has_consent.eq.true')

  type Chase = { name: string; label: string; now: number; mark: number; needs: number; rounds: number }
  const chasing: Chase[] = []
  for (const p of players ?? []) {
    const stats = (p.stats ?? {}) as Record<string, number>
    for (const w of WATCH) {
      const now = Number(w.key === 'career_games' ? (p.career_games ?? 0) : (stats[w.key] ?? 0))
      if (!now) continue
      const mark = w.marks.find(m => m > now)
      if (mark == null) continue
      const needs = mark - now
      const rounds = needs / w.rate
      if (rounds <= HORIZON) chasing.push({ name: p.full_name, label: w.label, now, mark, needs, rounds })
    }
  }
  chasing.sort((a, b) => a.rounds - b.rounds || b.mark - a.mark)

  // Every milestone reached this season, newest round first. Same pool filter,
  // applied to the player each milestone belongs to.
  const { data: reached } = await supabase
    .from('milestones')
    .select('stat, milestone, round_number, players!inner(full_name, grade)')
    .eq('grade', grade).gt('round_number', 0)
    .neq('stat', 'longevity')
    .eq('players.active', true)
    .or('is_under18.eq.false,has_consent.eq.true', { referencedTable: 'players' })
    .order('round_number', { ascending: false })
    .order('milestone', { ascending: false })
    .limit(500)
  const milestoneEntries: MilestoneEntry[] = ((reached ?? []) as unknown as
    { stat: string; milestone: number; round_number: number; players: { full_name: string } }[])
    .map(e => ({
      name: e.players.full_name,
      stat: e.stat,
      milestone: Number(e.milestone),
      round: Number(e.round_number),
    }))

  // Single-season records: public at launch, admin-only until then
  let showSeason = SEASON_RECORDS_PUBLIC
  if (!SEASON_RECORDS_PUBLIC) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      showSeason = !!profile?.is_admin
    }
  }

  let seasonRecs: SeasonRec[] = []
  let seasonErr: string | null = null
  if (showSeason) {
    const { data, error } = await createAdminClient()
      .from('single_season_records').select('*')
      .eq('grade', grade)
      .order('sort_order', { ascending: true })
      .order('season', { ascending: true })
    if (error) seasonErr = error.message
    seasonRecs = (data ?? []) as SeasonRec[]
  }

  // Group holders under their category, keeping the view's sort order
  const seasonCats: { category: string; holders: SeasonRec[] }[] = []
  for (const r of seasonRecs) {
    const last = seasonCats[seasonCats.length - 1]
    if (last && last.category === r.category) last.holders.push(r)
    else seasonCats.push({ category: r.category, holders: [r] })
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#07090F' }}>
      <Nav />

      <div className="bk-room">
        <style>{`
          /* A candlelit library: warm light low on both sides, cold moonlight
             behind the title, everything else swallowed by the dark. */
          .bk-room {
            flex: 1; position: relative; overflow: hidden;
            padding: calc(env(safe-area-inset-top, 0px) + 104px) 14px 80px;
            background:
              radial-gradient(ellipse 52% 30% at 50% 2%, #16294A 0%, transparent 62%),
              radial-gradient(circle at 3% 22%, #E8983A26 0%, transparent 34%),
              radial-gradient(circle at 97% 16%, #E8983A22 0%, transparent 32%),
              radial-gradient(circle at 8% 78%, #E8983A18 0%, transparent 30%),
              linear-gradient(180deg, #0B1020 0%, #07090F 55%, #05060A 100%);
          }
          .bk-wrap { max-width: 900px; margin: 0 auto; position: relative; z-index: 1; }
          .bk-room, .bk-room :where(h1, h2, p, span, a, div) {
            font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
          }

          /* ── Gold leaf ── */
          .bk-gold {
            background: linear-gradient(180deg, #7A5A18 0%, #C9A247 30%, #FBEFC0 50%, #D8B252 64%, #8A6A22 100%);
            -webkit-background-clip: text; background-clip: text; color: transparent;
            text-shadow: 0 2px 18px #E8983A35;
          }
          .bk-the {
            font-size: clamp(20px, 4vw, 30px); font-style: italic; line-height: 1;
            margin: 0 0 2px; text-align: center;
          }
          .bk-title {
            font-size: clamp(34px, 8.6vw, 68px); line-height: 1.02; letter-spacing: 0.01em;
            margin: 0; text-align: center;
          }
          .bk-lede {
            text-align: center; color: #EBD9AE; opacity: 0.72;
            font-size: 15px; line-height: 1.6; max-width: 34em;
            margin: 16px auto 0;
          }

          /* Rule with a gem in the middle — repeats as a section divider */
          .bk-div { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 22px 0 20px; }
          .bk-div span { height: 1px; width: min(180px, 26vw); background: linear-gradient(90deg, transparent, #C9A24790, transparent); }
          .bk-gem {
            width: 13px; height: 13px; transform: rotate(45deg); flex: none;
            background:
              linear-gradient(135deg, #5C6474 0%, #1B1F28 34%, #04050A 58%, #2C3340 78%, #0A0C12 100%);
            box-shadow:
              inset 0 0 0 1px #E8C15A,
              inset 2px 2px 5px #AFC0DA55,
              inset -2px -2px 6px #000000,
              0 0 12px #9FB4D555;
          }

          /* ── Notched gold frame, used on every panel ── */
          .bk-frame {
            position: relative; background: linear-gradient(180deg, #14161Cf2, #0C0E13f2);
            border: 1px solid #C9A24755;
            clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px),
                               calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px);
            box-shadow: 0 16px 40px #00000090;
          }
          .bk-frame + .bk-frame { margin-top: 18px; }
          .bk-cols .bk-frame + .bk-frame { margin-top: 0; }

          /* ── Grade toggle: one plate split in two, gem on the seam ── */
          .bk-toggle {
            display: flex; align-items: stretch; justify-content: center;
            max-width: 440px; margin: 0 auto; position: relative;
          }
          .bk-half {
            flex: 1; text-align: center; text-decoration: none;
            padding: 16px 10px; font-size: 16px; letter-spacing: 0.14em;
            text-transform: uppercase; color: #C9B98A;
            background: linear-gradient(180deg, #14161C, #0A0C11);
            transition: color 200ms ease, background 200ms ease;
          }
          .bk-half:first-child { clip-path: polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 calc(100% - 14px), 0 14px); }
          .bk-half:last-child { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%); }
          .bk-half:hover { color: #F2E4BD; }
          .bk-half:focus-visible { outline: 2px solid #E8C15A; outline-offset: 3px; }
          .bk-half[data-on='true'] {
            color: #241A08; font-weight: 700;
            background: linear-gradient(180deg, #F3E2B0 0%, #D9BE79 55%, #C2A45D 100%);
            box-shadow: inset 0 0 0 1px #FBEFC0, 0 0 26px #E8C15A40;
          }
          .bk-seam {
            position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(45deg);
            width: 16px; height: 16px; z-index: 2;
            background:
              linear-gradient(135deg, #6A7385 0%, #1B1F28 34%, #04050A 58%, #333B49 78%, #0A0C12 100%);
            box-shadow:
              inset 0 0 0 1.5px #E8C15A,
              inset 2px 2px 6px #C2D2EA66,
              inset -2px -2px 7px #000000,
              0 0 16px #9FB4D566;
          }

          /* ── Section banner ── */
          .bk-banner {
            text-align: center; padding: 18px 20px 16px; margin-bottom: 14px;
            background: linear-gradient(180deg, #123227 0%, #0B1F18 100%);
            border: 1px solid #C9A24766;
            clip-path: polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px),
                               calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px);
            box-shadow: 0 12px 30px #00000080;
          }
          .bk-banner h2 {
            margin: 0; font-size: clamp(20px, 4.6vw, 30px);
            letter-spacing: 0.12em; text-transform: uppercase;
          }
          .bk-banner .bk-div { margin: 10px 0 0; }

          /* ── Watch rows ── */
          .bk-row { display: flex; align-items: center; gap: 16px; padding: 14px 20px; }
          .bk-row + .bk-row { border-top: 1px solid #C9A24722; }
          .bk-togo { width: 58px; flex: none; text-align: center; }
          .bk-togo b { display: block; font-size: 30px; line-height: 1; font-weight: 700; }
          .bk-togo span {
            display: block; font-size: 9px; letter-spacing: 0.22em;
            text-transform: uppercase; color: #C9B98A99; margin-top: 4px;
          }
          .bk-who { flex: 1; min-width: 0; }
          .bk-name { font-size: 18px; color: #F5EEDC; margin: 0 0 2px; }
          .bk-sur { letter-spacing: 0.04em; text-transform: uppercase; }
          .bk-sofar { font-size: 13px; color: #C9B98A8C; margin: 0 0 8px; }
          .bk-track { height: 4px; border-radius: 2px; background: #FFFFFF12; overflow: hidden; }
          .bk-fill { display: block; height: 4px; border-radius: 2px; }
          .bk-mark { flex: none; text-align: right; min-width: 74px; }
          .bk-mark b { display: block; font-size: 26px; line-height: 1; color: #F5EEDC; font-weight: 700; }
          .bk-mark span {
            display: block; font-size: 9px; letter-spacing: 0.18em;
            text-transform: uppercase; color: #C9B98A99; margin-top: 5px;
          }

          /* ── Milestones popout button ── */
          .bk-open {
            cursor: pointer; border: 0; font-family: inherit;
            padding: 13px 32px; font-size: 13px; letter-spacing: 0.2em;
            text-transform: uppercase; color: #241A08; font-weight: 700;
            background: linear-gradient(180deg, #F3E2B0 0%, #D9BE79 55%, #C2A45D 100%);
            box-shadow: inset 0 0 0 1px #FBEFC0, 0 0 26px #E8C15A40;
            clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px),
                               calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);
          }
          .bk-open:focus-visible { outline: 2px solid #E8C15A; outline-offset: 3px; }

          /* ── Records ── */
          /* Cards sit at the top of their row so a taller neighbour can't drag
             the next one down, and each keeps its own height. */
          .bk-cols { display: grid; gap: 18px; align-items: start; grid-auto-rows: min-content; }
          @media (min-width: 720px) { .bk-cols { grid-template-columns: 1fr 1fr; } }
          .bk-set { padding: 16px 20px 14px; }
          .bk-set h3 {
            margin: 0 0 10px; text-align: center; font-size: 15px;
            letter-spacing: 0.2em; text-transform: uppercase;
          }
          .bk-note { text-align: center; font-size: 11px; font-style: italic; color: #C9B98A70; margin: -6px 0 10px; }
          .bk-rec { display: flex; align-items: baseline; gap: 10px; padding: 6px 0; font-size: 15px; }
          .bk-rec + .bk-rec { border-top: 1px solid #C9A2471A; }
          .bk-rank { width: 20px; flex: none; font-size: 12px; color: #C9A24799; }
          .bk-rec-name { flex: 1; min-width: 0; color: #EDE3CC; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .bk-val { flex: none; font-weight: 700; color: #F5EEDC; }
          .bk-first .bk-val { font-size: 17px; }
          .bk-empty { text-align: center; color: #C9B98A8C; font-size: 14px; padding: 26px 20px; font-style: italic; }
          .bk-close { text-align: center; font-size: 12px; font-style: italic; color: #C9B98A70; margin: 26px 0 0; }
          .bk-back {
            display: inline-block; margin: 0 0 14px; text-decoration: none;
            font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
            color: #C9A247; opacity: 0.75; transition: opacity 200ms ease;
          }
          .bk-back:hover { opacity: 1; }
          .bk-back:focus-visible { outline: 2px solid #E8C15A; outline-offset: 4px; }

          /* ── Single-season records ── */
          .bk-preview {
            display: inline-block; margin-top: 10px; padding: 4px 12px;
            font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
            color: #FFB547; border: 1px solid #FFB54780;
          }
          .bk-ss-cat { padding: 10px 0; }
          .bk-ss-cat + .bk-ss-cat { border-top: 1px solid #C9A2471A; }
          .bk-ss-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
          .bk-ss-label { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #C9B98A; }
          .bk-ss-val { font-size: 22px; font-weight: 700; color: #F3DFA4; line-height: 1; }
          .bk-ss-tag { font-size: 10px; font-style: italic; color: #C9B98A99; margin: 0 0 4px; }
          .bk-ss-holder { margin: 2px 0; font-size: 15px; color: #EDE3CC; }
          .bk-ss-meta { font-size: 12px; color: #C9B98A8C; }
        `}</style>

        <div className="bk-wrap">
          <a href="/nfs" className="bk-back">← Back to the NFS Premier League</a>
          <h1 style={{ margin: 0, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/book-of-records.webp" alt="The Book of Records"
              style={{ display: 'block', width: '100%', maxWidth: '760px', height: 'auto', margin: '0 auto' }} />
          </h1>
          <p className="bk-lede">
            Every career mark set in the Premier competition since 2004, and who&apos;s closing in.
          </p>

          <div className="bk-div"><span /><i className="bk-gem" /><span /></div>

          <div className="bk-toggle">
            <a className="bk-half" data-on={grade === 'mens'} href="/nfs/records?grade=mens">Men&apos;s</a>
            <i className="bk-seam" aria-hidden="true" />
            <a className="bk-half" data-on={grade === 'womens'} href="/nfs/records?grade=womens">Women&apos;s</a>
          </div>

          {/* ── Milestone watch ── */}
          <div style={{ marginTop: '34px' }}>
            <div className="bk-banner">
              <h2 className="bk-gold">Milestone Watch</h2>
              <div className="bk-div"><span /><i className="bk-gem" /><span /></div>
            </div>

            <div className="bk-frame">
              {chasing.length === 0 ? (
                <p className="bk-empty">No mark is within reach this week. Come back when the round is scored.</p>
              ) : (
                chasing.slice(0, 12).map((c, i) => {
                  const hot = c.rounds <= 1
                  const warm = c.rounds <= 3
                  const tone = hot ? '#FFB547' : warm ? '#E8C15A' : '#C9A247'
                  const fill = hot
                    ? 'linear-gradient(90deg, #8A6A22, #FFC663)'
                    : warm ? 'linear-gradient(90deg, #6E5218, #E8C15A)'
                      : 'linear-gradient(90deg, #4A3A18, #C9A24799)'
                  const pct = Math.max(4, Math.min(100, (c.now / c.mark) * 100))
                  return (
                    <div key={i} className="bk-row">
                      <span className="bk-togo">
                        <b style={{ color: tone }}>{c.needs}</b>
                        <span>to go</span>
                      </span>
                      <span className="bk-who">
                        <p className="bk-name">{nameOf(c.name)}</p>
                        <p className="bk-sofar">{c.now} {c.label.toLowerCase()}</p>
                        <span className="bk-track"><span className="bk-fill" style={{ width: `${pct}%`, background: fill }} /></span>
                      </span>
                      <span className="bk-mark">
                        <b>{c.mark}</b>
                        <span>{c.label}</span>
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Milestones achieved this season — panel + popout ── */}
          <MilestonesPopout entries={milestoneEntries} />

          {/* ── Single-season records (admin preview until launch) ── */}
          {showSeason && (
            <div style={{ marginTop: '34px' }}>
              <div className="bk-banner">
                <h2 className="bk-gold">Single-Season Records</h2>
                <div className="bk-div"><span /><i className="bk-gem" /><span /></div>
                {!SEASON_RECORDS_PUBLIC && <span className="bk-preview">Admin preview</span>}
              </div>

              {seasonErr ? (
                <div className="bk-frame"><p className="bk-empty">Couldn&apos;t load single-season records: {seasonErr}</p></div>
              ) : seasonCats.length === 0 ? (
                <div className="bk-frame"><p className="bk-empty">No single-season records loaded for this grade.</p></div>
              ) : (
                <SeasonRecords grade={grade} cats={seasonCats} initialRec={params.rec} />
              )}
              <p className="bk-note" style={{ marginTop: '14px' }}>
                Tap a record to see the champion&apos;s season. Batting average, ERA and walks per 7 innings
                count only seasons above that season&apos;s qualifying minimum. ERA is over seven innings.
                No statistics survive for 2013/14.
              </p>
            </div>
          )}

          {/* ── Career records ── */}
          <div style={{ marginTop: '34px' }}>
            <div className="bk-banner">
              <h2 className="bk-gold">Career Records</h2>
              <div className="bk-div"><span /><i className="bk-gem" /><span /></div>
            </div>

            <div className="bk-cols">
              {CAREER_RECORDS[grade].map(set => (
                <section key={set.key} className="bk-frame bk-set">
                  <h3 className="bk-gold">{set.label}</h3>
                  {set.note && <p className="bk-note">{set.note}</p>}
                  {set.rows.map((r, i) => (
                    <div key={i} className={'bk-rec' + (i === 0 ? ' bk-first' : '')}>
                      <span className="bk-rank">{i + 1}</span>
                      <span className="bk-rec-name">{nameOf(r.name)}</span>
                      <span className="bk-val" style={i === 0 ? { color: '#F3DFA4' } : undefined}>{r.value}</span>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>

          <p className="bk-close">
            Career totals from the NFS lifetime stats, 2004 to 2026. Season-by-season marks
            are entered as the older scorebooks are transcribed.
          </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}