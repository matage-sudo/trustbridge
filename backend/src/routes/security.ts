import { Router } from 'express';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const securityRouter = Router();

import { pool } from '../db';

securityRouter.get('/sessions', async (_req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const result = await pool.query(
      `SELECT s.*, d.label as "deviceLabel", d.platform as "devicePlatform", d."userAgent" as "deviceUserAgent", d.trusted as "deviceTrusted"
       FROM tb_patient_sessions s
       JOIN tb_patient_devices d ON s."deviceId" = d.id
       WHERE s."tenantId" = $1 AND s."userId" = $2 AND s.status = 'ACTIVE'
       ORDER BY s."lastSeenAt" DESC`,
      [tenantId, userId]
    );
    const sessions = result.rows.map(r => ({
      id: r.id, tenantId: r.tenantId, userId: r.userId, deviceId: r.deviceId,
      userAgent: r.userAgent, ipAddress: r.ipAddress, location: r.location,
      status: r.status, revokedAt: r.revokedAt, lastSeenAt: r.lastSeenAt, createdAt: r.createdAt,
      device: { label: r.deviceLabel, platform: r.devicePlatform, userAgent: r.deviceUserAgent, trusted: r.deviceTrusted }
    }));
    res.json({ items: sessions });
  } catch (err) { next(err); }
});

securityRouter.post('/sessions/:id/revoke', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;
    const sessRes = await pool.query('SELECT * FROM tb_patient_sessions WHERE id = $1 AND "tenantId" = $2 AND "userId" = $3', [id, tenantId, userId]);
    const session = sessRes.rows[0];
    if (!session) { res.status(404).json({ error: 'session_not_found' }); return; }
    if (session.status !== 'ACTIVE') { res.status(400).json({ error: 'session_not_active' }); return; }
    const updRes = await pool.query('UPDATE tb_patient_sessions SET status = $1, "revokedAt" = NOW() WHERE id = $2 RETURNING *', ['REVOKED', id]);
    await writeAudit({ action: 'security.session.revoked', resourceType: 'session', resourceId: id, payload: { deviceId: session.deviceId } });
    res.json(updRes.rows[0]);
  } catch (err) { next(err); }
});

securityRouter.post('/sessions/revoke-all', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { currentSessionId } = req.body;
    let query = 'UPDATE tb_patient_sessions SET status = $1, "revokedAt" = NOW() WHERE "tenantId" = $2 AND "userId" = $3 AND status = $4';
    const params = ['REVOKED', tenantId, userId, 'ACTIVE'];
    if (currentSessionId) { query += ' AND id != $5'; params.push(currentSessionId); }
    const result = await pool.query(query, params);
    await writeAudit({ action: 'security.session.revoked_all', resourceType: 'session', resourceId: 'all', payload: { count: result.rowCount, currentSessionId } });
    res.json({ revoked: result.rowCount });
  } catch (err) { next(err); }
});

securityRouter.get('/alerts', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const includeAcknowledged = req.query.includeAcknowledged === 'true';
    let query = 'SELECT * FROM tb_security_alerts WHERE "tenantId" = $1 AND "userId" = $2';
    const params = [tenantId, userId];
    if (!includeAcknowledged) query += ' AND acknowledged = false';
    query += ' ORDER BY "createdAt" DESC LIMIT 50';
    const result = await pool.query(query, params);
    res.json({ items: result.rows });
  } catch (err) { next(err); }
});

securityRouter.post('/alerts/:id/acknowledge', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;
    const alertRes = await pool.query('SELECT * FROM tb_security_alerts WHERE id = $1 AND "tenantId" = $2 AND "userId" = $3', [id, tenantId, userId]);
    if (alertRes.rows.length === 0) { res.status(404).json({ error: 'alert_not_found' }); return; }
    const updRes = await pool.query('UPDATE tb_security_alerts SET acknowledged = true, "acknowledgedAt" = NOW() WHERE id = $1 RETURNING *', [id]);
    await writeAudit({ action: 'security.alert.acknowledged', resourceType: 'security_alert', resourceId: id });
    res.json(updRes.rows[0]);
  } catch (err) { next(err); }
});

securityRouter.get('/devices', async (_req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const result = await pool.query('SELECT * FROM tb_patient_devices WHERE "tenantId" = $1 AND "userId" = $2 ORDER BY "lastSeenAt" DESC', [tenantId, userId]);
    res.json({ items: result.rows });
  } catch (err) { next(err); }
});