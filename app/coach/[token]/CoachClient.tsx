'use client'

import { useEffect, useState, type CSSProperties } from 'react'

export type Entry = {
  key: string
  player_id: string | null
  name: string
  shown: boolean
  pos: string
  number: string | number | null
  active?: boolean
}

type Props = {
  token: string
  grade: 'mens' | 'womens'
  gradeLabel: string
  clubName: string
  roundNumber: number
  dayLabel: string
  closesLabel: string
  closed: boolean
  opponent: string | null
  gameWhen: string | null
  gameWhere: string | null
  sourceNote: string
  submittedLabel: string | null
  batters: Entry[]
  relievers: Entry[]
  squad: Entry[]
  unavailable: string[]
}

const GOLD = '#E8C15A'
const SILVER = '#7FC4FF'
const CYCLE = ['P', 'C', 'IF', 'OF', 'DP']
const slotLabel = (i: number) => (i === 9 ? 'FL' : String(i + 1))

export default function CoachClient(props: Props) {
  const { token, grade, gradeLabel, clubName, roundNumber, dayLabel, closesLabel, closed, sourceNote, opponent, gameWhen, gameWhere } = props
  const accent = grade === 'mens' ? GOLD : SILVER

  const [batters, setBatters] = useState<Entry[]>(props.batters)
  const [relievers, setRelievers] = useState<Entry[]>(props.relievers.filter(e => e.pos !== 'DR'))
  const [runners, setRunners] = useState<Entry[]>(props.relievers.filter(e => e.pos === 'DR'))
  const [squad, setSquad] = useState<Entry[]>(props.squad)
  const [out, setOut] = useState<Set<string>>(new Set(props.unavailable))
  const [swap, setSwap] = useState<{ kind: 'b' | 'r'; i: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savedLabel, setSavedLabel] = useState<string | null>(props.submittedLabel)
  const [canShare, setCanShare] = useState(false)
  const [showOther, setShowOther] = useState(false)
  const [confirmedSig, setConfirmedSig] = useState<string | null>(null)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const editable = !closed
  const isOut = (e: Entry) => !!e.player_id && out.has(e.player_id)

  // A fingerprint of the team on screen. The confirmation panel only shows
  // while the team still matches what was sent.
  const currentSig = JSON.stringify([
    batters.map(b => [b.key, b.pos]),
    relievers.map(r => r.key),
    runners.map(r => r.key),
    [...out].sort(),
  ])
  const showConfirm = confirmedSig !== null && confirmedSig === currentSig

  const btn: CSSProperties = {
    fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', padding: '7px 11px',
    borderRadius: '8px', border: '1px solid #ffffff30', color: '#F5F1E8', background: 'transparent',
  }
  const chip: CSSProperties = { ...btn, minWidth: '46px', textAlign: 'center', borderColor: `${accent}80`, color: accent }

  const gameLine = opponent
    ? (opponent === 'Bye' ? 'Bye this round' : `v ${opponent}`) + (gameWhen ? ` · ${gameWhen}` : '')
    : null

  function move(i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= batters.length) return
    const next = [...batters]
    ;[next[i], next[j]] = [next[j], next[i]]
    setBatters(next)
  }
  function cyclePos(i: number) {
    setBatters(batters.map((b, k) => {
      if (k !== i) return b
      const at = CYCLE.indexOf(b.pos)
      return { ...b, pos: CYCLE[(at + 1) % CYCLE.length] }
    }))
  }
  function toggleOut(e: Entry) {
    if (!e.player_id) return
    const id = e.player_id
    const next = new Set(out)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOut(next)
  }
  function addBatter(e: Entry) {
    if (batters.length >= 10) { setMsg({ ok: false, text: 'The batting order is full. Swap someone out instead.' }); return }
    setBatters([...batters, { ...e, pos: 'IF' }])
    setSquad(squad.filter(s => s.key !== e.key))
    setMsg(null)
  }
  function addReliever(e: Entry) {
    setRelievers([...relievers, { ...e, pos: 'P2' }])
    setSquad(squad.filter(s => s.key !== e.key))
  }
  function removeReliever(i: number) {
    const old = relievers[i]
    setRelievers(relievers.filter((_, k) => k !== i))
    setSquad([...squad, { ...old, pos: '' }])
  }
  function addRunner(e: Entry) {
    if (runners.length >= 2) { setMsg({ ok: false, text: 'You can name up to two designated runners.' }); return }
    setRunners([...runners, { ...e, pos: 'DR' }])
    setSquad(squad.filter(s => s.key !== e.key))
    setMsg(null)
  }
  function removeRunner(i: number) {
    const old = runners[i]
    setRunners(runners.filter((_, k) => k !== i))
    setSquad([...squad, { ...old, pos: '' }])
  }
  function useInSlot(e: Entry) {
    if (!swap) return
    const idx = swap.i
    if (swap.kind === 'b') {
      const old = batters[idx]
      setBatters(batters.map((b, k) => (k === idx ? { ...e, pos: old.pos } : b)))
      setSquad([...squad.filter(s => s.key !== e.key), { ...old, pos: '' }])
    } else {
      const old = relievers[idx]
      setRelievers(relievers.map((r, k) => (k === idx ? { ...e, pos: 'P2' } : r)))
      setSquad([...squad.filter(s => s.key !== e.key), { ...old, pos: '' }])
    }
    setSwap(null)
    setMsg(null)
  }
  function reset() {
    setBatters(props.batters)
    setRelievers(props.relievers.filter(e => e.pos !== 'DR'))
    setRunners(props.relievers.filter(e => e.pos === 'DR'))
    setSquad(props.squad)
    setOut(new Set(props.unavailable))
    setSwap(null)
    setMsg(null)
  }

  const outNames = [...batters, ...relievers, ...runners, ...squad]
    .filter(e => e.player_id && out.has(e.player_id)).map(e => e.name)

  /* Plain-text copy of the team as it stands on screen, for the coach to keep */
  function buildText() {
    const lines: string[] = []
    lines.push(`${clubName} · ${gradeLabel} · Round ${roundNumber} · ${dayLabel}`)
    if (gameLine) lines.push(gameLine)
    if (gameWhere) lines.push(gameWhere)
    lines.push('')
    batters.forEach((e, i) => lines.push(`${slotLabel(i)}  ${e.name} (${e.pos})`))
    if (relievers.length) {
      lines.push('')
      lines.push('Relief: ' + relievers.map(e => e.name).join(', '))
    }
    if (runners.length) lines.push('DR: ' + runners.map(e => e.name).join(', '))
    if (outNames.length) lines.push('Unavailable: ' + outNames.join(', '))
    return lines.join('\n')
  }
  async function copyText() {
    const text = buildText()
    try {
      await navigator.clipboard.writeText(text)
      setMsg({ ok: true, text: 'Lineup copied.' })
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setMsg({ ok: true, text: 'Lineup copied.' })
      } catch {
        setMsg({ ok: false, text: 'Couldn\'t copy. Try again.' })
      }
    }
  }
  async function shareText() {
    try {
      await navigator.share({ title: `${clubName} lineup`, text: buildText() })
    } catch {
      // closed without sending
    }
  }

  async function submit() {
    setMsg(null)
    const blocked = [...batters, ...relievers, ...runners].find(e => isOut(e))
    if (blocked) { setMsg({ ok: false, text: `${blocked.name} is marked unavailable. Swap them out first.` }); return }
    if (batters.length < 9) { setMsg({ ok: false, text: 'Name at least nine batters.' }); return }

    const lineup = [
      ...batters.map((e, i) => ({
        player_id: e.player_id, player_name: e.player_id ? null : e.name, bat_order: i + 1, pos: e.pos,
      })),
      ...relievers.map(e => ({
        player_id: e.player_id, player_name: e.player_id ? null : e.name, bat_order: null, pos: 'P2',
      })),
      ...runners.map(e => ({
        player_id: e.player_id, player_name: e.player_id ? null : e.name, bat_order: null, pos: 'DR',
      })),
    ]
    const inLineup = new Set([...batters, ...relievers, ...runners].map(e => e.player_id).filter(Boolean) as string[])
    const unavailable = [...out].filter(id => !inLineup.has(id)).map(player_id => ({ player_id }))
    const sentSig = currentSig

    setSaving(true)
    try {
      const res = await fetch('/api/coach-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lineup, unavailable }),
      })
      const data = await res.json()
      if (res.ok) {
        setConfirmedSig(sentSig)
        setSavedLabel('just now')
        setMsg(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setMsg({ ok: false, text: data.error ?? 'That didn\'t save. Try again.' })
      }
    } catch {
      setMsg({ ok: false, text: 'That didn\'t save. Check your connection and try again.' })
    }
    setSaving(false)
  }

  const tag = (e: Entry) => !e.shown && (
    <span className="block text-[10px] text-white/50" style={{ marginTop: '2px' }}>* Not shown in GF</span>
  )

  const swapLabel = swap ? (swap.kind === 'b' ? `slot ${slotLabel(swap.i)}` : 'the relief pitcher spot') : ''

  // This year's players first; players on file but marked inactive sit in their own group
  const sortSquad = (list: Entry[]) => [...list].sort((a, b) =>
    a.shown !== b.shown ? (a.shown ? -1 : 1) : a.name.localeCompare(b.name))
  const mainSquad = sortSquad(squad.filter(e => e.active !== false))
  const otherSquad = sortSquad(squad.filter(e => e.active === false))

  const squadRow = (e: Entry) => {
    const flagged = isOut(e)
    return (
      <div key={e.key} style={{ padding: '10px 0', borderBottom: '1px solid #ffffff10' }}>
        <div className="flex items-center gap-3">
          <span className="w-6 shrink-0 text-[10px] text-white/40">{e.number ?? ''}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm text-white/85 truncate">{e.name}</span>
            {tag(e)}
          </span>
          {flagged && <span className="text-[10px]" style={{ color: '#F09595' }}>Unavailable</span>}
        </div>
        {editable && (
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: '8px', marginLeft: '36px' }}>
            {!flagged && swap && (
              <button type="button" onClick={() => useInSlot(e)} style={{ ...btn, borderColor: accent, color: accent }}>
                Use in {swapLabel}
              </button>
            )}
            {!flagged && !swap && (
              <>
                <button type="button" onClick={() => addBatter(e)} style={btn}>Add to batting order</button>
                <button type="button" onClick={() => addReliever(e)} style={btn}>Add as relief pitcher</button>
                <button type="button" onClick={() => addRunner(e)} style={btn}>Add as DR</button>
              </>
            )}
            {e.player_id && (
              <button type="button" onClick={() => toggleOut(e)} style={btn}>{flagged ? 'Available' : 'Unavailable'}</button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen" style={{ background: '#0D0D0F', paddingBottom: '150px' }}>
      <div style={{ maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
        <header style={{ padding: '22px 18px 14px', borderBottom: '1px solid #ffffff14' }}>
          <p className="text-[11px] text-white/55">{gradeLabel} · Round {roundNumber} · {dayLabel}</p>
          <h1 className="text-xl font-black text-white" style={{ marginTop: '2px' }}>{clubName}</h1>
          {gameLine && (
            <p className="text-sm font-bold" style={{ color: accent, marginTop: '6px' }}>{gameLine}</p>
          )}
          {gameWhere && opponent !== 'Bye' && (
            <p className="text-[11px] text-white/55" style={{ marginTop: '2px' }}>{gameWhere}</p>
          )}
          <p className="text-[11px] text-white/55" style={{ marginTop: '6px' }}>
            {closed ? 'Lineups are closed for this round' : closesLabel ? `Lineup closes ${closesLabel}` : ''}
          </p>
        </header>

        {showConfirm && (
          <div style={{ margin: '14px 18px 0', padding: '16px', borderRadius: '12px', border: `1px solid ${accent}`, background: `${accent}14` }}>
            <p className="text-sm font-black uppercase tracking-widest" style={{ color: accent }}>Your team is in</p>
            <p className="text-[11px] text-white/60" style={{ marginTop: '4px' }}>
              Sent {savedLabel ?? 'just now'}. You can keep changing it until the round closes.
            </p>
            <div style={{ marginTop: '12px' }}>
              {batters.map((e, i) => (
                <p key={e.key} className="text-xs text-white/85" style={{ padding: '3px 0' }}>
                  <span className="font-black" style={{ color: accent, display: 'inline-block', width: '26px' }}>{slotLabel(i)}</span>
                  {e.name} <span className="text-white/45">({e.pos})</span>
                </p>
              ))}
              {relievers.length > 0 && (
                <p className="text-xs text-white/70" style={{ marginTop: '8px' }}>Relief: {relievers.map(e => e.name).join(', ')}</p>
              )}
              {runners.length > 0 && (
                <p className="text-xs text-white/70" style={{ marginTop: '4px' }}>DR: {runners.map(e => e.name).join(', ')}</p>
              )}
              {outNames.length > 0 && (
                <p className="text-xs" style={{ marginTop: '4px', color: '#F09595' }}>Unavailable: {outNames.join(', ')}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: '14px' }}>
              <button type="button" onClick={copyText} style={btn}>Copy lineup</button>
              {canShare && <button type="button" onClick={shareText} style={btn}>Send to myself</button>}
            </div>
          </div>
        )}

        <div style={{ padding: '12px 18px', background: `${accent}18`, marginTop: showConfirm ? '14px' : 0 }}>
          <p className="text-xs leading-relaxed" style={{ color: accent }}>
            Name your real team. Players tagged &quot;Not shown in GF&quot; stay in your team but are never added to or displayed on Grassroots Fantasy.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3" style={{ padding: '10px 18px' }}>
          <span className="text-[11px] text-white/55">{sourceNote}</span>
          {editable && <button type="button" onClick={reset} style={btn}>Same as last week</button>}
        </div>

        {swap && (
          <div style={{ padding: '10px 18px', background: '#ffffff0d' }}>
            <p className="text-xs text-white/85">Pick who goes in {swapLabel} from the squad list below.</p>
            <button type="button" onClick={() => setSwap(null)} style={{ ...btn, marginTop: '8px' }}>Cancel swap</button>
          </div>
        )}

        <section style={{ padding: '4px 18px' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45" style={{ padding: '10px 0 4px' }}>Batting order</p>
          <p className="text-[10px] text-white/40" style={{ paddingBottom: '6px' }}>FL = Flex, the 10th batting spot. Optional: only use it if you play a DP.</p>
          {batters.map((e, i) => {
            const flagged = isOut(e)
            return (
              <div key={e.key} style={{
                padding: '10px 0', borderBottom: '1px solid #ffffff10',
                background: flagged ? '#E24B4A18' : 'transparent',
                outline: swap && swap.kind === 'b' && swap.i === i ? `1px solid ${accent}` : 'none',
              }}>
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-xs font-black" style={{ color: accent }}>{slotLabel(i)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-white/90 truncate"
                      style={{ textDecoration: flagged ? 'line-through' : 'none' }}>{e.name}</span>
                    {flagged
                      ? <span className="block text-[10px]" style={{ color: '#F09595' }}>Unavailable. Swap them out</span>
                      : tag(e)}
                  </span>
                  {editable && (
                    <>
                      <button type="button" onClick={() => cyclePos(i)} style={chip} aria-label={`Position for ${e.name}`}>{e.pos}</button>
                      <button type="button" onClick={() => move(i, -1)} style={btn} aria-label="Move up">▲</button>
                      <button type="button" onClick={() => move(i, 1)} style={btn} aria-label="Move down">▼</button>
                    </>
                  )}
                  {!editable && <span className="text-[11px] font-black text-white/60">{e.pos}</span>}
                </div>
                {editable && (
                  <div className="flex items-center gap-2" style={{ marginTop: '8px', marginLeft: '36px' }}>
                    <button type="button" onClick={() => { setSwap({ kind: 'b', i }); setMsg(null) }} style={btn}>Swap</button>
                    {e.player_id && (
                      <button type="button" onClick={() => toggleOut(e)} style={btn}>{flagged ? 'Available' : 'Unavailable'}</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </section>

        <section style={{ padding: '4px 18px' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45" style={{ padding: '14px 0 4px' }}>Relief pitchers used last time</p>
          {relievers.length === 0 && <p className="text-[11px] text-white/40" style={{ padding: '6px 0' }}>None named</p>}
          {relievers.map((e, i) => {
            const flagged = isOut(e)
            return (
              <div key={e.key} className="flex items-center gap-3" style={{ padding: '10px 0', borderBottom: '1px solid #ffffff10' }}>
                <span className="w-6 shrink-0 text-xs font-black text-white/50">P2</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white/90 truncate" style={{ textDecoration: flagged ? 'line-through' : 'none' }}>{e.name}</span>
                  {flagged ? <span className="block text-[10px]" style={{ color: '#F09595' }}>Unavailable. Swap them out</span> : tag(e)}
                </span>
                {editable && (
                  <>
                    <button type="button" onClick={() => { setSwap({ kind: 'r', i }); setMsg(null) }} style={btn}>Swap</button>
                    <button type="button" onClick={() => removeReliever(i)} style={btn}>Remove</button>
                  </>
                )}
              </div>
            )
          })}
        </section>

        <section style={{ padding: '4px 18px' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45" style={{ padding: '14px 0 4px' }}>Designated runners (optional, up to 2)</p>
          {runners.length === 0 && <p className="text-[11px] text-white/40" style={{ padding: '6px 0' }}>None named. Add one from the squad list below.</p>}
          {runners.map((e, i) => {
            const flagged = isOut(e)
            return (
              <div key={e.key} className="flex items-center gap-3" style={{ padding: '10px 0', borderBottom: '1px solid #ffffff10' }}>
                <span className="w-6 shrink-0 text-xs font-black text-white/50">DR</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white/90 truncate" style={{ textDecoration: flagged ? 'line-through' : 'none' }}>{e.name}</span>
                  {flagged ? <span className="block text-[10px]" style={{ color: '#F09595' }}>Unavailable. Remove them</span> : tag(e)}
                </span>
                {editable && <button type="button" onClick={() => removeRunner(i)} style={btn}>Remove</button>}
              </div>
            )
          })}
        </section>

        <section style={{ padding: '4px 18px' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45" style={{ padding: '14px 0 4px' }}>
            Squad ({mainSquad.length})
          </p>
          {mainSquad.map(squadRow)}
        </section>

        {otherSquad.length > 0 && (
          <section style={{ padding: '4px 18px' }}>
            <button type="button" onClick={() => setShowOther(!showOther)}
              className="w-full flex items-center justify-between"
              style={{ padding: '14px 0 8px', background: 'transparent', border: 'none' }}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                Other players on file ({otherSquad.length})
              </span>
              <span className="text-[11px] text-white/45">{showOther ? 'Hide' : 'Show'}</span>
            </button>
            {showOther && otherSquad.map(squadRow)}
          </section>
        )}

        <p className="text-[10px] text-white/35 text-center" style={{ padding: '18px 18px 0' }}>
          This page shows your club only. Teams on Grassroots Fantasy are projected and not confirmed.
        </p>
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#0D0D0F', borderTop: '1px solid #ffffff14', padding: '12px 18px 16px' }}>
        <div style={{ maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
          {msg && (
            <p className="text-xs" style={{ color: msg.ok ? accent : '#F09595', marginBottom: '8px' }}>{msg.text}</p>
          )}
          {closed ? (
            <p className="text-xs text-white/60 text-center">Lineups are closed for this round. Contact GF if your team needs to change.</p>
          ) : (
            <button type="button" onClick={submit} disabled={saving}
              className="w-full text-sm font-black uppercase tracking-widest rounded-full"
              style={{ color: '#0D0D0F', background: accent, padding: '14px', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : showConfirm ? 'Sent. Submit again to update' : 'Submit lineup'}
            </button>
          )}
          <div className="flex items-center justify-center gap-3" style={{ marginTop: '8px' }}>
            <button type="button" onClick={copyText} style={btn}>Copy lineup</button>
            {canShare && <button type="button" onClick={shareText} style={btn}>Send to myself</button>}
          </div>
          {!closed && (
            <p className="text-[10px] text-white/45 text-center" style={{ marginTop: '6px' }}>
              {savedLabel ? `Last sent ${savedLabel}. ` : ''}You can resubmit until it closes.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}