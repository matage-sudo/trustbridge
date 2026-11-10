import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '../models/prisma';

const isProduction = process.env.NODE_ENV === 'production';
const allowDevHeaders = process.env.ALLOW_DEV_HEADERS === 'true';

let _verifyClient: SupabaseClient | null = null;
function supabaseVerifier(): SupabaseClient {
  if (!_verifyClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    }
    _verifyClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _verifyClient;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const devFallbackOn = allowDevHeaders && !isProduction;

  if (devFallbackOn && !req.header('Authorization')) {
    if (!req.header('x-user-id')) {
      res.status(401).json({ error: 'dev_fallback_requires_x_user_id' });
      return;
    }
    return next();
  }

  const authHeader = req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  let user: { email?: string | null } | null = null;

  try {
    const { data, error } = await supabaseVerifier().auth.getUser(token);
    if (error) {
      const log = (req as any).log;
      log?.warn?.({ reason: error.message }, 'auth: getUser failed');
      res.status(401).json({ error: 'invalid_token', detail: error.message });
      return;
    }
    user = data.user;
  } catch (err: any) {
    const log = (req as any).log;
    log?.error?.({ err: err?.message }, 'auth: getUser threw');
    res.status(401).json({ error: 'token_verification_failed', detail: err?.message });
    return;
  }

  const email = user?.email;
  if (!email) {
    res.status(401).json({ error: 'token_missing_email' });
    return;
  }

  const identity = await prisma.userIdentity.findFirst({
    where: { email },
    select: { id: true },
  });
  if (!identity) {
    const log = (req as any).log;
    log?.warn?.({ email }, 'auth: no user_identities row');
    res.status(401).json({ error: 'no_user_identity_for_email', email });
    return;
  }

  req.headers['x-user-id'] = identity.id;
  next();
}