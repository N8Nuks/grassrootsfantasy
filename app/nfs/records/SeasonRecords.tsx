'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { splitName } from '@/lib/names'

/* Single-season records list + the champion pop-out.
   Tap a record and its champion's plate rises: the value, the margin over the
   next best, and the full season line as tiles (the record stat glows).
   Each record has its own link (?rec=home-runs) that opens with the plate up. */

export type SeasonRec = {
  category: string; sort_order: number; value: number
  grade: string; season: string; player_name: string; clubs: string | null
  g: number | null; pa: number | null; ab: number | null; h: number | null
  doubles: number | null; triples: number | null; hr: number | null; rbi: number | null
  runs: number | null; bb: number | null; sb: number | null
  p_g: number | null; w: number | null; l: number | null; ip_outs: number | null
  k: number | null; p_bb: number | null; er: number | null
  next_value: number | null
}

type Cat = { category: string; holders: SeasonRec[] }

const slugOf = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const isPitching = (c: string) => /^era$|win|strikeout|pitch|per 7/i.test(c)
const lowWins = (c: string) => /^era$|per 7/i.test(c)
const kind = (c: string): 'avg' | 'rate' | 'count' =>
  /average/i.test(c) ? 'avg' : lowWins(c) ? 'rate' : 'count'

function fmtVal(v: number, c: string) {
  const n = Number(v)
  const k = kind(c)
  if (k === 'avg') return n.toFixed(3).replace(/^0/, '')
  if (k === 'rate') return n.toFixed(2)
  return String(Math.round(n))
}

function unit(c: string, n: number) {
  if (/^rbi$/i.test(c)) return 'RBI'
  const w = c.toLowerCase()
  return n === 1 ? w.replace(/s$/, '') : w
}

function margin(r: SeasonRec) {
  if (r.next_value == null) return null
  const v = Number(r.value)
  const nx = Number(r.next_value)
  const d = lowWins(r.category) ? nx - v : v - nx
  const k = kind(r.category)
  const by = k === 'avg' ? d.toFixed(3).replace(/^0/, '')
    : k === 'rate' ? d.toFixed(2)
      : `${Math.round(d)} ${unit(r.category, Math.round(d))}`
  return { next: fmtVal(nx, r.category), by }
}

const ipOf = (outs: number) => `${Math.floor(outs / 3)}${outs % 3 ? '.' + (outs % 3) : ''}`

// Which tile carries the record, so it can glow
const RECORD_TILE: Record<string, string> = {
  'Batting average': 'BA', 'Hits': 'H', 'Home runs': 'HR', 'RBI': 'RBI', 'Runs': 'R',
  'Stolen bases': 'SB', 'Doubles': '2B', 'Triples': '3B', 'Walks': 'BB',
  'ERA': 'ERA', 'Wins': 'W-L', 'Strikeouts': 'K', 'Fewest walks per 7 innings': 'BB/7',
}

function tiles(r: SeasonRec): [string, string][] {
  const t: [string, string | null][] = isPitching(r.category)
    ? [
        ['G', r.p_g != null ? String(r.p_g) : null],
        ['W-L', r.w != null && r.l != null ? `${r.w}-${r.l}` : null],
        ['IP', r.ip_outs != null ? ipOf(r.ip_outs) : null],
        ['K', r.k != null ? String(r.k) : null],
        ['BB', r.p_bb != null ? String(r.p_bb) : null],
        ['ER', r.er != null ? String(r.er) : null],
        ['ERA', r.er != null && r.ip_outs ? (r.er * 21 / r.ip_outs).toFixed(2) : null],
        ['BB/7', r.p_bb != null && r.ip_outs ? (r.p_bb * 21 / r.ip_outs).toFixed(2) : null],
      ]
    : [
        ['G', r.g != null ? String(r.g) : null],
        ['PA', r.pa != null ? String(r.pa) : null],
        ['AB', r.ab != null ? String(r.ab) : null],
        ['H', r.h != null ? String(r.h) : null],
        ['2B', r.doubles != null ? String(r.doubles) : null],
        ['3B', r.triples != null ? String(r.triples) : null],
        ['HR', r.hr != null ? String(r.hr) : null],
        ['RBI', r.rbi != null ? String(r.rbi) : null],
        ['R', r.runs != null ? String(r.runs) : null],
        ['BB', r.bb != null ? String(r.bb) : null],
        ['SB', r.sb != null ? String(r.sb) : null],
        ['BA', r.h != null && r.ab ? (r.h / r.ab).toFixed(3).replace(/^0/, '') : null],
      ]
  return t.filter((x): x is [string, string] => x[1] != null)
}

