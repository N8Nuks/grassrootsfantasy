// Clubhouse theme — logged-in identity. Marketing pages keep GF green.
// Users pick a site theme for My Team / Matchups / Ladder; 'grade' = classic
// per-grade look (Men's Padres brown & gold, Women's cobalt & electric).
export type Grade = 'mens' | 'womens'

export type Palette = {
  label: string
  accent: string
  accentSoft: string
  button: string             // buttons, chips, toggles, pills
  buttonText: string
  shimmer?: boolean          // gold shimmer treatment on buttons + My Team label
  field: string
  surface: string
  surfaceRaised: string
  headerBg: string
  text: string
  textDim: string
  glow: string
  electric?: string
  swatch: [string, string]   // half-and-half softball fill
  seam: string               // softball stitching colour
}

export const THEMES: Record<string, Palette> = {
  padres: {
    label: 'Brown & Gold',
    accent: '#FFC425',
    accentSoft: '#FFC42520',
    button: '#FFC425',
    buttonText: '#141210',
    field: '#1E1710',
    surface: '#2A211A',
    surfaceRaised: '#3A2C21',
    headerBg: '#2A1F15',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    glow: '0 0 16px #FFC42540',
    swatch: ['#3A2C21', '#FFC425'],
    seam: '#F5F1E8',
  },
  chevron: {
    label: 'Chevron Blue',
    accent: '#4D7FFF',
    accentSoft: '#4D7FFF20',
    button: '#4D7FFF',
    buttonText: '#0C1428',
    field: '#0C1428',
    surface: '#101E3E',
    surfaceRaised: '#16295A',
    headerBg: '#0E1B3D',
    text: '#EEF3FF',
    textDim: '#DDE9FF70',
    electric: '#9DBBFF',
    glow: '0 0 18px #4D7FFF60, 0 0 36px #4D7FFF25',
    swatch: ['#4D7FFF', '#EEF3FF'],
    seam: '#0C1428',
  },
  rwb: {
    label: 'Red, White & Blue',
    accent: '#E03A3E',
    accentSoft: '#E03A3E20',
    button: '#E03A3E',
    buttonText: '#F5F1E8',
    field: '#10141F',
    surface: '#161C2C',
    surfaceRaised: '#1E2740',
    headerBg: '#152039',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    electric: '#7FA4FF',
    glow: '0 0 16px #E03A3E45',
    swatch: ['#E03A3E', '#2456E6'],
    seam: '#F5F1E8',
  },
  blackgold: {
    label: 'Black & Yellow',
    accent: '#FFB81C',
    accentSoft: '#FFB81C20',
    button: '#FFB81C',
    buttonText: '#141210',
    field: '#0C0C0E',
    surface: '#141416',
    surfaceRaised: '#1D1D20',
    headerBg: '#151513',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    glow: '0 0 16px #FFB81C45',
    swatch: ['#141416', '#141416'],   // black ball
    seam: '#FFB81C',                  // yellow stitching
  },
  cardinal: {
    label: 'Cardinal & Gold',
    accent: '#C41E3A',
    accentSoft: '#C41E3A20',
    button: '#E8C15A',                // gold buttons + chips
    buttonText: '#241318',
    shimmer: true,                    // gold shimmer treatment
    field: '#170F11',
    surface: '#211518',
    surfaceRaised: '#2E1C20',
    headerBg: '#241318',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    electric: '#E8C15A',
    glow: '0 0 16px #E8C15A50',
    swatch: ['#C41E3A', '#E8C15A'],
    seam: '#F5F1E8',
  },
  purple: {
    label: 'Purple & Gold',
    accent: '#8E5BD8',
    accentSoft: '#8E5BD820',
    button: '#8E5BD8',
    buttonText: '#F3EFFA',
    field: '#130F1C',
    surface: '#1B1527',
    surfaceRaised: '#261D38',
    headerBg: '#1E1430',
    text: '#F3EFFA',
    textDim: '#F3EFFA70',
    electric: '#E8C15A',
    glow: '0 0 18px #8E5BD855',
    swatch: ['#8E5BD8', '#E8C15A'],
    seam: '#F3EFFA',
  },
  greenyellow: {
    label: 'Green & Yellow',
    accent: '#3FBF63',
    accentSoft: '#3FBF6320',
    button: '#FFD84D',                // yellow buttons, not green
    buttonText: '#141210',
    field: '#0F1710',
    surface: '#152018',
    surfaceRaised: '#1D2C21',
    headerBg: '#142015',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    electric: '#FFD84D',
    glow: '0 0 16px #3FBF6345',
    swatch: ['#3FBF63', '#FFD84D'],
    seam: '#141210',
  },
}

export type ThemeKey = keyof typeof THEMES
export type SiteTheme = ThemeKey | 'grade'

// Switcher order — padres excluded (Classic covers it on Men's)
export const THEME_ORDER: string[] = ['chevron', 'rwb', 'blackgold', 'cardinal', 'purple', 'greenyellow']

// Back-compat: existing grade-keyed lookups
export const CLUBHOUSE = {
  mens: THEMES.padres,
  womens: THEMES.chevron,
} as const

export const ADMIN_RED = '#C41E3A'      // cardinal — admin controls
export const JOIN_GOLD = '#E8C15A'      // Join GF retains marketing gold

// theme(grade) still works everywhere; pass the user's saved site_theme as the
// second argument to override. 'grade' (or missing/unknown) = classic per-grade look.
export function theme(grade: Grade, siteTheme?: string | null): Palette {
  if (siteTheme && siteTheme !== 'grade' && siteTheme in THEMES) {
    return THEMES[siteTheme]
  }
  return CLUBHOUSE[grade]
}