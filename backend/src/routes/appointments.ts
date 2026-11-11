import { Router } from 'express';
import { pool } from '../db';
import { currentTenant } from '../middleware/tenantContext';

export const appointmentsRouter = Router();

appointmentsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId, userId, role } = currentTenant();
    let query = `SELECT a.*, p."firstName", p."lastName", m."userId" as "staffUserId" 
                 FROM tb_appointments a
                 JOIN patients p ON a."patientId" = p.id
                 JOIN memberships m ON a."staffId" = m.id
                 WHERE a."tenantId" = $1`;
    const params = [tenantId];
    
    if (role === 'STAFF') {
      query += ' AND m."userId" = $2 ORDER BY a."scheduledAt" ASC';
      params.push(userId);
    } else if (role === 'PATIENT') {
      query += ' AND p.id IN (SELECT "patientId" FROM memberships WHERE "userId" = $2) ORDER BY a."scheduledAt" ASC';
      params.push(userId);
    } else {
      query += ' ORDER BY a."scheduledAt" DESC LIMIT 50';
    }
    
    const result = await pool.query(query, params);
    res.json({ items: result.rows });
  } catch (err) { next(err); }
});

appointmentsRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { patientId, staffId, scheduledAt, durationMins, reason } = req.body;
    const result = await pool.query(
      `INSERT INTO tb_appointments ("tenantId", "patientId", "staffId", "scheduledAt", "durationMins", reason) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, patientId, staffId, scheduledAt, durationMins || 30, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});
