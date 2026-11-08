import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (_req, res, next) => {
  try {
    const { tenantId } = currentTenant();

    // Run in parallel for speed
    const [tenant, memberCount, auditCount, recentAudit] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.membership.count({ where: { tenantId, active: true } }),
      prisma.auditEvent.count({ where: { tenantId } }),
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
        // Placeholders until we add more tables
        patients: 0,
        appointments: 0,
        consents: 0,
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