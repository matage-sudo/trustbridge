import { Router } from 'express';
import { pool } from '../db';
import { currentTenant } from '../middleware/tenantContext';
import { calculatePatientRisk } from '../services/aiRiskEngine';
import { requireRole } from '../middleware/requireRole'; // hardening:airisk-import

export const aiRiskRouter = Router();

aiRiskRouter.get('/patients', requireRole('STAFF', 'HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR', 'SUPER_ADMIN'), async (req, res, next) => { // hardening:airisk-role
  try {
    const { tenantId } = currentTenant();
    const patients = await pool.query('SELECT id FROM patients WHERE "tenantId" = $1 LIMIT 50', [tenantId]);
    
    const results = [];
    for (const p of patients.rows) {
      const risk = await calculatePatientRisk(tenantId, p.id);
      if (risk) results.push({ id: p.id, ...risk });
    }
    
    // Sort by highest risk
    results.sort((a, b) => b.score - a.score);
    res.json({ items: results });
  } catch (err) { next(err); }
});

aiRiskRouter.get('/me', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const patientRes = await pool.query('SELECT id FROM patients WHERE "tenantId" = $2 AND "id" IN (SELECT "patientId" FROM memberships WHERE "userId" = $1 AND "tenantId" = $2) LIMIT 1', [userId, tenantId]); // hardening:airisk-me
    if (!patientRes.rows.length) { res.status(404).json({ error: 'Patient profile not found' }); return; }
    
    const risk = await calculatePatientRisk(tenantId, patientRes.rows[0].id);
    res.json(risk);
  } catch (err) { next(err); }
});