const nameOf = (n: string) => (
  <>{splitName(n).first} <span className="bk-sur">{splitName(n).last}</span></>
)

export default function SeasonRecords({ grade, cats, initialRec }: {
  grade: 'mens' | 'womens'; cats: Cat[]; initialRec?: string
}) {
  const valid = new Set(cats.map(c => slugOf(c.category)))
  const [open, setOpen] = useState<string | null>(initialRec && valid.has(initialRec) ? initialRec : null)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Keep the address bar in step, so the link always points at what's open
  useEffect(() => {
    const url = new URL(window.location.href)
    if (open) { url.searchParams.set('rec', open); url.searchParams.set('grade', grade) }
    else url.searchParams.delete('rec')
    window.history.replaceState(null, '', url.toString())
    setCopied(false)
  }, [open])

  // Esc closes, the page behind can't scroll, focus lands on Close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch { /* clipboard blocked — the address bar still has the link */ }
  }

  const cols = [
    { label: 'Batting', cats: cats.filter(c => !isPitching(c.category)) },
    { label: 'Pitching', cats: cats.filter(c => isPitching(c.category)) },
  ]
  const cur = cats.find(c => slugOf(c.category) === open) ?? null
  const top = cur?.holders[0]
  const m = top ? margin(top) : null

  return (
    <>
      <style>{`
        .bk-ss-cat.bk-ss-btn {
          display: block; width: calc(100% + 16px); margin: 0 -8px; padding: 10px 8px;
          text-align: left; background: none; border: 0; cursor: pointer;
          color: inherit; font: inherit; transition: background 200ms ease;
        }
        .bk-ss-cat.bk-ss-btn + .bk-ss-cat.bk-ss-btn { border-top: 1px solid #C9A2471A; }
        .bk-ss-btn:hover { background: #E8C15A0D; }
        .bk-ss-btn:focus-visible { outline: 2px solid #E8C15A; outline-offset: 2px; }
        .bk-ss-more {
          display: block; margin-top: 4px; font-size: 10px; letter-spacing: 0.2em;
          text-transform: uppercase; color: #C9A247; opacity: 0.55; transition: opacity 200ms ease;
        }
        .bk-ss-btn:hover .bk-ss-more { opacity: 1; }

        .bk-pop {
          position: fixed; inset: 0; z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: calc(env(safe-area-inset-top, 0px) + 16px) 16px calc(env(safe-area-inset-bottom, 0px) + 16px);
          background: radial-gradient(ellipse at 50% 40%, #16294ACC 0%, #05060AF2 70%);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          animation: bk-fade 220ms ease-out;
          font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
        }
        .bk-pop * { font-family: inherit; }
        .bk-plate {
          position: relative; width: 100%; max-width: 560px; max-height: 100%; overflow-y: auto;
          padding: 36px 24px 26px; text-align: center;
          background: linear-gradient(180deg, #171A22 0%, #0C0E13 100%);
          border: 1px solid #C9A24799;
          clip-path: polygon(18px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 18px),
                             calc(100% - 18px) 100%, 18px 100%, 0 calc(100% - 18px), 0 18px);
          animation: bk-rise 340ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes bk-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bk-rise { from { opacity: 0; transform: translateY(26px) scale(0.96); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .bk-pop, .bk-plate { animation: none; } }

        .bk-x {
          position: absolute; top: 14px; right: 16px; width: 38px; height: 38px;
          background: none; border: 1px solid #C9A24755; color: #C9B98A;
          font-size: 20px; line-height: 1; cursor: pointer;
        }
        .bk-x:hover { color: #F5EEDC; border-color: #E8C15A; }
        .bk-x:focus-visible { outline: 2px solid #E8C15A; outline-offset: 2px; }
        .bk-pop-cat { font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #C9B98A; margin: 0 0 12px; }
        .bk-pop-val { font-size: clamp(60px, 17vw, 100px); line-height: 1; margin: 0; font-weight: 700; }
        .bk-pop-margin { font-size: 14px; font-style: italic; color: #EBD9AE; opacity: 0.8; margin: 14px 0 0; }
        .bk-pop .bk-div { margin: 20px 0 22px; }

        .bk-champ + .bk-champ { margin-top: 22px; padding-top: 22px; border-top: 1px solid #C9A24722; }
        .bk-champ-name { font-size: clamp(22px, 5.4vw, 28px); color: #F5EEDC; margin: 0; }
        .bk-champ-meta { font-size: 13px; letter-spacing: 0.08em; color: #C9B98A99; margin: 5px 0 14px; }
        .bk-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 6px; }
        .bk-tile { padding: 9px 4px 7px; background: #FFFFFF06; border: 1px solid #C9A24722; }
        .bk-tile b { display: block; font-size: 17px; font-weight: 700; color: #F5EEDC; }
        .bk-tile span { display: block; margin-top: 3px; font-size: 9px; letter-spacing: 0.18em; color: #C9B98A99; }
        .bk-tile-on { border-color: #E8C15A; background: #E8C15A14; box-shadow: 0 0 18px #E8C15A30; }
        .bk-tile-on b { color: #F3DFA4; }

        .bk-share {
          margin-top: 24px; background: none; border: 1px solid #C9A24766; color: #C9A247;
          padding: 11px 20px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer;
        }
        .bk-share:hover { border-color: #E8C15A; color: #F3DFA4; }
        .bk-share:focus-visible { outline: 2px solid #E8C15A; outline-offset: 2px; }
      `}</style>

      <div className="bk-cols">
        {cols.map(col => col.cats.length === 0 ? null : (
          <section key={col.label} className="bk-frame bk-set">
            <h3 className="bk-gold">{col.label}</h3>
            {col.cats.map(({ category, holders }) => (
              <button key={category} type="button" className="bk-ss-cat bk-ss-btn"
                onClick={() => setOpen(slugOf(category))}
                aria-label={`${category}: ${fmtVal(holders[0].value, category)}. Show the champion`}>
                <span className="bk-ss-head">
                  <span className="bk-ss-label">{category}</span>
                  <span className="bk-ss-val">{fmtVal(holders[0].value, category)}</span>
                </span>
                {holders.length > 1 && <span className="bk-ss-tag" style={{ display: 'block' }}>Shared by {holders.length}</span>}
                {holders.length <= 2
                  ? holders.map((h, i) => (
                      <span key={i} className="bk-ss-holder" style={{ display: 'block' }}>
                        {nameOf(h.player_name)}{' '}
                        <span className="bk-ss-meta">{h.clubs ? `${h.clubs} · ` : ''}{h.season}</span>
                      </span>
                    ))
                  : <span className="bk-ss-holder" style={{ display: 'block' }}>
                      {holders.map(h => splitName(h.player_name).last).join(', ')}
                    </span>}
                <span className="bk-ss-more">View champion{holders.length > 1 ? 's' : ''} ›</span>
              </button>
            ))}
          </section>
        ))}
      </div>

      {mounted && cur && top && createPortal(
        <div className="bk-pop" role="dialog" aria-modal="true" aria-label={`${cur.category} record`}
          onClick={() => setOpen(null)}>
          <div className="bk-plate" onClick={e => e.stopPropagation()}>
            <button ref={closeRef} type="button" className="bk-x" onClick={() => setOpen(null)} aria-label="Close">×</button>
            <p className="bk-pop-cat">
              {grade === 'mens' ? "Men's" : "Women's"} · Single season · {cur.category}
            </p>
            <p className="bk-pop-val bk-gold">{fmtVal(top.value, cur.category)}</p>
            {(m || cur.holders.length > 1) && (
              <p className="bk-pop-margin">
                {cur.holders.length > 1 ? `Shared by ${cur.holders.length}` : ''}
                {cur.holders.length > 1 && m ? ' · ' : ''}
                {m ? `Clear of the next best (${m.next}) by ${m.by}` : ''}
              </p>
            )}
            <div className="bk-div"><span /><i className="bk-gem" /><span /></div>

            {cur.holders.map((h, i) => {
              const on = RECORD_TILE[cur.category]
              return (
                <div key={`${h.player_name}-${h.season}-${i}`} className="bk-champ">
                  <p className="bk-champ-name">{nameOf(h.player_name)}</p>
                  <p className="bk-champ-meta">{h.clubs ? `${h.clubs} · ` : ''}{h.season}</p>
                  <div className="bk-tiles" style={{ gridTemplateColumns: `repeat(${tiles(h).length > 8 ? 6 : 4}, minmax(0, 1fr))` }}>
                    {tiles(h).map(([label, val]) => (
                      <div key={label} className={'bk-tile' + (label === on ? ' bk-tile-on' : '')}>
                        <b>{val}</b>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            <button type="button" className="bk-share" onClick={copyLink}>
              {copied ? 'Link copied ✓' : 'Copy link to this record'}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}