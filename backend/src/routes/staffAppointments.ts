import { Router } from 'express';
import { pool } from '../db';
import { currentTenant } from '../middleware/tenantContext';

export const staffAppointmentsRouter = Router();

staffAppointmentsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const result = await pool.query(
      `SELECT a.*, p."firstName", p."lastName", p."hospitalNumber" 
       FROM tb_appointments a
       JOIN patients p ON a."patientId" = p.id
       JOIN memberships m ON a."staffId" = m.id
       WHERE a."tenantId" = $1 AND m."userId" = $2
       ORDER BY a."scheduledAt" ASC`,
      [tenantId, userId]
    );
    res.json({ items: result.rows });
  } catch (err) { next(err); }
});
