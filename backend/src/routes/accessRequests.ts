import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const accessRequestsRouter = Router();

// Helper: find the current user's membership in this tenant
async function currentMembership() {
  const { tenantId, userId } = currentTenant();
  const m = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!m) throw new Error('membership_not_found');
  return m;
}

// GET /v1/access-requests
// - For HOSPITAL_ADMIN, PRIVACY_OFFICER, SECURITY_INVESTIGATOR: all requests in tenant
// - For STAFF: only requests they created
accessRequestsRouter.get('/', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();
    const status = req.query.status as string | undefined;

    const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR'];
    const isBroad = broadRoles.includes(me.role);

    const requests = await prisma.accessRequest.findMany({
      where: {
        tenantId,
        ...(isBroad ? {} : { requesterId: me.id }),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, hospitalNumber: true } },
        requester: {
          select: {
            id: true,
            user: { select: { displayName: true, email: true } },
          },
        },
        grant: { select: { id: true, expiresAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ items: requests });
  } catch (err) {
    next(err);
  }
});

// POST /v1/access-requests  — staff creates a request
accessRequestsRouter.post('/', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();
    const { patientId, purpose, reason, requestedDurationHours } = req.body;

    if (!patientId || !purpose || !reason) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }

    // Patient must belong to this tenant
    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) {
      res.status(404).json({ error: 'patient_not_in_tenant' });
      return;
    }

    // If a grant already exists, just return success
    const existingGrant = await prisma.accessGrant.findFirst({
      where: {
        tenantId,
        granteeId: me.id,
        patientId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingGrant) {
      res.status(200).json({
        alreadyGranted: true,
        grant: existingGrant,
      });
      return;
    }

    // Create the request
    const request = await prisma.accessRequest.create({
      data: {
        tenantId,
        requesterId: me.id,
        patientId,
        purpose,
        reason,
        requestedDurationHours: requestedDurationHours ?? 4,
      },
    });

    await writeAudit({
      action: 'access_request.created',
      resourceType: 'access_request',
      resourceId: request.id,
      payload: { patientId, purpose, reason },
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// POST /v1/access-requests/:id/approve  — patient, admin, or privacy officer approves
accessRequestsRouter.post('/:id/approve', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();
    const { id } = req.params;

    const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'];
    if (!broadRoles.includes(me.role)) {
      res.status(403).json({ error: 'not_authorised_to_approve' });
      return;
    }

    const request = await prisma.accessRequest.findFirst({ where: { id, tenantId } });
    if (!request) {
      res.status(404).json({ error: 'request_not_found' });
      return;
    }
    if (request.status !== 'PENDING') {
      res.status(400).json({ error: `request_already_${request.status.toLowerCase()}` });
      return;
    }

    const expiresAt = new Date(
      Date.now() + (request.requestedDurationHours ?? 4) * 60 * 60 * 1000
    );

    // Create the grant
    const [updatedRequest, grant] = await prisma.$transaction([
      prisma.accessRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          decidedBy: me.id,
          decidedAt: new Date(),
        },
      }),
      prisma.accessGrant.create({
        data: {
          tenantId,
          requestId: id,
          granteeId: request.requesterId,
          patientId: request.patientId,
          purpose: request.purpose,
          expiresAt,
        },
      }),
    ]);

    await writeAudit({
      action: 'access_request.approved',
      resourceType: 'access_request',
      resourceId: id,
      payload: { grantId: grant.id, expiresAt: expiresAt.toISOString() },
    });

    res.json({ request: updatedRequest, grant });
  } catch (err) {
    next(err);
  }
});

// POST /v1/access-requests/:id/reject
accessRequestsRouter.post('/:id/reject', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();
    const { id } = req.params;
    const { reason } = req.body;

    const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'];
    if (!broadRoles.includes(me.role)) {
      res.status(403).json({ error: 'not_authorised_to_reject' });
      return;
    }

    const request = await prisma.accessRequest.findFirst({ where: { id, tenantId } });
    if (!request) {
      res.status(404).json({ error: 'request_not_found' });
      return;
    }
    if (request.status !== 'PENDING') {
      res.status(400).json({ error: `request_already_${request.status.toLowerCase()}` });
      return;
    }

    const updated = await prisma.accessRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decidedBy: me.id,
        decidedAt: new Date(),
        decisionReason: reason ?? 'No reason provided',
      },
    });

    await writeAudit({
      action: 'access_request.rejected',
      resourceType: 'access_request',
      resourceId: id,
      payload: { reason },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});