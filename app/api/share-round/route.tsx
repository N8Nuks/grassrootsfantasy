import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CSSProperties, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { shareRoundData, type ShareRound } from '@/lib/shareRound'
import { splitName } from '@/lib/names'

/* A manager's round as a picture to post: 1080 x 1350, in one of three looks.
   Drawn on the server, so it looks the same on every phone. Only flexbox and
   plain CSS work here (no grid), and every element with more than one child
   must say display: flex. */

const W = 1080
const H = 1350
const dir = join(process.cwd(), 'assets/share')

// Fonts and logos never change between requests: read them once
const assets = Promise.all([
  readFile(join(dir, 'oxanium-latin-400-normal.woff')),
  readFile(join(dir, 'oxanium-latin-600-normal.woff')),
  readFile(join(dir, 'oxanium-latin-800-normal.woff')),
  readFile(join(dir, 'oxanium-latin-ext-400-normal.woff')),
  readFile(join(dir, 'oxanium-latin-ext-600-normal.woff')),
  readFile(join(dir, 'oxanium-latin-ext-800-normal.woff')),
  readFile(join(dir, 'gf-icon.png'), 'base64'),
  readFile(join(dir, 'bdl-diamond.png'), 'base64'),
])

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const ordinal = (n: number) => {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`
}
const nice = (full: string) => {
  const s = splitName(full)
  return s.last ? `${s.first} ${s.last.toUpperCase()}` : s.first
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const gradeName = (g: ShareRound['grade']) => (g === 'mens' ? "Men's" : "Women's")
const h2hWord = (r: 'W' | 'L' | 'D') => (r === 'W' ? 'Head to head win' : r === 'D' ? 'Head to head draw' : 'Head to head loss')

type Logos = { gf: string; bdl: string }

/* The footer every card carries: Grassroots Fantasy on the left, Black Diamond
   Labs on the right, the site address between the two. */
function Footer({ logos, dim, tone }: { logos: Logos; dim: string; tone: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logos.gf} width={92} height={92} style={{ borderRadius: 20 }} />
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 16 }}>
          <span style={{ fontSize: 31, fontWeight: 800, letterSpacing: 3, color: '#FFFFFF' }}>GRASSROOTS FANTASY</span>
          <span style={{ fontSize: 25, fontWeight: 600, letterSpacing: 2, color: tone, marginTop: 6 }}>grassrootsfantasy.co.nz</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 14 }}>
          <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: 3, color: dim }}>BUILT BY</span>
          <span style={{ fontSize: 25, fontWeight: 800, letterSpacing: 2, color: '#FFFFFF', marginTop: 6 }}>BLACK DIAMOND LABS</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logos.bdl} width={104} height={80} style={{ borderRadius: 12 }} />
      </div>
    </div>
  )
}

function Shell({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <div style={{
      width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: 64, fontFamily: 'Oxanium, OxaniumExt', color: '#FFFFFF', ...style,
    }}>
      {children}
    </div>
  )
}

/* A — Tech: the Manager Report look */
function CardTech({ d, logos }: { d: ShareRound; logos: Logos }) {
  const CY = '#22D3EE', DIM = '#8FB3C2', GOLD = '#FFC425'
  const box: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
    border: `2px solid ${CY}55`, borderRadius: 26, padding: '40px 8px', background: '#0D1422',
  }
  const stats = [
    { v: d.rank ? ordinal(d.rank) : '—', k: d.teams ? `OF ${d.teams}` : 'ROUND' },
    { v: d.h2h ? d.h2h.result : '—', k: 'HEAD TO HEAD' },
    { v: d.seasonRank ? ordinal(d.seasonRank) : '—', k: 'SEASON' },
  ]
  const best = d.top[0]
  return (
    <Shell style={{ background: 'radial-gradient(circle at 50% 0%, #123A52 0%, #070B14 62%)', border: `6px solid ${CY}` }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 8, color: CY }}>
            {`ROUND ${d.round} · ${gradeName(d.grade).toUpperCase()}`}
          </span>
        </div>
        <span style={{ fontSize: 66, fontWeight: 800, marginTop: 50, lineHeight: 1.05 }}>{clip(d.teamName, 34).toUpperCase()}</span>
        <span style={{ fontSize: 350, fontWeight: 800, color: CY, lineHeight: 1, marginTop: 22, textShadow: `0 0 60px ${CY}88` }}>{fmt(d.score)}</span>
        <span style={{ fontSize: 27, fontWeight: 600, letterSpacing: 7, color: DIM, marginTop: 8 }}>
          {d.provisional ? 'POINTS THIS ROUND · PROVISIONAL' : 'POINTS THIS ROUND'}
        </span>
        <div style={{ display: 'flex', marginTop: 52, gap: 22 }}>
          {stats.map(s => (
            <div key={s.k} style={box}>
              <span style={{ fontSize: 76, fontWeight: 800 }}>{s.v}</span>
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 4, color: DIM, marginTop: 10 }}>{s.k}</span>
            </div>
          ))}
        </div>
        {best && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 30,
            borderRadius: 26, padding: '36px 38px', border: `2px solid ${CY}55`,
            background: 'linear-gradient(90deg, #12384A 0%, #3A3216 100%)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: 5, color: CY }}>BEST PLAYER</span>
              <span style={{ fontSize: 48, fontWeight: 800, marginTop: 10 }}>{clip(nice(best.name), 22)}</span>
            </div>
            <span style={{ fontSize: 88, fontWeight: 800, color: GOLD }}>{fmt(best.points)}</span>
          </div>
        )}
      </div>
      <Footer logos={logos} dim={DIM} tone={CY} />
    </Shell>
  )
}

/* B — Scoreboard: the grade's colour */
function CardBoard({ d, logos }: { d: ShareRound; logos: Logos }) {
  const TONE = d.grade === 'mens' ? '#E8C15A' : '#7FC4FF'
  const BG = d.grade === 'mens' ? 'radial-gradient(circle at 50% 0%, #4A3A12 0%, #14110A 62%)' : 'radial-gradient(circle at 50% 0%, #14305A 0%, #0A0F1C 62%)'
  const DIM = '#FFFFFF99'
  const tile: CSSProperties = {
    display: 'flex', flexDirection: 'column', flex: 1, border: '2px solid #FFFFFF2A', borderRadius: 26,
    padding: '26px 34px', background: '#00000040',
  }
  const label: CSSProperties = { fontSize: 20, fontWeight: 800, letterSpacing: 5, color: TONE }
  const best = d.top[0]
  const line = (name: string, value: string, mine: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '34px 40px', borderBottom: '2px solid #FFFFFF18', opacity: mine ? 1 : 0.62 }}>
      <span style={{ fontSize: 46, fontWeight: 800 }}>{clip(name, 18)}</span>
      <span style={{ fontSize: 116, fontWeight: 800, color: mine ? TONE : '#FFFFFF', lineHeight: 1 }}>{value}</span>
    </div>
  )
  return (
    <Shell style={{ background: BG, border: `6px solid ${TONE}` }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 8, color: TONE }}>
            {`ROUND ${d.round} · ${gradeName(d.grade).toUpperCase()}`}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 44, border: `2px solid ${TONE}88`, borderRadius: 34, overflow: 'hidden', background: '#0B0A07' }}>
          {line(d.teamName, fmt(d.score), true)}
          {d.h2h && line(d.h2h.opponent, fmt(d.h2h.theirScore), false)}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '26px 0', background: TONE }}>
            <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 8, color: '#141210' }}>
              {(d.h2h ? h2hWord(d.h2h.result) : d.provisional ? 'Provisional score' : 'Round score').toUpperCase()}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 26, gap: 24 }}>
          <div style={tile}>
            <span style={label}>ROUND RANK</span>
            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
              <span style={{ fontSize: 76, fontWeight: 800 }}>{d.rank ? ordinal(d.rank) : '—'}</span>
              {d.teams > 0 && <span style={{ fontSize: 28, fontWeight: 600, color: DIM, marginLeft: 14 }}>{`of ${d.teams}`}</span>}
            </div>
          </div>
          <div style={tile}>
            <span style={label}>SEASON RANK</span>
            <span style={{ fontSize: 76, fontWeight: 800, marginTop: 10 }}>{d.seasonRank ? ordinal(d.seasonRank) : '—'}</span>
          </div>
        </div>
        {d.captain && (
          <div style={{ ...tile, flex: 'none', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={label}>CAPTAIN</span>
              <span style={{ fontSize: 44, fontWeight: 800, marginTop: 8 }}>{clip(nice(d.captain.name), 22)}</span>
            </div>
            <span style={{ fontSize: 72, fontWeight: 800, color: TONE }}>{fmt(d.captain.points)}</span>
          </div>
        )}
        {best && (
          <div style={{ ...tile, flex: 'none', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={label}>BEST PLAYER</span>
              <span style={{ fontSize: 44, fontWeight: 800, marginTop: 8 }}>{clip(nice(best.name), 22)}</span>
              {best.club !== '' && <span style={{ fontSize: 24, fontWeight: 600, color: DIM, marginTop: 4 }}>{best.club}</span>}
            </div>
            <span style={{ fontSize: 72, fontWeight: 800, color: TONE }}>{fmt(best.points)}</span>
          </div>
        )}
      </div>
      <Footer logos={logos} dim={DIM} tone={TONE} />
    </Shell>
  )
}

/* C — Poster: the score and the top three */
function CardPoster({ d, logos }: { d: ShareRound; logos: Logos }) {
  const BL = '#7FC4FF', DIM = '#FFFFFF99'
  const where = [
    d.rank ? `${ordinal(d.rank)}${d.teams ? ` of ${d.teams}` : ''} this round` : null,
    d.seasonRank ? `${ordinal(d.seasonRank)} for the season` : null,
  ].filter(Boolean).join(' · ')
  return (
    <Shell style={{ background: 'linear-gradient(160deg, #13224A 0%, #0A1024 55%, #070B14 100%)', border: `6px solid ${BL}` }}>
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <span style={{ position: 'absolute', right: -30, top: 110, fontSize: 500, fontWeight: 800, color: '#7FC4FF14', lineHeight: 1 }}>{`R${d.round}`}</span>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 8, color: BL }}>
            {`${gradeName(d.grade).toUpperCase()} · ROUND ${d.round}`}
          </span>
        </div>
        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: DIM, marginTop: 64 }}>
          {`${clip(d.teamName, 26).toUpperCase()} SCORED`}
        </span>
        <span style={{ fontSize: 310, fontWeight: 800, lineHeight: 1, marginTop: 10 }}>{fmt(d.score)}</span>
        {where !== '' && <span style={{ fontSize: 38, fontWeight: 800, color: BL, marginTop: 18 }}>{where}</span>}
        {d.h2h && (
          <span style={{ fontSize: 30, fontWeight: 600, color: DIM, marginTop: 12 }}>
            {`${h2hWord(d.h2h.result)} v ${clip(d.h2h.opponent, 22)}, ${fmt(d.score)}–${fmt(d.h2h.theirScore)}`}
          </span>
        )}
        {d.top.length > 0 && (
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 7, color: DIM, marginTop: 64, marginBottom: 8 }}>
            {d.top.length === 1 ? 'MY TOP PLAYER' : `MY TOP ${d.top.length === 2 ? 'TWO' : 'THREE'}`}
          </span>
        )}
        {d.top.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '34px 0', borderBottom: i === d.top.length - 1 ? 'none' : '2px solid #FFFFFF20' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 74, height: 74, borderRadius: 18, background: BL }}>
              <span style={{ fontSize: 38, fontWeight: 800, color: '#07101F' }}>{String(i + 1)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', flex: 1, marginLeft: 26 }}>
              <span style={{ fontSize: 46, fontWeight: 800 }}>{clip(nice(p.name), 20)}</span>
              {p.captain && <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: '#FFD700', marginLeft: 16 }}>CAPTAIN</span>}
            </div>
            <span style={{ fontSize: 64, fontWeight: 800, color: BL }}>{fmt(p.points)}</span>
          </div>
        ))}
      </div>
      <Footer logos={logos} dim={DIM} tone={BL} />
    </Shell>
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const g = url.searchParams.get('grade')
  const style = url.searchParams.get('style') ?? 'a'
  if (g !== 'mens' && g !== 'womens') return Response.json({ error: 'Bad grade' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const d = await shareRoundData(supabase, user.id, g)
  if (!d) return Response.json({ error: 'No scored round to share yet' }, { status: 404 })

  // Fonts and logos first: if one is missing there is nothing to draw
  let loaded: Awaited<typeof assets>
  try {
    loaded = await assets
  } catch (e) {
    console.error('share-round assets failed', e)
    return Response.json({ error: 'Could not draw the card' }, { status: 500 })
  }
  const [r4, r6, r8, x4, x6, x8, gf, bdl] = loaded
  const logos: Logos = { gf: `data:image/png;base64,${gf}`, bdl: `data:image/png;base64,${bdl}` }
  const card = style === 'b' ? <CardBoard d={d} logos={logos} />
    : style === 'c' ? <CardPoster d={d} logos={logos} />
    : <CardTech d={d} logos={logos} />
  // The second family carries macrons (ā, ō) and other accented letters
  const font = (data: Buffer, weight: 400 | 600 | 800, name = 'Oxanium') => ({ name, data, weight, style: 'normal' as const })
  return new ImageResponse(card, {
    width: W, height: H,
    fonts: [font(r4, 400), font(r6, 600), font(r8, 800), font(x4, 400, 'OxaniumExt'), font(x6, 600, 'OxaniumExt'), font(x8, 800, 'OxaniumExt')],
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
