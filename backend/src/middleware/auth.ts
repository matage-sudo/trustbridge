import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-init so this module can be imported by tests and other tools
// without a valid SUPABASE_SERVICE_ROLE_KEY in the environment.
let _client: SupabaseClient | null = null;
function supabase() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    _client = createClient(url, key);
  }
  return _client;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Dev fallback: if running locally and no token is sent, trust headers.
  if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && !req.header('Authorization')) {
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