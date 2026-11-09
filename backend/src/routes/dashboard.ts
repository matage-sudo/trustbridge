import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (_req, res, next) => {
  try {
    const { tenantId } = currentTenant();

    const [tenant, memberCount, auditCount, patientCount, apptCount, consentCount, recentAudit] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.membership.count({ where: { tenantId, active: true } }),
      prisma.auditEvent.count({ where: { tenantId } }),
      prisma.patient.count({ where: { tenantId } }),
      prisma.appointment.count({ where: { tenantId } }),
      prisma.consent.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.auditEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null,
      stats: {
        activeUsers: memberCount,
        totalAuditEvents: auditCount,
        patients: patientCount,
        appointments: apptCount,
        consents: consentCount,
      },
      recentActivity: recentAudit.map((e) => ({
        id: e.id,
        action: e.action,
        outcome: e.outcome,
        timestamp: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/platform/tenants', async (_req, res, next) => {
  try {
    const { role } = currentTenant();

    // ENFORCE SUPER ADMIN ONLY
    if (role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'not_authorised_super_admin' });
      return;
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { memberships: true, patients: true, auditEvents: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ items: tenants });
  } catch (err) {
    next(err);
  }
});