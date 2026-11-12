import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { pool } from '../db';
import { prisma } from '../models/prisma';

const isProduction = process.env.NODE_ENV === 'production';
const allowDevHeaders = process.env.ALLOW_DEV_HEADERS === 'true';
const allowAutoProvision = process.env.ALLOW_AUTO_PROVISION === 'true';
const DEFAULT_TENANT_ID = 'ad0a4777-cee4-4e69-894a-410648d8b22a';

let _verifyClient: SupabaseClient | null = null;
function supabaseVerifier(): SupabaseClient {
  if (!_verifyClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    _verifyClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return _verifyClient;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isProduction && allowDevHeaders) throw new Error('CRITICAL: ALLOW_DEV_HEADERS enabled in production!');

  const devFallbackOn = allowDevHeaders && !isProduction;
  if (devFallbackOn && !req.header('Authorization')) {
    if (!req.header('x-user-id')) { res.status(401).json({ error: 'dev_fallback_requires_x_user_id' }); return; }
    return next();
  }

  const authHeader = req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'missing_token' }); return; }

  const token = authHeader.slice('Bearer '.length).trim();
  let user;
  
  try {
    const { data, error } = await supabaseVerifier().auth.getUser(token);
    if (error) { res.status(401).json({ error: 'invalid_token', detail: error.message }); return; }
    user = data.user;
  } catch (err: any) {
    res.status(401).json({ error: 'token_verification_failed', detail: err?.message }); return;
  }

  if (!user?.email) { res.status(401).json({ error: 'token_missing_email' }); return; }

  const identityRes = await pool.query('SELECT * FROM user_identities WHERE email = $1', [user.email]);
     const identity = identityRes.rows[0];

  if (!identity) {
    if (!allowAutoProvision) { res.status(403).json({ error: 'identity_not_provisioned' }); return; }
    req.log?.info({ email: user.email }, 'auth: auto-provisioning new user as PATIENT');
    const newIdentity = await prisma.userIdentity.create({
      data: {
        email: user.email,
        displayName: user.user_metadata?.full_name || user.email.split('@')[0],
        memberships: { create: { tenantId: DEFAULT_TENANT_ID, role: 'PATIENT' } }
      },
      select: { id: true }
    });
    req.headers['x-user-id'] = newIdentity.id;
    return next();
  }

  req.headers['x-user-id'] = identity.id;
  next();
}