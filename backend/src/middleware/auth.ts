import { config } from 'dotenv';
import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

config();

let _client: SupabaseClient | null = null;
function supabase() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('[auth] CRITICAL: Missing Supabase env vars.');
      throw new Error('SUPABASE vars missing');
    }
    _client = createClient(url, key);
  }
  return _client;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const env = process.env.NODE_ENV ?? 'development';
  const devOrTest = env === 'development' || env === 'test';

  if (devOrTest && !req.header('Authorization')) {
    return next();
  }

  const authHeader = req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase().auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  req.headers['x-user-id'] = user.id;
  next();
}