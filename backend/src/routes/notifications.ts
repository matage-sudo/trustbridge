import { Router } from 'express';
import { currentTenant } from '../middleware/tenantContext';
import { UUID_RE } from '../services/representation';
import { prisma } from '../models/prisma';
import {
  listNotifications,
  markRead,
  markAllRead,
} from '../services/notification-store';

export const notificationsRouter = Router();

/**
 * Resolve the caller's membership + linked patient for the current tenant.
 * Uses Prisma (fast, typed). Falls back to null if the caller has no membership.
 */
async function membershipForPatient(
  tenantId: string,
  userId: string
): Promise<{ id: string; patientId: string | null } | null> {
  const m = await prisma.membership.findFirst({
    where: { tenantId, userId, active: true },
    select: { id: true, patientId: true },
  });
  return m ?? null;
}

// GET /v1/me/notifications
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const m = await membershipForPatient(tenantId, userId);

    // Non-patients (admins, staff) have no patient link → return empty, not 403.
    // This avoids spamming the bell for users who aren't patients.
    if (!m || !m.patientId) {
      res.json({ items: [], unreadCount: 0 });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const unreadOnly = req.query.unread === 'true';
    const result = await listNotifications({
      tenantId,
      patientId: m.patientId,
      limit,
      unreadOnly,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/me/notifications/:id/read
notificationsRouter.post('/:id/read', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const m = await membershipForPatient(tenantId, userId);

    if (!m || !m.patientId) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (!UUID_RE.test(String(req.params.id ?? ''))) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }

    const updated = await markRead({
      tenantId,
      patientId: m.patientId,
      id: req.params.id,
    });
    if (!updated) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /v1/me/notifications/read-all
notificationsRouter.post('/read-all', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const m = await membershipForPatient(tenantId, userId);

    if (!m || !m.patientId) {
      res.json({ marked: 0 });
      return;
    }

    const marked = await markAllRead({ tenantId, patientId: m.patientId });
    res.json({ marked });
  } catch (err) {
    next(err);
  }
});