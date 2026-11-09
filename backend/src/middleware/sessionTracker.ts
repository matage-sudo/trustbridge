import type { NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '../models/prisma';
import { currentTenant } from './tenantContext';

/**
 * Runs after tenantMiddleware. On every authenticated request:
 * 1. Computes device fingerprint from user-agent + IP (hash)
 * 2. Upserts the device (creating it if new + firing NEW_DEVICE alert)
 * 3. Upserts a session row for this user+device
 * 4. Updates lastSeenAt
 *
 * Non-blocking: errors are logged but do not fail the request.
 */
export async function sessionTracker(req: Request, res: Response, next: NextFunction) {
  // Kick off the work in the background; don't await to keep latency low.
  setImmediate(() => {
    trackSession(req).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[sessionTracker] failed:', err);
    });
  });
  next();
}

async function trackSession(req: Request) {
  const { tenantId, userId } = currentTenant();
  const ua = req.header('user-agent') ?? 'unknown';
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const fingerprint = createHash('sha256')
    .update(`${tenantId}:${userId}:${ua}:${ip}`)
    .digest('hex')
    .slice(0, 64);
  const label = labelFromUA(ua);
  const platform = platformFromUA(ua);

  // Upsert device
  let device = await prisma.patientDevice.findUnique({ where: { fingerprint } });
  if (!device) {
    device = await prisma.patientDevice.create({
      data: { tenantId, userId, fingerprint, label, userAgent: ua, platform, lastSeenAt: new Date() },
    });
    // Fire NEW_DEVICE alert
    await prisma.securityAlert.create({
      data: {
        tenantId,
        userId,
        kind: 'NEW_DEVICE',
        severity: 'MEDIUM',
        title: 'New device signed in',
        description: `A new device (${label}) signed in to your account. If this wasn't you, sign out all sessions immediately.`,
        metadata: { deviceId: device.id, userAgent: ua, ip },
      },
    });
  } else {
    await prisma.patientDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });
  }

  // Upsert session (one active session per user+device)
  const existingSession = await prisma.patientSession.findFirst({
    where: { tenantId, userId, deviceId: device.id, status: 'ACTIVE' },
  });
  if (existingSession) {
    await prisma.patientSession.update({
      where: { id: existingSession.id },
      data: { lastSeenAt: new Date() },
    });
  } else {
    await prisma.patientSession.create({
      data: {
        tenantId,
        userId,
        deviceId: device.id,
        userAgent: ua,
        ipAddress: ip,
        location: null,
      },
    });
  }
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