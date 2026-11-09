import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const securityRouter = Router();

// GET /v1/security/sessions - list active sessions for current user
securityRouter.get('/sessions', async (_req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const sessions = await prisma.patientSession.findMany({
      where: { tenantId, userId, status: 'ACTIVE' },
      include: {
        device: { select: { label: true, platform: true, userAgent: true, trusted: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    });
    res.json({ items: sessions });
  } catch (err) { next(err); }
});

// POST /v1/security/sessions/:id/revoke - revoke one session
securityRouter.post('/sessions/:id/revoke', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;
    const session = await prisma.patientSession.findFirst({
      where: { id, tenantId, userId },
    });
    if (!session) {
      res.status(404).json({ error: 'session_not_found' });
      return;
    }
    if (session.status !== 'ACTIVE') {
      res.status(400).json({ error: 'session_not_active' });
      return;
    }
    const updated = await prisma.patientSession.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await writeAudit({
      action: 'security.session.revoked',
      resourceType: 'session',
      resourceId: id,
      payload: { deviceId: session.deviceId },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /v1/security/sessions/revoke-all - revoke all except current
securityRouter.post('/sessions/revoke-all', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { currentSessionId } = req.body;
    const result = await prisma.patientSession.updateMany({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await writeAudit({
      action: 'security.session.revoked_all',
      resourceType: 'session',
      resourceId: 'all',
      payload: { count: result.count, currentSessionId },
    });
    res.json({ revoked: result.count });
  } catch (err) { next(err); }
});

// GET /v1/security/alerts - alerts for current user
securityRouter.get('/alerts', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const includeAcknowledged = req.query.includeAcknowledged === 'true';
    const alerts = await prisma.securityAlert.findMany({
      where: {
        tenantId,
        userId,
        ...(includeAcknowledged ? {} : { acknowledged: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ items: alerts });
  } catch (err) { next(err); }
});

// POST /v1/security/alerts/:id/acknowledge
securityRouter.post('/alerts/:id/acknowledge', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;
    const alert = await prisma.securityAlert.findFirst({
      where: { id, tenantId, userId },
    });
    if (!alert) {
      res.status(404).json({ error: 'alert_not_found' });
      return;
    }
    const updated = await prisma.securityAlert.update({
      where: { id },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });
    await writeAudit({
      action: 'security.alert.acknowledged',
      resourceType: 'security_alert',
      resourceId: id,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// GET /v1/security/devices - list devices for current user
securityRouter.get('/devices', async (_req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const devices = await prisma.patientDevice.findMany({
      where: { tenantId, userId },
      orderBy: { lastSeenAt: 'desc' },
    });
    res.json({ items: devices });
  } catch (err) { next(err); }
});