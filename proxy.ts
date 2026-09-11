import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isClosed, isLocked, isClosedGame } from '@/lib/construction'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  /* Closed pages are settled before any Supabase work — there's no point
     refreshing a session for a page nobody can reach. Rewrite rather than
     redirect, so the URL stays as typed and bookmarks still work when these
     open again on the 18th. */
  if (isClosed(pathname) || isClosedGame(pathname)) {
    return NextResponse.rewrite(new URL('/closed', request.url))
  }
  if (isLocked(pathname)) {
    return NextResponse.rewrite(new URL('/locked', request.url))
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