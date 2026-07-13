// Clubhouse theme — logged-in identity. Marketing pages keep GF green.
// Users pick a site theme for My Team / Matchups / Ladder; 'grade' = classic
// per-grade look (Men's Padres brown & gold, Women's cobalt & electric).
export type Grade = 'mens' | 'womens'

export type Palette = {
  accent: string
  accentSoft: string
  field: string
  surface: string
  surfaceRaised: string
  headerBg: string
  text: string
  textDim: string
  glow: string
  electric?: string
}

export const THEMES = {
  padres: {
    label: 'Brown & Gold',
    accent: '#FFC425',
    accentSoft: '#FFC42520',
    field: '#1E1710',
    surface: '#2A211A',
    surfaceRaised: '#3A2C21',
    headerBg: '#2A1F15',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    glow: '0 0 16px #FFC42540',
  },
  chevron: {
    label: 'Chevron Blue',
    accent: '#4D7FFF',
    accentSoft: '#4D7FFF20',
    field: '#0C1428',
    surface: '#101E3E',
    surfaceRaised: '#16295A',
    headerBg: '#0E1B3D',
    text: '#EEF3FF',
    textDim: '#DDE9FF70',
    electric: '#9DBBFF',
    glow: '0 0 18px #4D7FFF60, 0 0 36px #4D7FFF25',
  },
  rwb: {
    label: 'Red, White & Blue',
    accent: '#E03A3E',
    accentSoft: '#E03A3E20',
    field: '#10141F',
    surface: '#161C2C',
    surfaceRaised: '#1E2740',
    headerBg: '#152039',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    electric: '#7FA4FF',
    glow: '0 0 16px #E03A3E45',
  },
  blackgold: {
    label: 'Black & Yellow',
    accent: '#FFB81C',
    accentSoft: '#FFB81C20',
    field: '#0C0C0E',
    surface: '#141416',
    surfaceRaised: '#1D1D20',
    headerBg: '#151513',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    glow: '0 0 16px #FFB81C45',
  },
  cardinal: {
    label: 'Cardinal & Gold',
    accent: '#C41E3A',
    accentSoft: '#C41E3A20',
    field: '#170F11',
    surface: '#211518',
    surfaceRaised: '#2E1C20',
    headerBg: '#241318',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    electric: '#E8C15A',
    glow: '0 0 16px #C41E3A50',
  },
  purple: {
    label: 'Purple & Gold',
    accent: '#8E5BD8',
    accentSoft: '#8E5BD820',
    field: '#130F1C',
    surface: '#1B1527',
    surfaceRaised: '#261D38',
    headerBg: '#1E1430',
    text: '#F3EFFA',
    textDim: '#F3EFFA70',
    electric: '#E8C15A',
    glow: '0 0 18px #8E5BD855',
  },
} as const

export type ThemeKey = keyof typeof THEMES
export type SiteTheme = ThemeKey | 'grade'

export const THEME_ORDER: ThemeKey[] = ['padres', 'chevron', 'rwb', 'blackgold', 'cardinal', 'purple']

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
    return THEMES[siteTheme as ThemeKey]
  }
  return CLUBHOUSE[grade]
}