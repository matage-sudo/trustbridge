import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/admin': ['SYSTEM_ADMIN', 'COMPLIANCE_OFFICER'],
  '/admin/users': ['SYSTEM_ADMIN'],
  '/admin/audit': ['SYSTEM_ADMIN', 'COMPLIANCE_OFFICER'],
  '/admin/assignments': ['SYSTEM_ADMIN'],
  '/admin/patients': ['SYSTEM_ADMIN', 'COMPLIANCE_OFFICER'],
  '/admin/adapter': ['SYSTEM_ADMIN'],
  '/staff-dashboard': ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST'],
  '/staff-dashboard/clinical': ['DOCTOR', 'NURSE'],
  '/staff-dashboard/pharmacy': ['DOCTOR', 'NURSE', 'PHARMACIST'],
  '/staff-dashboard/appointments': ['DOCTOR', 'RECEPTIONIST'],
  '/staff-dashboard/billing': ['RECEPTIONIST', 'SYSTEM_ADMIN'],
  '/staff-dashboard/settings': ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST'],
  '/dashboard': ['PATIENT'],
  '/dashboard/vault': ['PATIENT'],
  '/dashboard/consent': ['PATIENT'],
  '/dashboard/dsar': ['PATIENT'],
  '/dashboard/messages': ['PATIENT'],
  '/dashboard/chatbot': ['PATIENT'],
  '/dashboard/settings': ['PATIENT'],
};

const ROLE_HOME: Record<string, string> = {
  PATIENT: '/dashboard',
  DOCTOR: '/staff-dashboard',
  NURSE: '/staff-dashboard',
  RECEPTIONIST: '/staff-dashboard',
  PHARMACIST: '/staff-dashboard',
  COMPLIANCE_OFFICER: '/admin',
  SYSTEM_ADMIN: '/admin',
};

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'http:') {
    return NextResponse.redirect(new URL(`https://${request.nextUrl.host}${request.nextUrl.pathname}`, request.url));
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (pathname === '/update-password') return response;

  const publicRoutes = ['/', '/login', '/register'];
  if (publicRoutes.includes(pathname)) {
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const role = profile?.role || 'PATIENT';
      return NextResponse.redirect(new URL(ROLE_HOME[role] || '/dashboard', request.url));
    }
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role || 'PATIENT';

  const matchingRoute = Object.keys(ROUTE_PERMISSIONS)
    .filter(route => pathname === route || pathname.startsWith(route + '/'))
    .sort((a, b) => b.length - a.length)[0];

  if (matchingRoute) {
    const allowedRoles = ROUTE_PERMISSIONS[matchingRoute];
    if (!allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] || '/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
