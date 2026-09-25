/* The NFS Premier League partners, in one place so the partners page, the
   ladder credits, the arcade credits and the footer can never disagree.
   Only `confirmed` partners are shown. */

/* Master switch. Everything partner-facing (footer link, ladder credits,
   arcade credits) stays hidden until this is true. Flip it after the
   iAthletic announcement. */
export const PARTNERS_LIVE = true

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
      'Season Ladder Champion \u00b7 Men\u2019s and Women\u2019s',
      'All-Time High Score \u00b7 Men\u2019s and Women\u2019s',
      'Finals Challenge prize pool \u00b7 Men\u2019s and Women\u2019s',
    ],
  },
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
      'Mid-Season Leader \u00b7 Men\u2019s and Women\u2019s',
      'Head-to-Head Champion \u00b7 Men\u2019s and Women\u2019s',
      'Finals Challenge prize pool \u00b7 Men\u2019s and Women\u2019s',
    ],
    offer: '10% off full-priced gear and standard cage bookings for Grassroots Fantasy players. Conditions apply — exclusions include machines, team and bulk quotes, parties and exclusive facility hire.',
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
    what: 'Backing the Finals Challenge in both grades.',
    awards: ['Finals Challenge prize pool \u00b7 Men\u2019s and Women\u2019s'],
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
    what: 'The Auckland technology company behind Grassroots Fantasy, and the makers of Coach Nate. Additional prizes to be announced.',
    awards: [],
  },
]

export const livePartners = () => PARTNERS.filter(p => p.confirmed)
export const partner = (key: string) => PARTNERS.find(p => p.key === key && p.confirmed)

/* Arcade game partners, keyed by the game's title as passed to ArcadeShell.
   Hidden, and titles unchanged, until PARTNERS_LIVE is true. */
const GAME_PARTNERS: Record<string, { partner: string; liveTitle?: string }> = {
  'Golden Glove': { partner: 'fieldhouse' },
  'Legends Cage': { partner: 'fieldhouse' },
  'Player of the Day': { partner: 'iathletic' },
  "Knock 'em Down": { partner: 'iathletic' },
  'Pick the Pitch': { partner: 'placemakers', liveTitle: 'Pick the Pitch with PlaceMakers' },
}
export const gamePartner = (title: string) => (PARTNERS_LIVE ? GAME_PARTNERS[title] : undefined)
export const gameTitle = (title: string) => gamePartner(title)?.liveTitle ?? title