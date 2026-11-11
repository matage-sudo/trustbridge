import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { tenantStore } from './tenantContext';
import { prisma } from '../models/prisma';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.header('x-tenant-id');
  const userId = req.header('x-user-id');

  if (!tenantId || !UUID_RE.test(tenantId)) { res.status(401).json({ error: 'missing_or_malformed_tenant_id' }); return; }
  if (!userId) { res.status(401).json({ error: 'missing_user_id' }); return; }

  try {
    // SECURITY: Never trust x-role from the client. Look it up securely.
    const membership = await prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true },
    });

    if (!membership) { res.status(403).json({ error: 'no_membership_for_tenant' }); return; }

    const correlationId = req.header('x-correlation-id') ?? randomUUID();
    res.setHeader('x-correlation-id', correlationId);

    tenantStore.run({ tenantId, userId, role: membership.role, correlationId }, () => { next(); });
  } catch (error: any) {
    req.log?.error({ err: error.message }, 'tenantMiddleware: db error');
    res.status(500).json({ error: 'internal_error' });
  }
}