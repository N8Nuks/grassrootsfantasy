'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ArcadeShare from '@/components/ArcadeShare'

type Q = { prompt: string; answer: string; options: string[] }
type Phase = 'setup' | 'playing' | 'won' | 'lost' | 'walked'

/* Four tiers on the climb. Reaching one banks it, so a fall later still leaves
   you with the badge you earned — the only currency in a free game is what you
   can tell people afterwards. */
const TIERS = [
  { from: 1, to: 4, name: 'Common', colour: '#3FBF63' },
  { from: 5, to: 9, name: 'Elite', colour: '#4DA6FF' },
  { from: 10, to: 14, name: '2WP', colour: '#E8C15A' },
  { from: 15, to: 15, name: 'Immortal', colour: '#FFD400' },
]
const tierAt = (q: number) => TIERS.find(t => q >= t.from && q <= t.to) ?? TIERS[0]
// Banked = the highest tier whose opening question you actually answered
const banked = (answered: number) => {
  if (answered >= 15) return TIERS[3]
  if (answered >= 14) return TIERS[2]
  if (answered >= 9) return TIERS[1]
  if (answered >= 4) return TIERS[0]
  return null
}

const GOLD = '#FFD400'
const INK = '#05060A'

export default function WhoKnowsClient() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [grade, setGrade] = useState<'all' | 'mens' | 'womens'>('all')
  const [qNum, setQNum] = useState(1)
  const [q, setQ] = useState<Q | null>(null)
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [removed, setRemoved] = useState<string[]>([])
  const [used, setUsed] = useState<{ twoDown: boolean; bullpen: boolean; bleachers: boolean }>(
    { twoDown: false, bullpen: false, bleachers: false })
  const [bullpen, setBullpen] = useState<string | null>(null)
  const [bleachers, setBleachers] = useState<Record<string, number> | null>(null)

  async function pull(n: number) {
    setLoading(true); setPicked(null); setRevealed(false)
    setRemoved([]); setBullpen(null); setBleachers(null)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('quiz_question', { p_difficulty: n, p_grade: grade })
    setLoading(false)
    if (error || !data) { alert('Could not load a question — try again.'); return }
    setQ(data as Q)
  }

  async function start() {
    setQNum(1); setPhase('playing')
    await pull(1)
  }

  function choose(opt: string) {
    if (picked || revealed) return
    setPicked(opt)
    // A beat before the reveal, so the pick registers
    setTimeout(() => {
      setRevealed(true)
      setTimeout(() => {
        if (opt !== q?.answer) { setPhase('lost'); return }
        if (qNum === 15) { setPhase('won'); return }
        const next = qNum + 1
        setQNum(next)
        pull(next)
      }, 1600)
    }, 700)
  }

  function twoDown() {
    if (!q || used.twoDown) return
    const wrong = q.options.filter(o => o !== q.answer).sort(() => Math.random() - 0.5)
    setRemoved(wrong.slice(0, 2))
    setUsed(u => ({ ...u, twoDown: true }))
  }

  function callBullpen() {
    if (!q || used.bullpen) return
    /* The bullpen is good, not infallible — and less sure the deeper you are,
       which is what makes it worth spending early. */
    const sure = qNum <= 5 ? 0.9 : qNum <= 10 ? 0.75 : 0.6
    const live = q.options.filter(o => !removed.includes(o))
    const pick = Math.random() < sure
      ? q.answer
      : live.filter(o => o !== q.answer)[Math.floor(Math.random() * Math.max(live.length - 1, 1))]
    setBullpen(pick ?? q.answer)
    setUsed(u => ({ ...u, bullpen: true }))
  }

  function askBleachers() {
    if (!q || used.bleachers) return
    const live = q.options.filter(o => !removed.includes(o))
    const lean = qNum <= 5 ? 58 : qNum <= 10 ? 44 : 34   // the crowd gets shakier too
    const out: Record<string, number> = {}
    let left = 100 - lean
    live.forEach((o, i) => {
      if (o === q.answer) return
      const share = i === live.length - 1 ? left : Math.floor(Math.random() * left * 0.7)
      out[o] = share; left -= share
    })
    out[q.answer] = lean + left
    setBleachers(out)
    setUsed(u => ({ ...u, bleachers: true }))
  }

  const bank = banked(qNum - 1)
  const tier = tierAt(qNum)

  const lifeline = (label: string, sub: string, on: boolean, fn: () => void) => (
    <button onClick={fn} disabled={on || revealed || loading}
      className="ar-panel"
      style={{
        flex: 1, padding: '10px 6px', cursor: on ? 'default' : 'pointer',
        opacity: on ? 0.25 : 1, textDecoration: on ? 'line-through' : 'none',
        border: `1px solid ${GOLD}55`, background: 'transparent',
      }}>
      <span style={{ display: 'block', color: GOLD, fontWeight: 900, fontSize: '12px', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ display: 'block', color: '#8FA0B4', fontSize: '9px', marginTop: '3px' }}>{sub}</span>
    </button>
  )

  /* ── Setup ── */
  if (phase === 'setup') {
    return (
      <div>
        <p className="ar-lede" style={{ marginBottom: '22px' }}>
          Fifteen questions on twenty-two seasons of NFS Premier softball. One wrong answer and
          you&apos;re out — but every tier you reach is yours to keep.
        </p>

        <div className="ar-panel" style={{ padding: '16px 18px', marginBottom: '20px' }}>
          {TIERS.map(t => (
            <div key={t.name} className="flex items-center justify-between" style={{ padding: '6px 0' }}>
              <span style={{ color: t.colour, fontWeight: 900, fontSize: '13px', letterSpacing: '0.12em' }}>
                {t.name.toUpperCase()}
              </span>
              <span style={{ color: '#8FA0B4', fontSize: '12px' }}>
                {t.from === t.to ? `Question ${t.from}` : `Questions ${t.from}–${t.to}`}
              </span>
            </div>
          ))}
        </div>

        <p style={{ color: '#8FA0B4', fontSize: '11px', letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Which grade
        </p>
        <div className="flex gap-2" style={{ marginBottom: '26px' }}>
          {([['all', 'Both'], ['mens', "Men's"], ['womens', "Women's"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setGrade(v)}
              style={{
                flex: 1, padding: '12px 0', fontWeight: 900, fontSize: '12px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: grade === v ? INK : GOLD,
                background: grade === v ? GOLD : 'transparent',
                border: `1px solid ${GOLD}70`,
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="text-center">
          <button className="ar-btn" onClick={start}><span>Take the chair</span></button>
        </div>
      </div>
    )
  }

  /* ── Finished ── */
  if (phase !== 'playing') {
    const reached = phase === 'won' ? TIERS[3] : bank
    const line = phase === 'won'
      ? 'All fifteen. Immortal.'
      : phase === 'walked'
        ? `Walked away at question ${qNum} — ${reached?.name ?? 'nothing'} banked`
        : `Out at question ${qNum} — ${reached?.name ?? 'nothing banked'}`
    return (
      <div className="text-center">
        <p className="ar-num" style={{ fontSize: '72px', color: reached?.colour ?? '#64748B' }}>
          {phase === 'won' ? 15 : qNum - (phase === 'lost' ? 1 : 0)}
        </p>
        <p style={{ color: '#8FA0B4', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '18px' }}>
          Questions answered
        </p>
        <p style={{
          color: reached?.colour ?? '#64748B', fontFamily: 'var(--font-heading)',
          fontSize: '26px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {reached ? reached.name : 'No tier'}
        </p>
        {phase === 'lost' && q && (
          <p style={{ color: '#8FA0B4', fontSize: '13px', marginTop: '16px' }}>
            The answer was <b style={{ color: '#F5F1E8' }}>{q.answer}</b>.
          </p>
        )}
        <div style={{ marginTop: '26px' }}>
          <ArcadeShare lines={[`Who Thinks They Know The NFS — ${line}`]} />
        </div>
        <div style={{ marginTop: '22px' }}>
          <button className="ar-btn" onClick={() => setPhase('setup')}><span>Play again</span></button>
        </div>
      </div>
    )
  }

  /* ── Playing ── */
  return (
    <div>
      {/* The climb */}
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <span style={{ color: tier.colour, fontWeight: 900, fontSize: '12px', letterSpacing: '0.14em' }}>
          {tier.name.toUpperCase()}
        </span>
        <span style={{ color: '#8FA0B4', fontSize: '12px' }}>
          Question {qNum} of 15{bank ? ` · ${bank.name} banked` : ''}
        </span>
      </div>
      <div style={{ height: '4px', background: '#ffffff12', marginBottom: '24px' }}>
        <div style={{ height: '4px', width: `${(qNum / 15) * 100}%`, background: tier.colour }} />
      </div>

      {/* Lifelines */}
      <div className="flex gap-2" style={{ marginBottom: '22px' }}>
        {lifeline('TWO DOWN', 'lose two wrong', used.twoDown, twoDown)}
        {lifeline('CALL THE BULLPEN', 'ask a teammate', used.bullpen, callBullpen)}
        {lifeline('ASK THE BLEACHERS', 'poll the crowd', used.bleachers, askBleachers)}
      </div>

      {bullpen && (
        <p className="ar-panel" style={{ padding: '12px 16px', color: '#8FA0B4', fontSize: '13px', marginBottom: '16px' }}>
          The bullpen reckons it&apos;s <b style={{ color: GOLD }}>{bullpen}</b>. Pretty sure, anyway.
        </p>
      )}

      {/* The question */}
      {loading || !q ? (
        <p style={{ color: '#8FA0B4', textAlign: 'center', padding: '40px 0' }}>Next question…</p>
      ) : (
        <>
          <div className="ar-panel" style={{ padding: '22px 20px', marginBottom: '18px' }}>
            <p style={{ color: '#F5F1E8', fontSize: '18px', lineHeight: 1.45, textAlign: 'center' }}>{q.prompt}</p>
          </div>

          <div className="flex flex-col gap-2">
            {q.options.map((o, i) => {
              const gone = removed.includes(o)
              const isAnswer = revealed && o === q.answer
              const isWrongPick = revealed && picked === o && o !== q.answer
              const share = bleachers?.[o]
              return (
                <button key={i} onClick={() => choose(o)} disabled={gone || !!picked}
                  className="ar-panel relative text-left"
                  style={{
                    padding: '14px 16px', opacity: gone ? 0.2 : 1,
                    cursor: gone || picked ? 'default' : 'pointer',
                    border: `1px solid ${isAnswer ? '#3FBF63' : isWrongPick ? '#FF6B6B' : GOLD + '45'}`,
                    background: isAnswer ? '#3FBF6318' : isWrongPick ? '#FF6B6B18'
                      : picked === o ? GOLD + '20' : 'transparent',
                  }}>
                  {share != null && (
                    <span style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: `${share}%`,
                      background: '#ffffff0A', pointerEvents: 'none',
                    }} />
                  )}
                  <span className="relative flex items-center justify-between gap-3">
                    <span style={{ color: '#F5F1E8', fontSize: '15px' }}>
                      <b style={{ color: GOLD, marginRight: '10px' }}>{'ABCD'[i]}</b>{gone ? '' : o}
                    </span>
                    {share != null && <span style={{ color: '#8FA0B4', fontSize: '12px' }}>{share}%</span>}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Walking away keeps the tier you've banked */}
          {bank && !picked && (
            <div className="text-center" style={{ marginTop: '22px' }}>
              <button onClick={() => setPhase('walked')}
                style={{
                  color: '#8FA0B4', fontSize: '11px', letterSpacing: '0.2em',
                  textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer',
                }}>
                Walk away with {bank.name}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}