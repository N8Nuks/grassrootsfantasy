import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageGuide from '@/components/PageGuide'
import { createClient } from '@/lib/supabase/server'
import { theme } from '@/lib/clubhouse'

/* HIGH TIDE — the community business directory. Public page. Only listings
   that are approved and active come back, because RLS filters them for the
   anon/authenticated client; the admin page is where the rest live. */

const CATEGORIES = ['Trades', 'Food & hospo', 'Professional services', 'Health & fitness', 'Retail', 'Digital services', 'Sports technology', 'Media', 'Other']

type Listing = {
  id: string
  business_name: string
  blurb: string
  category: string
  area: string | null
  phone: string | null
  email: string | null
  website: string | null
  socials: string | null
  logo_url: string | null
  first_name: string
  last_name: string
  players: { full_name: string; clubs: { name: string } | null } | null
}

function WaveH({ size, blue, green }: { size: number; blue: string; green: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" style={{ display: 'block' }}>
      <g transform="skewX(-10) translate(20 0)">
        <path d="M24 20 L62 20 L62 180 L24 180 Z" fill="currentColor" />
        <path d="M138 20 L176 20 L176 180 L138 180 Z" fill="currentColor" />
        <path d="M62 84 C 74 70, 90 70, 100 84 S 126 98, 138 84 L138 112 C 126 126, 110 126, 100 112 S 74 98, 62 112 Z" fill={blue} />
        <path d="M62 112 C 74 98, 90 98, 100 112 S 126 126, 138 112 L138 134 C 126 148, 110 148, 100 134 S 74 120, 62 134 Z" fill={green} />
      </g>
    </svg>
  )
}

function href(kind: 'phone' | 'email' | 'website' | 'socials', v: string) {
  if (kind === 'phone') return 'tel:' + v.replace(/\s+/g, '')
  if (kind === 'email') return 'mailto:' + v
  return /^https?:\/\//i.test(v) ? v : 'https://' + v
}

