import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // IMPORTANT: Avoid writing to cookies if not needed (can cause infinite loops)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Define protected routes
  const isProtectedRoute = 
    path.startsWith('/patient') || 
    path.startsWith('/staff') || 
    path.startsWith('/admin') || 
    path.startsWith('/super-admin')

  // If not logged in and trying to access a protected route -> redirect to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Note: We intentionally do NOT check roles in Middleware. 
  // Middleware runs on the Edge, and fetching DB roles there can cause latency and sync issues.
  // Role-based Access Control (RBAC) is handled by <AppShell> on the client, 
  // and strictly enforced by the Backend API on every request.

  return response
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}