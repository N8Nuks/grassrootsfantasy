import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const GOLD = '#E8C15A'
const SILVER = '#4DA6FF'

/* The partners behind the league. Nothing renders until `confirmed` is true, so
   this page can be built ahead of the agreements being signed. Logos drop into
   /public/sponsors/ as they arrive — until then each card shows the name. */

type Partner = {
  key: string
  name: string
  confirmed: boolean
  logo?: string          // /sponsors/____.png
  site?: string
  what: string
  awards: string[]
  offer?: string
  accent: string
}

const PARTNERS: Partner[] = [
  {
    key: 'fieldhouse',
    name: 'The Fieldhouse',
    confirmed: false,
    site: 'https://fieldhouse.co.nz',
    accent: '#4DA6FF',
    what: 'Indoor training and batting cages in Pakuranga, and our exclusive equipment and cage partner for the season.',
    awards: [
      'Mid-Season Leader · Men\u2019s and Women\u2019s',
      'Head-to-Head Champion · Men\u2019s and Women\u2019s',
    ],
    offer: '10% off full-priced gear and cage use for Grassroots Fantasy players, all season.',
  },
  {
    key: 'iathletic',
    name: 'iAthletic',
    confirmed: false,
    site: 'https://iathletic.co.nz',
    accent: '#FF6B9D',
    what: 'Teamwear and custom kit, and the apparel partner of the Women\u2019s grade.',
    awards: [
      'Season Ladder Champion · Women\u2019s',
      'All-Time High Score · Women\u2019s',
      'Finals Challenge Champion · Women\u2019s',
    ],
  },
  {
    key: 'remindr',
    name: 'Remindr Sports',
    confirmed: false,
    accent: '#39FF9E',
    what: 'Teamwear and clubstores, and the apparel partner of the Men\u2019s grade.',
    awards: [
      'Finals Challenge Champion · Men\u2019s',
    ],
  },
  {
    key: 'placemakers',
    name: 'PlaceMakers',
    confirmed: false,
    accent: '#FF8A3D',
    what: 'Supporting the Finals Challenge prize packs in both grades.',
    awards: [
      'Finals Challenge · prize pack',
    ],
  },
]

export default function Sponsors() {
  const live = PARTNERS.filter(p => p.confirmed)

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      <section className="px-5 sm:px-12" style={{ paddingTop: '84px', paddingBottom: '30px' }}>
        <div className="text-center" style={{ maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: GOLD, marginBottom: '14px' }}>
            Our partners
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: 'var(--font-heading)', marginBottom: '16px' }}>
            The people backing it.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#F5F1E870' }}>
            Grassroots Fantasy is free to play, and it stays that way because these
            businesses put up the prizes. They&apos;re all part of Auckland softball —
            worth your support in return.
          </p>
        </div>
      </section>

      <section className="px-5 sm:px-12" style={{ paddingBottom: '72px' }}>
        <div style={{ maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>
          {live.length === 0 ? (
            <div className="rounded-2xl text-center"
              style={{ background: '#1A1A22', border: '1px solid #ffffff12', padding: '48px 28px' }}>
              <p className="text-xl font-black" style={{ fontFamily: 'var(--font-heading)', color: GOLD, marginBottom: '12px' }}>
                Announcing soon.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#F5F1E845', maxWidth: '34ch', margin: '0 auto' }}>
                The partners for Season One are being confirmed now. They&apos;ll be
                named here before the first round.
              </p>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: '16px' }}>
              {live.map(p => (
                <div key={p.key} className="rounded-2xl"
                  style={{ background: '#1A1A22', border: '1px solid #ffffff10', borderLeft: `3px solid ${p.accent}`, padding: '26px 24px' }}>
                  <div className="flex items-start gap-5">
                    {/* Logo slot — the name stands in until the file arrives */}
                    <div className="shrink-0 rounded-lg flex items-center justify-center"
                      style={{ width: '92px', height: '92px', background: '#0D0D0F', border: '1px solid #ffffff12' }}>
                      {p.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.logo} alt={p.name} style={{ maxWidth: '78%', maxHeight: '78%', width: 'auto', height: 'auto' }} />
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-center"
                          style={{ color: p.accent, padding: '0 6px', lineHeight: 1.3 }}>
                          {p.name}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)', marginBottom: '6px' }}>
                        {p.name}
                      </h2>
                      <p className="text-sm leading-relaxed" style={{ color: '#F5F1E860', marginBottom: '14px' }}>
                        {p.what}
                      </p>

                      <p className="text-[9px] font-black uppercase tracking-[0.28em]" style={{ color: SILVER, marginBottom: '6px' }}>
                        Awards
                      </p>
                      <ul style={{ marginBottom: p.offer ? '14px' : '0' }}>
                        {p.awards.map(a => (
                          <li key={a} className="text-[12px]" style={{ color: '#F5F1E870', lineHeight: 1.8 }}>
                            {a}
                          </li>
                        ))}
                      </ul>

                      {p.offer && (
                        <div className="rounded-lg"
                          style={{ background: `${p.accent}12`, border: `1px solid ${p.accent}35`, padding: '11px 14px' }}>
                          <p className="text-[9px] font-black uppercase tracking-[0.28em]" style={{ color: p.accent, marginBottom: '4px' }}>
                            For GF players
                          </p>
                          <p className="text-[12px] leading-relaxed" style={{ color: '#F5F1E880' }}>{p.offer}</p>
                        </div>
                      )}

                      {p.site && (
                        <a href={p.site} target="_blank" rel="noopener noreferrer"
                          className="inline-block text-[11px] font-black uppercase tracking-widest"
                          style={{ color: p.accent, marginTop: '14px' }}>
                          Visit {p.name} →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-center leading-relaxed" style={{ color: '#F5F1E835', marginTop: '36px' }}>
            Interested in backing a Grassroots Fantasy league?{' '}
            <a href="mailto:info@grassrootsfantasy.co.nz?subject=Partnership%20enquiry"
              style={{ color: GOLD }}>Get in touch.</a>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}