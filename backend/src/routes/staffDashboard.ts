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

    const announcements = await prisma.announcement.findMany({
      where: { tenantId, OR: [{ audience: 'EVERYONE' }, { audience: 'ALL_STAFF' }, { audience: 'STAFF_MEMBER', targetMembershipId: me.id }] },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const todayWhere = { tenantId, staffId: me.id, scheduledAt: { gte: startOfDay, lte: endOfDay } };

    const [scheduledToday, completedToday, totalPatients, todayAppts] = await Promise.all([
      prisma.appointment.count({ where: { ...todayWhere, status: { not: 'CANCELLED' } } }),
      prisma.appointment.count({ where: { ...todayWhere, status: 'COMPLETED' } }),
      prisma.patient.count({ where: { tenantId, primaryDoctorId: me.id } }),
      prisma.appointment.findMany({
        where: todayWhere,
        orderBy: { scheduledAt: 'asc' },
        take: 10,
        include: { patient: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const STATUS_LABEL: Record<string, string> = { SCHEDULED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No show' };
    const todaySchedule = todayAppts.map((a) => ({
      time: a.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientName: a.patient.firstName + ' ' + a.patient.lastName,
      reason: a.reason || 'Consultation',
      status: STATUS_LABEL[a.status] || a.status,
    }));

    res.json({
      stats: {
        pendingEmergencyReviews: emergencyCount,
        pendingRepresentativeRequests: pendingReps,
        role: me.role,
        scheduledToday,
        completedToday,
        totalPatients,
      },
      announcements,
      todaySchedule,
    });
  } catch (err) { 
    next(err); 
  }
});