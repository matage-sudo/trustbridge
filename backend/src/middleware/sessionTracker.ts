import type { NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { currentTenant } from './tenantContext';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function sessionTracker(req: Request, res: Response, next: NextFunction) {
  setImmediate(() => {
    trackSession(req).catch((err) => {
      console.error('[sessionTracker] failed:', err);
    });
  });
  next();
}

async function trackSession(req: Request) {
  let tenantContext: ReturnType<typeof currentTenant> | undefined;
  try { tenantContext = currentTenant(); } catch { return; }
  if (!tenantContext) return;

  const { tenantId, userId } = tenantContext;
  const ua = req.header('user-agent') ?? 'unknown';
  const ip = resolveClientIp(req);
  const fingerprint = createHash('sha256').update(`${tenantId}:${userId}:${ua}:${ip}`).digest('hex').slice(0, 64);
  const label = labelFromUA(ua);
  const platform = platformFromUA(ua);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let deviceId;
    const devRes = await client.query('SELECT id FROM tb_patient_devices WHERE fingerprint = $1 LIMIT 1', [fingerprint]);
    
    if (devRes.rows.length === 0) {
      const insRes = await client.query(
        'INSERT INTO tb_patient_devices ("tenantId", "userId", fingerprint, label, "userAgent", platform, "lastSeenAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id',
        [tenantId, userId, fingerprint, label, ua, platform]
      );
      deviceId = insRes.rows[0].id;
      
      await client.query(
        'INSERT INTO tb_security_alerts ("tenantId", "userId", kind, severity, title, description, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [tenantId, userId, 'NEW_DEVICE', 'MEDIUM', 'New device signed in', `A new device (${label}) signed in to your account. If this wasn't you, sign out all sessions immediately.`, JSON.stringify({ deviceId, userAgent: ua, ip })]
      );
    } else {
      deviceId = devRes.rows[0].id;
      await client.query('UPDATE tb_patient_devices SET "lastSeenAt" = NOW(), "updatedAt" = NOW() WHERE id = $1', [deviceId]);
    }

    const sessRes = await client.query(
      'SELECT id FROM tb_patient_sessions WHERE "tenantId" = $1 AND "userId" = $2 AND "deviceId" = $3 AND status = $4 LIMIT 1',
      [tenantId, userId, deviceId, 'ACTIVE']
    );

    if (sessRes.rows.length > 0) {
      await client.query(
        'UPDATE tb_patient_sessions SET "lastSeenAt" = NOW(), "userAgent" = $1, "ipAddress" = $2 WHERE id = $3',
        [ua, ip, sessRes.rows[0].id]
      );
    } else {
      await client.query(
        'INSERT INTO tb_patient_sessions ("tenantId", "userId", "deviceId", "userAgent", "ipAddress", status) VALUES ($1, $2, $3, $4, $5, $6)',
        [tenantId, userId, deviceId, ua, ip, 'ACTIVE']
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function resolveClientIp(req: Request): string {
  const forwardedFor = req.header('x-forwarded-for');
  if (forwardedFor) {
    const [ip] = forwardedFor.split(',').map((v) => v.trim()).filter(Boolean);
    if (ip) return ip;
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function labelFromUA(ua: string): string {
  if (/iPhone/i.test(ua)) return 'iPhone Safari';
  if (/iPad/i.test(ua)) return 'iPad Safari';
  if (/Android/i.test(ua) && /Chrome/i.test(ua)) return 'Android Chrome';
  if (/Macintosh/i.test(ua) && /Chrome/i.test(ua)) return 'Mac Chrome';
  if (/Macintosh/i.test(ua) && /Safari/i.test(ua)) return 'Mac Safari';
  if (/Windows/i.test(ua) && /Chrome/i.test(ua)) return 'Windows Chrome';
  if (/Windows/i.test(ua) && /Firefox/i.test(ua)) return 'Windows Firefox';
  if (/Windows/i.test(ua) && /Edge/i.test(ua)) return 'Windows Edge';
  if (/Linux/i.test(ua) && /Chrome/i.test(ua)) return 'Linux Chrome';
  return 'Unknown device';
}

function platformFromUA(ua: string): string {
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh/i.test(ua)) return 'macOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}