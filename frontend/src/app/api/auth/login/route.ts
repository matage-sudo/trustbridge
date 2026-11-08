import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// In-memory rate limiter (in production, use Redis)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const key = `${ip}:${email}`;
    const now = Date.now();
    const record = loginAttempts.get(key);

    // Check if locked out
    if (record && record.lockedUntil > now) {
      const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
      return NextResponse.json(
        { error: `Account locked. Try again in ${minutesLeft} minutes.` },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: any) { cookieStore.delete({ name, ...options }) },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Record failed attempt
      const current = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = now + LOCKOUT_MS;
        current.count = 0;
      }
      loginAttempts.set(key, current);

      // Log failed login attempt to audit trail
      await supabase.rpc('log_audit_event', { p_actor_id: null, p_action: 'LOGIN_FAILED', p_outcome: 'FAILURE' });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Success - clear attempts
    loginAttempts.delete(key);

    // Log successful login
    await supabase.rpc('log_audit_event', { p_actor_id: data.user.id, p_action: 'LOGIN_SUCCESS', p_outcome: 'SUCCESS' });
    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

