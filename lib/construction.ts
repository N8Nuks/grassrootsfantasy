/* The sandbox changeover is done and the season is open. Both arrays stay here
   so a page can be closed again in a hurry — add its path and deploy. */

export const UNDER_CONSTRUCTION: string[] = []

/* Shut rather than under construction — different message, because people
   arriving at these have a specific intent. */
export const LOCKED: string[] = []

const matches = (list: string[], path: string) =>
  list.some(p => path === p || path.startsWith(p + '/'))

export const isClosed = (path: string) => matches(UNDER_CONSTRUCTION, path)
export const isLocked = (path: string) => matches(LOCKED, path)

/* Arcade games that need scored rounds before they make sense.
   Perfect Card opens once the first round is scored. */
export const CLOSED_GAMES = [
  '/games/lineup',
]

export const isClosedGame = (path: string) =>
  CLOSED_GAMES.some(p => path === p || path.startsWith(p + '/'))