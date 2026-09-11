/* Pages closed while the sandbox is cleared and the real rosters load.

   One list rather than a flag per page — closing five areas by editing five
   files is how one gets missed. Delete a path from here and that page opens
   again; nothing else to change. On the 18th, empty both arrays. */

export const UNDER_CONSTRUCTION = [
  '/team',
  '/matchups',
  '/ladder',
  '/hall',

  /* Reachable only through My Team in the nav, so it's covered for anyone
     clicking through — but a bookmark or browser history still lands on it.
     Uncomment to close it properly. */
  // '/analytics',
]

/* Shut rather than under construction — different message, because people
   arriving at these have a specific intent. */
export const LOCKED = [
  '/register',
  '/login',
]

const matches = (list: string[], path: string) =>
  list.some(p => path === p || path.startsWith(p + '/'))

export const isClosed = (path: string) => matches(UNDER_CONSTRUCTION, path)
export const isLocked = (path: string) => matches(LOCKED, path)

/* Arcade games that read from the database. The wipe empties players and
   rounds, so these five would render their "not enough players yet" fallback
   until the real roster lands on the 18th — which reads as broken rather than
   deliberate.

   The other eight are safe: Legends Cage and Guess the Season build from the
   static honours file, Diamond Snake only needs clubs (kept), and the rest
   need no data at all. */
export const CLOSED_GAMES = [
  '/games/connections',
  '/games/daily',
  '/games/higher',
  '/games/memory',
  '/games/lineup',
]

export const isClosedGame = (path: string) =>
  CLOSED_GAMES.some(p => path === p || path.startsWith(p + '/'))