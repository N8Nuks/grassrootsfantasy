/* Snap a hand-typed name to the closest player on a list. Pure functions, safe
   in client and server code.

   Order of checks:
   1. Same name once capitals, macrons, apostrophes, hyphens and spare spaces
      are stripped ("Ogden Kiri" = "Ogden-Kiri").
   2. One name's words are the other's in order ("Payton Hiraka" is inside
      "Payton Hiraka Downing"). Needs two typed words so a bare first name
      never attaches to anyone, and exactly one candidate.
   3. Within two letters of one name (three for long names) and no other
      name nearly as close — siblings with similar names are left alone. */

export type NameCandidate = { id: string; name: string }

export const normName = (s: string) => (s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/['’`]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return row[b.length]
}

const inOrder = (short: string[], long: string[]) => {
  let i = 0
  for (const w of long) if (i < short.length && w === short[i]) i++
  return i === short.length
}

export function snapName<T extends NameCandidate>(typed: string, pool: T[]): T | null {
  const key = normName(typed)
  if (!key) return null
  const keyed = pool.map(p => ({ p, k: normName(p.name) }))

  const exact = keyed.find(x => x.k === key)
  if (exact) return exact.p

  const words = key.split(' ')
  if (words.length >= 2) {
    const contained = keyed.filter(x => {
      const w = x.k.split(' ')
      return w.length !== words.length && (inOrder(words, w) || inOrder(w, words))
    })
    if (contained.length === 1) return contained[0].p
  }

  let best: T | null = null
  let bestD = Infinity
  let secondD = Infinity
  for (const x of keyed) {
    const d = editDistance(key, x.k)
    if (d < bestD) { secondD = bestD; bestD = d; best = x.p }
    else if (d < secondD) secondD = d
  }
  const limit = key.length >= 14 ? 3 : 2
  return best && bestD <= limit && secondD - bestD >= 2 ? best : null
}

/* Tidy a name that is going to be stored as text */
export const cleanTypedName = (s: string) => (s ?? '')
  .replace(/\s+/g, ' ').trim().slice(0, 60)
  .split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')