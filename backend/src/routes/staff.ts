import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const staffRouter = Router();

// GET /v1/staff - list memberships (staff) for current tenant
staffRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const search = req.query.search as string | undefined;

    const memberships = await prisma.membership.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              user: {
                OR: [
                  { email: { contains: search, mode: 'insensitive' } },
                  { displayName: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ items: memberships });
  } catch (err) {
    next(err);
  }
});

// GET /v1/staff/departments - list departments for current tenant
staffRouter.get('/departments', async (_req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const departments = await prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    res.json({ items: departments });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/staff/:membershipId - update role, department, employment status
staffRouter.patch('/:membershipId', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { membershipId } = req.params;
    const { role, departmentId, employmentStatus } = req.body;

    // Verify the membership belongs to this tenant
    const existing = await prisma.membership.findFirst({
      where: { id: membershipId, tenantId },
    });
    if (!existing) {
      res.status(404).json({ error: 'membership_not_found' });
      return;
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(role ? { role } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(employmentStatus ? { employmentStatus } : {}),
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await writeAudit({
      action: 'staff.update',
      resourceType: 'membership',
      resourceId: membershipId,
      payload: { role, departmentId, employmentStatus },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});