/* Player and official names render with the surname in capitals — "Jerome HARETUKU".
   Everything after the first space is the surname, which keeps double-barrelled and
   multi-word surnames intact (Tyarn BROMHEAD-LEMALU, Oliana-Pearl HESP). */
export function splitName(full: string): { first: string; last: string } {
  const parts = (full ?? '').trim().split(' ')
  if (parts.length < 2) return { first: parts[0] ?? '', last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ').toUpperCase() }
}

/* Single-line form for places that don't stack the name. */
export function displayName(full: string): string {
  const { first, last } = splitName(full)
  return last ? `${first} ${last}` : first
}