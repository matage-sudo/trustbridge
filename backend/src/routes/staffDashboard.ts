import { Router } from 'express';
import { currentTenant } from '../middleware/tenantContext';
import { callerMembership } from '../services/representation';
import { Pool } from 'pg';

export const staffDashboardRouter = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

staffDashboardRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me) { res.status(403).json({ error: 'no_membership' }); return; }

    // 1. Emergency reviews (unreviewed)
    const emergency = await pool.query(
      `SELECT COUNT(*)::int as count FROM public.emergency_access 
       WHERE "tenantId" = $1 AND "reviewedAt" IS NULL AND "validUntil" > now()`,
      [tenantId]
    );

    // 2. Pending rep requests
    let pendingReps = 0;
    if (['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'].includes(me.role as string)) {
      const reps = await pool.query(
        `SELECT COUNT(*)::int as count FROM public.representatives 
         WHERE "tenantId" = $1 AND "verificationStatus" = 'PENDING'`,
        [tenantId]
      );
      pendingReps = reps.rows[0].count;
    }

    // 3. Announcements
    const ann = await pool.query(
      `SELECT id, title, content, "createdAt" FROM public.staff_announcements 
       WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 5`,
      [tenantId]
    );

    res.json({
      stats: {
        pendingEmergencyReviews: emergency.rows[0].count,
        pendingRepresentativeRequests: pendingReps,
        role: me.role,
      },
      announcements: ann.rows,
    });
  } catch (err) { next(err); }
});