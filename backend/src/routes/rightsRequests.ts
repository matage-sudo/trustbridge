import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const rightsRouter = Router();

async function currentMembership() {
  const { tenantId, userId } = currentTenant();
  const m = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!m) throw new Error('membership_not_found');
  return m;
}

// GET /v1/rights-requests
// Patients see their own; admins/officers see all in tenant
rightsRouter.get('/', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();
    const status = req.query.status as string | undefined;

    const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR'];
    const isBroad = broadRoles.includes(me.role);

    const requests = await prisma.dataSubjectRequest.findMany({
      where: {
        tenantId,
        ...(isBroad ? {} : { requesterId: me.id }),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        requester: {
          select: {
            id: true,
            role: true,
            user: { select: { displayName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ items: requests });
  } catch (err) { next(err); }
});

// POST /v1/rights-requests — create a new DSR
rightsRouter.post('/', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();
    const { type, description } = req.body;

    if (!type || !description) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }

    const allowedTypes = ['ACCESS', 'CORRECTION', 'ERASURE', 'OBJECTION', 'PORTABILITY', 'COMPLAINT'];
    if (!allowedTypes.includes(type)) {
      res.status(400).json({ error: 'invalid_type' });
      return;
    }

    // Generate reference number: DSR-<year>-<sequential>
    const year = new Date().getFullYear();
    const count = await prisma.dataSubjectRequest.count({ where: { tenantId } });
    const seq = String(count + 1).padStart(4, '0');
    const referenceNumber = `DSR-${year}-${seq}`;

    const request = await prisma.dataSubjectRequest.create({
      data: {
        tenantId,
        referenceNumber,
        requesterId: me.id,
        patientId: me.patientId ?? null,
        type,
        description,
      },
    });

    await writeAudit({
      action: 'dsr.submitted',
      resourceType: 'data_subject_request',
      resourceId: request.id,
      payload: { referenceNumber, type },
    });

    res.status(201).json(request);
  } catch (err) { next(err); }
});

// POST /v1/rights-requests/:id/respond — admin/officer writes a response
rightsRouter.post('/:id/respond', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();
    const { id } = req.params;
    const { response } = req.body;

    const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'];
    if (!broadRoles.includes(me.role)) {
      res.status(403).json({ error: 'not_authorised_to_respond' });
      return;
    }
    if (!response || !response.trim()) {
      res.status(400).json({ error: 'response_required' });
      return;
    }

    const request = await prisma.dataSubjectRequest.findFirst({ where: { id, tenantId } });
    if (!request) {
      res.status(404).json({ error: 'request_not_found' });
      return;
    }
    if (request.status === 'CLOSED') {
      res.status(400).json({ error: 'request_already_closed' });
      return;
    }

    const updated = await prisma.dataSubjectRequest.update({
      where: { id },
      data: {
        adminResponse: response,
        respondedBy: me.id,
        respondedAt: new Date(),
        status: 'RESPONDED',
      },
    });

    await writeAudit({
      action: 'dsr.responded',
      resourceType: 'data_subject_request',
      resourceId: id,
      payload: { referenceNumber: request.referenceNumber },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// POST /v1/rights-requests/:id/close — admin/officer closes
rightsRouter.post('/:id/close', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();
    const { id } = req.params;

    const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'];
    if (!broadRoles.includes(me.role)) {
      res.status(403).json({ error: 'not_authorised_to_close' });
      return;
    }

    const request = await prisma.dataSubjectRequest.findFirst({ where: { id, tenantId } });
    if (!request) {
      res.status(404).json({ error: 'request_not_found' });
      return;
    }
    if (request.status === 'CLOSED') {
      res.status(400).json({ error: 'request_already_closed' });
      return;
    }

    const updated = await prisma.dataSubjectRequest.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    await writeAudit({
      action: 'dsr.closed',
      resourceType: 'data_subject_request',
      resourceId: id,
      payload: { referenceNumber: request.referenceNumber },
    });

    res.json(updated);
  } catch (err) { next(err); }
});