export default async function HighTide({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const params = await searchParams
  const cat = CATEGORIES.includes(params.cat ?? '') ? (params.cat as string) : ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: prof } = user
    ? await supabase.from('profiles').select('site_theme').eq('id', user.id).single()
    : { data: null }
  const siteTheme = (prof as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  const T = theme('mens', siteTheme)
  const BLUE = '#2F8BE6'
  const GREEN = '#3FB64B'

  let q = supabase.from('listings')
    .select('id, business_name, blurb, category, area, phone, email, website, socials, logo_url, first_name, last_name, players(full_name, clubs(name))')
    .order('business_name')
  if (cat) q = q.eq('category', cat)
  const { data } = await q
  const listings = (data ?? []) as unknown as Listing[]

  // Only show category chips that actually have listings
  const { data: allCats } = await supabase.from('listings').select('category')
  const present = new Set((allCats ?? []).map(r => r.category))
  const chips = CATEGORIES.filter(c => present.has(c))

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '920px', marginLeft: 'auto', marginRight: 'auto' }}>

          {/* Hero */}
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <div className="flex justify-center" style={{ color: T.text, marginBottom: '18px' }}>
              <WaveH size={96} blue={BLUE} green={GREEN} />
            </div>
            <h1 className="text-5xl sm:text-6xl font-black uppercase italic" style={{ fontFamily: 'var(--font-heading)', color: T.text, letterSpacing: '-0.03em', lineHeight: 0.9, marginBottom: '14px' }}>
              High <span style={{ color: GREEN }}>Tide</span>
            </h1>
            <p className="text-xs font-black uppercase tracking-[0.35em]" style={{ color: BLUE, marginBottom: '22px' }}>A high tide raises all boats</p>
            <p className="text-sm" style={{ color: T.textDim, maxWidth: '520px', margin: '0 auto 26px' }}>
              The businesses, trades and side projects run by the players, coaches and managers of Grassroots Fantasy. Need something done? Start here, and keep it in the community.
            </p>
            <a href="/high-tide/list"
              className="inline-flex items-center text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.04]"
              style={{ color: T.buttonText, background: T.button, padding: '14px 32px', minHeight: '44px' }}>
              List your business
            </a>
          </div>

          {/* Category chips */}
          {chips.length > 1 && (
            <div className="flex justify-center flex-wrap gap-2" style={{ marginBottom: '32px' }}>
              <a href="/high-tide"
                className="text-[11px] font-black uppercase tracking-widest rounded-full flex items-center"
                style={{ color: !cat ? T.buttonText : T.textDim, background: !cat ? T.button : 'transparent', border: '1px solid #ffffff25', padding: '10px 18px', minHeight: '40px' }}>
                All
              </a>
              {chips.map(c => (
                <a key={c} href={`/high-tide?cat=${encodeURIComponent(c)}`}
                  className="text-[11px] font-black uppercase tracking-widest rounded-full flex items-center"
                  style={{ color: cat === c ? T.buttonText : T.textDim, background: cat === c ? T.button : 'transparent', border: '1px solid #ffffff25', padding: '10px 18px', minHeight: '40px' }}>
                  {c}
                </a>
              ))}
            </div>
          )}

          {/* Listings */}
          {listings.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {listings.map(l => {
                const who = `${l.first_name} ${l.last_name}`
                const club = l.players?.clubs?.name ?? null
                const contacts: { label: string; kind: 'phone' | 'email' | 'website' | 'socials'; v: string }[] = []
                if (l.phone) contacts.push({ label: 'Call', kind: 'phone', v: l.phone })
                if (l.email) contacts.push({ label: 'Email', kind: 'email', v: l.email })
                if (l.website) contacts.push({ label: 'Website', kind: 'website', v: l.website })
                if (l.socials) contacts.push({ label: 'Socials', kind: 'socials', v: l.socials })
                return (
                  <div key={l.id} className="rounded-2xl overflow-hidden flex flex-col" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
                    <div className="flex items-center justify-between" style={{ background: T.headerBg, borderBottom: '1px solid #ffffff0a', padding: '12px 22px' }}>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: BLUE }}>{l.category}</span>
                      {l.area && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.textDim }}>{l.area}</span>}
                    </div>
                    <div className="flex-1 flex flex-col gap-3" style={{ padding: '20px 22px' }}>
                      <div className="flex items-center gap-4">
                        {l.logo_url
                          ? <img src={l.logo_url} alt="" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 10, background: T.headerBg, padding: 4, flexShrink: 0 }} />
                          : <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 10, background: T.headerBg, color: T.text, flexShrink: 0 }}><WaveH size={34} blue={BLUE} green={GREEN} /></div>}
                        <p className="text-xl font-black uppercase italic leading-none" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{l.business_name}</p>
                      </div>
                      <p className="text-sm" style={{ color: T.text, lineHeight: 1.5 }}>{l.blurb}</p>
                      <div className="flex items-center gap-3" style={{ paddingTop: '10px', borderTop: '1px solid #ffffff0a' }}>
                        <div className="flex items-center justify-center text-[11px] font-black" style={{ width: 30, height: 30, borderRadius: 8, background: GREEN, color: '#0A1A2F', flexShrink: 0 }}>
                          {l.first_name[0]}{l.last_name[0]}
                        </div>
                        <p className="text-xs" style={{ color: T.textDim }}>
                          <span className="font-black" style={{ color: T.text }}>{who}</span>
                          {l.players ? ` · ${l.players.full_name}${club ? `, ${club}` : ''}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap" style={{ marginTop: '2px' }}>
                        {contacts.map(c => (
                          <a key={c.kind} href={href(c.kind, c.v)} target={c.kind === 'website' || c.kind === 'socials' ? '_blank' : undefined} rel="noopener"
                            className="text-[11px] font-black uppercase tracking-widest rounded-full flex items-center transition-all hover:scale-[1.03]"
                            style={{
                              color: c.kind === 'phone' ? T.buttonText : T.text,
                              background: c.kind === 'phone' ? T.button : 'transparent',
                              border: c.kind === 'phone' ? 'none' : '1px solid #ffffff30',
                              padding: '10px 16px', minHeight: '40px',
                            }}>
                            {c.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden pinstripe" style={{ background: T.surface, border: '1px solid #ffffff12' }}>
              <div className="text-center" style={{ padding: '48px 28px' }}>
                <p className="text-2xl font-black mb-3" style={{ fontFamily: 'var(--font-heading)', color: GREEN }}>
                  {cat ? 'Nothing in this category yet.' : 'The tide is coming in.'}
                </p>
                <p className="text-sm" style={{ color: T.textDim, maxWidth: '380px', margin: '0 auto' }}>
                  {cat ? 'Try another category, or be the first to list here.' : 'The first businesses are being added. Got one? List it and be on the board from day one.'}
                </p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-center mt-8" style={{ color: T.textDim }}>
            Listings are added by the people behind them and checked by GF before they appear. Grassroots Fantasy isn&apos;t party to any work arranged here.
          </p>
        </div>
      </section>
      <PageGuide pageKey="high-tide" accent={GREEN} textColor={T.text} steps={[
        {
          title: 'The community, open for business',
          body: 'Every card is someone from the league — a player, coach or manager — and what they do for a living. Tap Call, Email or Website to reach them directly.',
        },
        {
          title: 'Add yours',
          body: "List your business or side project. It's checked by GF, then it's live for every manager on the platform.",
        },
      ]} />
      <Footer />
    </main>
  )
}