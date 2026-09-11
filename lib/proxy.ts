import { NextResponse, type NextRequest } from 'next/server'
import { isClosed, isLocked } from '@/lib/construction'

/* Runs before any route renders, so a closed page never gets the chance to
   query Supabase and render an empty state.

   Rewrite rather than redirect: the URL stays as the visitor typed it, so
   bookmarks keep working once these open again on the 18th.

   Next 16 renamed this convention from middleware to proxy — the file must be
   proxy.ts and the export must be named proxy. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isClosed(pathname)) {
    return NextResponse.rewrite(new URL('/closed', request.url))
  }
  if (isLocked(pathname)) {
    return NextResponse.rewrite(new URL('/locked', request.url))
  }
  return NextResponse.next()
}

/* The matcher has to be a literal — it can't be built from the arrays above.
   So rather than duplicate the list and risk the two drifting apart, this
   matches everything except static assets and lets the function decide. */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.json|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|webm|mp4)$).*)',
  ],
}