import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { tenantStore } from './tenantContext';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.header('x-tenant-id');
  const userId = req.header('x-user-id');
  const role = req.header('x-role');
  if (!tenantId || !UUID_RE.test(tenantId)) { res.status(401).json({ error: 'missing_or_malformed_tenant_id' }); return; }
  if (!userId) { res.status(401).json({ error: 'missing_user_id' }); return; }
  if (!role) { res.status(401).json({ error: 'missing_role' }); return; }
  const correlationId = req.header('x-correlation-id') ?? randomUUID();
  res.setHeader('x-correlation-id', correlationId);
  tenantStore.run({ tenantId, userId, role, correlationId }, () => next());
}