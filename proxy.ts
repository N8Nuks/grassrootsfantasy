import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isClosed, isLocked, isClosedGame, BYPASS_KEY, BYPASS_COOKIE } from '@/lib/construction'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  /* Closed pages are settled before any Supabase work — there's no point
     refreshing a session for a page nobody can reach. Rewrite rather than
     redirect, so the URL stays as typed and bookmarks still work when these
     open again on the 18th. */
  /* One key opens everything. Set it on any locked page with ?key=… and the
     cookie carries you through the closed pages too, so the real /team and
     /ladder can be worked on while everyone else sees the notice. */
  const hasPass = request.cookies.get(BYPASS_COOKIE)?.value === BYPASS_KEY

  if ((isClosed(pathname) || isClosedGame(pathname)) && !hasPass) {
    return NextResponse.rewrite(new URL('/closed', request.url))
  }
  if (isLocked(pathname)) {
    /* The key in the URL grants a pass and is remembered, so the redirects
       inside registration and login don't kick you back out. */
    if (request.nextUrl.searchParams.get('key') === BYPASS_KEY) {
      const url = request.nextUrl.clone()
      url.searchParams.delete('key')
      const pass = NextResponse.redirect(url)
      pass.cookies.set(BYPASS_COOKIE, BYPASS_KEY, {
        httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 10,
      })
      return pass
    }
    if (!hasPass) {
      return NextResponse.rewrite(new URL('/locked', request.url))
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired — keeps users logged in
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /team routes — the app area
  if (!user && request.nextUrl.pathname.startsWith('/team')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}