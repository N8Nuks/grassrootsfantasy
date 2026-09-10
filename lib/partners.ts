/* The NFS Premier League partners, in one place so the sponsors page and the
   partner strip can never disagree. Only `confirmed` partners are shown. */

export type Partner = {
  key: string
  name: string
  confirmed: boolean
  logo?: string
  /* Each logo carries its own background as part of the mark, so a tile takes
     that colour rather than sitting the logo on ours. */
  tile?: string
  site?: string
  siteLabel?: string
  what: string
  awards: string[]
  offer?: string
  accent: string
}

export const PARTNERS: Partner[] = [
  {
    key: 'fieldhouse',
    name: 'The Fieldhouse',
    confirmed: true,
    logo: '/sponsors/fieldhouse.png',
    tile: '#02132D',
    site: 'https://fieldhouse.co.nz/pages/batting-cages',
    siteLabel: 'Batting cages',
    accent: '#4DA6FF',
    what: 'Indoor training and batting cages in Pakuranga, and our exclusive equipment and cage partner for the season.',
    awards: [
      'Mid-Season Leader · Men\u2019s and Women\u2019s',
      'Head-to-Head Champion · Men\u2019s and Women\u2019s',
      'Finals Challenge Champion · Men\u2019s and Women\u2019s',
    ],
    offer: '10% off full-priced gear and standard cage bookings for Grassroots Fantasy players, all season.',
  },
  {
    key: 'iathletic',
    name: 'iAthletic',
    confirmed: true,
    logo: '/sponsors/iathletic.png',
    tile: '#000000',
    site: 'https://iathletic.co.nz/pages/teamwear',
    siteLabel: 'Teamwear and custom kit',
    accent: '#FF6B9D',
    what: 'Teamwear and custom kit, made here in Auckland, and the apparel partner of the whole competition.',
    awards: [
      'Season Ladder Champion · Men\u2019s and Women\u2019s',
      'All-Time High Score · Men\u2019s and Women\u2019s',
      'Finals Challenge Champion · Men\u2019s and Women\u2019s',
    ],
  },
  {
    key: 'remindr',
    name: 'Remindr Sports',
    confirmed: false,
    logo: '/sponsors/remindr.png',
    tile: '#010101',
    site: 'https://remindrsports.co.nz',
    accent: '#39FF9E',
    what: 'Teamwear and clubstores, and the apparel partner of the Men\u2019s grade.',
    awards: ['Finals Challenge Champion · Men\u2019s'],
  },
  {
    key: 'bdl',
    name: 'Black Diamond Labs',
    confirmed: true,
    logo: '/sponsors/bdl.png',
    tile: '#0A0C10',
    site: 'https://blackdiamondlabs.co.nz',
    siteLabel: 'What we build',
    accent: '#C9CDD4',
    what: 'The Auckland technology company behind Grassroots Fantasy, and the makers of Coach Nate.',
    awards: [
      'Season Ladder Champion \u00b7 Men\u2019s and Women\u2019s',
      'Finals Challenge Champion \u00b7 Men\u2019s and Women\u2019s',
    ],
  },
  {
    key: 'placemakers',
    name: 'PlaceMakers',
    confirmed: true,
    logo: '/sponsors/placemakers.png',
    tile: '#012C9E',
    site: 'https://www.placemakers.co.nz',
    siteLabel: 'Find your local store',
    accent: '#4D8DFF',
    what: 'Supporting the biggest title on the calendar, in both grades.',
    awards: ['Finals Challenge Champion · Men\u2019s and Women\u2019s'],
  },
]

export const livePartners = () => PARTNERS.filter(p => p.confirmed)
export const partner = (key: string) => PARTNERS.find(p => p.key === key && p.confirmed)