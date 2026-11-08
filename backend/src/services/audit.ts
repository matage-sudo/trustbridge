import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
export interface AuditInput {
  action: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: 'success' | 'deny' | 'error';
  reasonCode?: string;
  payload?: Record<string, unknown>;
}
export async function writeAudit(input: AuditInput) {
  const ctx = currentTenant();
  return prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      outcome: input.outcome ?? 'success',
      reasonCode: input.reasonCode,
      correlationId: ctx.correlationId,
      payload: input.payload as object | undefined,
    },
  });
}