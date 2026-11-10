import { Router } from 'express';
import { currentTenant } from '../middleware/tenantContext';
import { UUID_RE } from '../services/representation';
import { Pool } from 'pg';
import {
  listNotifications,
  markRead,
  markAllRead,
} from '../services/notification-store';

export const notificationsRouter = Router();

// pg-based membership lookup. Avoids Prisma's failing engine; pg is proven
// to work on this machine. Only used here — not a replacement for
// callerMembership() elsewhere.
const membershipsPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

async function membershipForPatient(tenantId: string, userId: string):
  Promise<{ id: string; patientId: string | null } | null> {
  const r = await membershipsPool.query(
    `SELECT id, "patientId" FROM public.memberships
      WHERE "tenantId" = $1 AND "userId" = $2
      LIMIT 1`,
    [tenantId, userId]
  );
  return r.rows[0] ?? null;
}

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const me = await membershipForPatient(tenantId, userId);
    if (!me?.patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const unreadOnly = req.query.unread === 'true';

    const { items, unreadCount } = await listNotifications({
      tenantId, patientId: me.patientId, limit, unreadOnly,
    });
    res.json({ items, unreadCount });
  } catch (err) { next(err); }
});

notificationsRouter.patch('/:id/read', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const me = await membershipForPatient(tenantId, userId);
    if (!me?.patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }
    if (!UUID_RE.test(String(req.params.id ?? ''))) { res.status(400).json({ error: 'invalid_id' }); return; }

    const updated = await markRead({ tenantId, patientId: me.patientId, id: req.params.id! });
    if (!updated) { res.status(404).json({ error: 'not_found' }); return; }
    res.json(updated);
  } catch (err) { next(err); }
});

notificationsRouter.post('/read-all', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const me = await membershipForPatient(tenantId, userId);
    if (!me?.patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }

    const updated = await markAllRead({ tenantId, patientId: me.patientId });
    res.json({ updated });
  } catch (err) { next(err); }
});