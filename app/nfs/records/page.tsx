import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { CAREER_RECORDS } from '@/lib/nfsRecords'
import { splitName } from '@/lib/names'

/* Milestone scales, the same ones the scoring run records against. Games every
   50, hits and RBI every 100, home runs every 50, pitching strikeouts every 100
   from 200. A player appears once they're within the window of the next one. */
const WATCH: { key: string; label: string; window: number; marks: number[] }[] = [
  { key: 'career_games', label: 'games', window: 15, marks: range(50, 1000, 50) },
  { key: 'career_h', label: 'hits', window: 15, marks: range(100, 1000, 100) },
  { key: 'career_hr', label: 'home runs', window: 5, marks: range(50, 500, 50) },
  { key: 'career_rbi', label: 'runs batted in', window: 12, marks: range(100, 1000, 100) },
  { key: 'career_k', label: 'strikeouts', window: 50, marks: range(200, 2000, 100) },
]
function range(from: number, to: number, step: number) {
  const out: number[] = []
  for (let n = from; n <= to; n += step) out.push(n)
  return out
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V']
const STAT_WORD: Record<string, string> = {
  games: 'games', hits: 'hits', hr: 'home runs', rbi: 'runs batted in', k_pit: 'strikeouts',
}

const nameOf = (n: string) => (
  <>{splitName(n).first} <span className="sc-sur">{splitName(n).last}</span></>
)

export default async function BookOfRecords({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: 'mens' | 'womens' = params.grade === 'womens' ? 'womens' : 'mens'
  const supabase = await createClient()

  const { data: players } = await supabase
    .from('players').select('full_name, stats, career_games')
    .eq('grade', grade).eq('active', true)

  type Chase = { name: string; label: string; now: number; mark: number; needs: number }
  const chasing: Chase[] = []
  for (const p of players ?? []) {
    const stats = (p.stats ?? {}) as Record<string, number>
    for (const w of WATCH) {
      const now = Number(w.key === 'career_games' ? (p.career_games ?? 0) : (stats[w.key] ?? 0))
      if (!now) continue
      const mark = w.marks.find(m => m > now)
      if (mark == null) continue
      const needs = mark - now
      if (needs <= w.window) chasing.push({ name: p.full_name, label: w.label, now, mark, needs })
    }
  }
  chasing.sort((a, b) => a.needs - b.needs || b.mark - a.mark)

  const { data: reached } = await supabase
    .from('milestones')
    .select('stat, milestone, round_number, players!inner(full_name, grade)')
    .eq('grade', grade).gt('round_number', 0)
    .order('round_number', { ascending: false }).limit(12)
  const entries = (reached ?? []) as unknown as
    { stat: string; milestone: number; round_number: number; players: { full_name: string } }[]

  const other = grade === 'mens' ? 'womens' : 'mens'
  const otherLabel = grade === 'mens' ? 'the women' : 'the men'

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#151109' }}>
      <Nav />

      <div className="sc-table">
        <style>{`
          .sc-table {
            flex: 1;
            padding: 92px 16px 70px;
            background:
              radial-gradient(ellipse 70% 50% at 50% 0%, #2A2114 0%, #151109 70%),
              #151109;
          }
          .sc-scroll { max-width: 760px; margin: 0 auto; }

          /* The rollers — turned wood, lit from the left */
          .sc-roller {
            height: 26px;
            border-radius: 13px;
            background:
              linear-gradient(180deg, #6B4A24 0%, #4A3116 38%, #30200E 70%, #4A3116 100%);
            box-shadow: 0 5px 22px #00000090, inset 0 1px 0 #A9793E70;
            position: relative;
          }
          .sc-roller::before, .sc-roller::after {
            content: ''; position: absolute; top: -5px; width: 15px; height: 36px;
            border-radius: 7px;
            background: linear-gradient(180deg, #7A5528, #3B2611);
            box-shadow: 0 3px 10px #00000080;
          }
          .sc-roller::before { left: -13px; }
          .sc-roller::after { right: -13px; }

          /* The sheet — mottled, foxed at the edges, torn down both sides */
          .sc-sheet {
            position: relative;
            padding: 54px 34px 46px;
            color: #2E2416;
            background:
              radial-gradient(ellipse 55% 30% at 18% 12%, #00000010, transparent 70%),
              radial-gradient(ellipse 45% 26% at 82% 62%, #00000012, transparent 72%),
              radial-gradient(circle at 30% 84%, #8A6A3418, transparent 55%),
              linear-gradient(104deg, #D9C69C 0%, #EDDCB6 22%, #E7D5AC 55%, #D3BE91 100%);
            box-shadow: inset 0 0 70px #7A5A2A38, 0 18px 40px #00000070;
            /* ragged vertical edges */
            clip-path: polygon(
              1% 0%, 99% 0%, 99.4% 4%, 98.6% 9%, 99.5% 15%, 98.8% 22%, 99.6% 30%,
              98.7% 38%, 99.5% 46%, 98.6% 55%, 99.4% 63%, 98.7% 72%, 99.5% 80%,
              98.8% 88%, 99.4% 95%, 99% 100%, 1% 100%, 0.6% 95%, 1.3% 88%,
              0.5% 80%, 1.2% 72%, 0.4% 63%, 1.3% 55%, 0.5% 46%, 1.2% 38%,
              0.4% 30%, 1.3% 22%, 0.5% 15%, 1.2% 9%, 0.4% 4%
            );
          }
          @media (min-width: 640px) { .sc-sheet { padding: 62px 68px 54px; } }

          .sc-sheet, .sc-sheet * {
            font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
          }

          .sc-title {
            font-size: clamp(30px, 6.4vw, 46px);
            line-height: 1.05;
            letter-spacing: 0.01em;
            text-align: center;
            margin: 0 0 6px;
            font-weight: 600;
          }
          .sc-sub {
            text-align: center; font-size: 14px; font-style: italic;
            color: #5E4B2E; margin: 0 0 26px;
          }
          .sc-rule {
            border: 0; height: 0;
            border-top: 1.5px solid #6B5432;
            border-bottom: 0.5px solid #6B543255;
            margin: 26px 0 22px;
          }
          .sc-hand {
            text-align: center; font-size: 15px; font-style: italic;
            color: #4A3A22; margin: 0 0 18px;
          }

          .sc-head {
            font-size: 19px; font-weight: 600; margin: 0 0 2px;
          }
          .sc-note { font-size: 12px; font-style: italic; color: #6B5836; margin: 0 0 8px; }
          .sc-sur { letter-spacing: 0.06em; }

          /* Ledger line with dotted leader, as in an old subscription list */
          .sc-line {
            display: flex; align-items: baseline; gap: 8px;
            padding: 5px 0; font-size: 15px;
          }
          .sc-leader {
            flex: 1; border-bottom: 1px dotted #7A6540; transform: translateY(-4px);
          }
          .sc-rank { width: 26px; flex: none; color: #6B5432; font-size: 13px; }
          .sc-first .sc-fig { font-weight: 700; }
          .sc-fig { font-variant-numeric: lining-nums tabular-nums; }

          .sc-cols { columns: 1; column-gap: 46px; }
          @media (min-width: 640px) { .sc-cols { columns: 2; } }
          .sc-block { break-inside: avoid; margin: 0 0 26px; }

          .sc-watch { margin: 0 0 6px; }
          .sc-near { font-weight: 700; }

          /* Grade tabs — inked, the current one circled by hand */
          .sc-tabs { display: flex; justify-content: center; gap: 26px; margin: 0 0 4px; }
          .sc-tab {
            font-size: 15px; color: #6B5432; text-decoration: none; padding: 3px 12px;
          }
          .sc-tab[data-on='true'] {
            color: #2E2416;
            border: 1.5px solid #8C2A2A80;
            border-radius: 48% 52% 49% 51% / 58% 42% 58% 42%;
          }
          .sc-tab:hover { color: #2E2416; }
          .sc-tab:focus-visible { outline: 2px solid #8C2A2A; outline-offset: 3px; }

          /* Wax seal at the foot */
          .sc-seal {
            width: 74px; height: 74px; margin: 30px auto 0;
            border-radius: 46% 54% 52% 48% / 52% 48% 54% 46%;
            background: radial-gradient(circle at 34% 30%, #B23A34, #7E1E1C 62%, #5E1413);
            box-shadow: 0 4px 12px #00000060, inset 0 -3px 8px #00000055;
            display: flex; align-items: center; justify-content: center;
            color: #E7CFA6; font-size: 19px; letter-spacing: 0.08em;
          }
          .sc-foot {
            text-align: center; font-size: 12px; font-style: italic;
            color: #6B5836; margin: 12px 0 0;
          }
          .sc-empty { font-style: italic; color: #6B5836; font-size: 14px; }
        `}</style>

        <div className="sc-scroll">
          <div className="sc-roller" />

          <div className="sc-sheet">
            <h1 className="sc-title">The Book of Records</h1>
            <p className="sc-sub">Auckland Premier softball, kept since 2004</p>

            <div className="sc-tabs">
              <a className="sc-tab" data-on={grade === 'mens'} href="/nfs/records?grade=mens">Men&apos;s</a>
              <a className="sc-tab" data-on={grade === 'womens'} href="/nfs/records?grade=womens">Women&apos;s</a>
            </div>

            <hr className="sc-rule" />

            {/* Who is closing in */}
            <p className="sc-hand">Within reach</p>
            {chasing.length === 0 ? (
              <p className="sc-empty" style={{ textAlign: 'center' }}>
                No mark is within reach this week. Come back when the round is scored.
              </p>
            ) : (
              <div className="sc-watch">
                {chasing.slice(0, 12).map((c, i) => (
                  <div key={i} className={'sc-line' + (c.needs <= 2 ? ' sc-near' : '')}>
                    <span>{nameOf(c.name)}</span>
                    <span className="sc-leader" />
                    <span className="sc-fig">
                      {c.needs} from {c.mark} {c.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* What has fallen */}
            {entries.length > 0 && (
              <>
                <hr className="sc-rule" />
                <p className="sc-hand">Reached this season</p>
                {entries.map((e, i) => (
                  <div key={i} className="sc-line">
                    <span>{nameOf(e.players.full_name)}</span>
                    <span className="sc-leader" />
                    <span className="sc-fig">
                      {e.milestone} {STAT_WORD[e.stat] ?? e.stat}, round {e.round_number}
                    </span>
                  </div>
                ))}
              </>
            )}

            <hr className="sc-rule" />
            <p className="sc-hand">The records, 2004 to 2026</p>

            <div className="sc-cols">
              {CAREER_RECORDS[grade].map(set => (
                <section key={set.key} className="sc-block">
                  <h2 className="sc-head">{set.label}</h2>
                  {set.note && <p className="sc-note">{set.note}</p>}
                  {set.rows.map((r, i) => (
                    <div key={i} className={'sc-line' + (i === 0 ? ' sc-first' : '')}>
                      <span className="sc-rank">{ROMAN[i]}</span>
                      <span>{nameOf(r.name)}</span>
                      <span className="sc-leader" />
                      <span className="sc-fig">{r.value}</span>
                    </div>
                  ))}
                </section>
              ))}
            </div>

            <hr className="sc-rule" />
            <p className="sc-sub" style={{ marginBottom: 0 }}>
              Career totals only. Season-by-season marks will be entered when the older
              scorebooks are transcribed. <a href={`/nfs/records?grade=${other}`} style={{ color: '#6B2020' }}>Turn to {otherLabel}.</a>
            </p>

            <div className="sc-seal" aria-hidden="true">NFS</div>
            <p className="sc-foot">Kept by Grassroots Fantasy for the Auckland Softball Association</p>
          </div>

          <div className="sc-roller" style={{ marginTop: '-2px' }} />
        </div>
      </div>

      <Footer />
    </main>
  )
}