import { createClient } from '@supabase/supabase-js';

/**
 * Diagnostic helper — mints a fresh Supabase JWT for a given email/password.
 * Used by scripts/test-jwt.ts to prove the middleware works end-to-end.
 * NOT imported by server.ts or any route.
 */
export async function mintTestJwt(
  email: string,
  password: string
): Promise<{ token: string | null; error: string | null }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { token: null, error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' };
  }
  const client = createClient(url, key, { auth: { persistSession: false } });

  // Service-role client cannot sign in as a user. Use the anon flow.
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseAnonKey) {
    return {
      token: null,
      error:
        'SUPABASE_ANON_KEY is missing in .env — add the anon/public key from Supabase settings.',
    };
  }
  const authClient = createClient(url, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { token: null, error: error.message };
  if (!data.session?.access_token) {
    return { token: null, error: 'no_session_returned' };
  }
  return { token: data.session.access_token, error: null };
}