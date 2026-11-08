import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
export async function listMembershipsForCurrentTenant() {
  const { tenantId } = currentTenant();
  return prisma.membership.findMany({
    where: { tenantId },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      tenant: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}
export async function getTenantById(tenantId: string) {
  const ctx = currentTenant();
  if (ctx.tenantId !== tenantId) return null;
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}