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
      query += ' AND p.id IN (SELECT "patientId" FROM memberships WHERE "userId" = $2 AND "tenantId" = $1) ORDER BY a."scheduledAt" ASC';
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
    const { patientId, staffId, scheduledAt, durationMins, reason } = req.body; // hardening:appt-post
    const ctx = currentTenant();
    const idRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const when = new Date(scheduledAt);
    const mins = durationMins === undefined || durationMins === null ? 30 : Number(durationMins);
    if (!idRe.test(String(patientId)) || !idRe.test(String(staffId)) || Number.isNaN(when.getTime()) || !Number.isInteger(mins) || mins < 5 || mins > 480) {
      res.status(400).json({ error: 'invalid_appointment_fields' });
      return;
    }
    if (!['PATIENT', 'STAFF', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(ctx.role)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    const pat = await pool.query('SELECT id FROM patients WHERE id = $1 AND "tenantId" = $2', [patientId, tenantId]);
    const stf = await pool.query('SELECT id FROM memberships WHERE id = $1 AND "tenantId" = $2', [staffId, tenantId]);
    if (pat.rows.length === 0 || stf.rows.length === 0) {
      res.status(404).json({ error: 'patient_or_staff_not_in_tenant' });
      return;
    }
    if (ctx.role === 'PATIENT') {
      const own = await pool.query('SELECT 1 FROM memberships WHERE "tenantId" = $1 AND "userId" = $2 AND "patientId" = $3', [tenantId, ctx.userId, patientId]);
      if (own.rows.length === 0) { res.status(403).json({ error: 'can_only_book_for_self' }); return; }
    }
    const result = await pool.query(
      `INSERT INTO tb_appointments ("tenantId", "patientId", "staffId", "scheduledAt", "durationMins", reason) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, patientId, staffId, scheduledAt, durationMins || 30, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});
