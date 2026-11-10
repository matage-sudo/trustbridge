import type { NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '../models/prisma';
import { currentTenant } from './tenantContext';

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
  let tenantContext: ReturnType<typeof currentTenant> | undefined;
  try {
    tenantContext = currentTenant();
  } catch {
    return;
  }

  if (!tenantContext) {
    return;
  }

  const { tenantId, userId } = tenantContext;
  const ua = req.header('user-agent') ?? 'unknown';
  const ip = resolveClientIp(req);
  const fingerprint = createHash('sha256')
    .update(`${tenantId}:${userId}:${ua}:${ip}`)
    .digest('hex')
    .slice(0, 64);
  const label = labelFromUA(ua);
  const platform = platformFromUA(ua);

  await prisma.$transaction(async (tx) => {
    let device = await tx.patientDevice.findUnique({ where: { fingerprint } });
    if (!device) {
      device = await tx.patientDevice.create({
        data: { tenantId, userId, fingerprint, label, userAgent: ua, platform, lastSeenAt: new Date() },
      });
      await tx.securityAlert.create({
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
      await tx.patientDevice.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date() },
      });
    }

    const existingSession = await tx.patientSession.findFirst({
      where: { tenantId, userId, deviceId: device.id, status: 'ACTIVE' },
    });

    if (existingSession) {
      await tx.patientSession.update({
        where: { id: existingSession.id },
        data: { lastSeenAt: new Date(), userAgent: ua, ipAddress: ip },
      });
      return;
    }

    await tx.patientSession.create({
      data: {
        tenantId,
        userId,
        deviceId: device.id,
        userAgent: ua,
        ipAddress: ip,
        location: null,
      },
    });
  });
}

function resolveClientIp(req: Request): string {
  const forwardedFor = req.header('x-forwarded-for');
  if (forwardedFor) {
    const [ip] = forwardedFor.split(',').map((value) => value.trim()).filter(Boolean);
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