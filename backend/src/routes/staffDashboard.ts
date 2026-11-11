import { Router } from 'express';
import { currentTenant } from '../middleware/tenantContext';
import { callerMembership } from '../services/representation';
import { prisma } from '../models/prisma';

export const staffDashboardRouter = Router();

staffDashboardRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me) { 
      res.status(403).json({ error: 'no_membership' }); 
      return; 
    }

    const emergencyCount = await prisma.emergencyAccess.count({
      where: {
        tenantId,
        reviewedAt: null,
        validUntil: { gt: new Date() },
      },
    });

    let pendingReps = 0;
    if (['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'].includes(me.role as string)) {
      pendingReps = await prisma.representative.count({
        where: {
          tenantId,
          verificationStatus: 'PENDING',
        },
      });
    }

    const announcements = await prisma.staffAnnouncement.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
    });

    res.json({
      stats: {
        pendingEmergencyReviews: emergencyCount,
        pendingRepresentativeRequests: pendingReps,
        role: me.role,
      },
      announcements,
    });
  } catch (err) { 
    next(err); 
  }
});