/* Pages closed while the sandbox is cleared and the real rosters load.

   One list rather than a flag per page — closing five areas by editing five
   files is how one gets missed. Delete a path from here and that page opens
   again; nothing else to change. On the 18th, empty both arrays. */

export const UNDER_CONSTRUCTION = [
  '/team',
  '/matchups',
  '/ladder',
  '/hall',
  '/leaders',

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

/* Arcade games that need scored rounds before they make sense. The roster is
   loaded now, so the games that read players, clubs, or career stats are open
   again — Player of the Day, Higher or Lower, Card Sharp, Connections.

   Perfect Card stays shut until the first round is scored; it has nothing to
   build from until then. */
export const CLOSED_GAMES = [
  '/games/lineup',
]

export const isClosedGame = (path: string) =>
  CLOSED_GAMES.some(p => path === p || path.startsWith(p + '/'))

/* A way past the locked pages for admin setup during the changeover. Visit
   any locked page with ?key=<the value below> and the proxy drops a cookie
   that lets you through from then on.

   Not real security — it's a soft gate so one person can register while
   everyone else sees the closed notice. Change the value, and delete this
   whole block on the 18th when the pages reopen. */
export const BYPASS_KEY = 'Fantasy1'
export const BYPASS_COOKIE = 'gf_changeover'