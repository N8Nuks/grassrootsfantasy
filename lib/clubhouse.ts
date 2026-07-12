// Clubhouse theme — logged-in identity. Marketing pages keep GF green.
// Men's: San Diego brown & gold. Women's: cobalt & electric.

export type Grade = 'mens' | 'womens'

export const CLUBHOUSE = {
  mens: {
    accent: '#FFC425',        // gold
    accentSoft: '#FFC42520',
    field: '#1E1710',         // page background
    surface: '#2A211A',       // cards/boards
    surfaceRaised: '#3A2C21', // headers, elevated panels
    headerBg: '#2A1F15',
    text: '#F5F1E8',
    textDim: '#F5F1E870',
    glow: '0 0 16px #FFC42540',
  },
  womens: {
    accent: '#4D7FFF',        // cobalt
    accentSoft: '#4D7FFF20',
    field: '#0C1428',         // page background
    surface: '#101E3E',       // cards/boards
    surfaceRaised: '#16295A', // headers, elevated panels
    headerBg: '#0E1B3D',
    text: '#EEF3FF',
    textDim: '#DDE9FF70',
    electric: '#9DBBFF',      // electric highlight for numbers/glows
    glow: '0 0 18px #4D7FFF60, 0 0 36px #4D7FFF25',
  },
} as const

export const ADMIN_RED = '#C41E3A'      // cardinal — admin controls
export const JOIN_GOLD = '#E8C15A'      // Join GF retains marketing gold

export function theme(grade: Grade) {
  return CLUBHOUSE[grade]
}