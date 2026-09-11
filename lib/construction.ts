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