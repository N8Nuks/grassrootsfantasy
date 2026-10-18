import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isClosed, isLocked, isClosedGame } from '@/lib/construction'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const closed = isClosed(pathname) || isClosedGame(pathname)
  const locked = isLocked(pathname)

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

  /* Closed and locked pages: rewrite rather than redirect, so the URL stays as
     typed and bookmarks still work when a page reopens. Both lists are empty in
     season; a path added to either in lib/construction.ts closes it on the next
     deploy. Admins pass straight through, so a page can be built and checked
     on the live site before anyone else sees it. The is_admin lookup only runs
     on a closed path. */
  if (closed || locked) {
    let isAdmin = false
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      isAdmin = profile?.is_admin === true
    }
    if (!isAdmin) {
      return NextResponse.rewrite(new URL(closed ? '/closed' : '/locked', request.url))
    }
  }

  // Protect /team routes — the app area
  if (!user && pathname.startsWith('/team')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}