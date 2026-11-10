import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // 1. Dev fallback: if running locally and no token is sent, trust headers
  if (process.env.NODE_ENV === 'development' && !req.header('Authorization')) {
    return next();
  }

  // 2. Production / Token check
  const authHeader = req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  // 3. Override spoofable headers with the verified token's user ID
  req.headers['x-user-id'] = user.id;
  next();
}