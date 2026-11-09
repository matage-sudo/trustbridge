import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const consentsRouter = Router();

// GET /v1/consents
consentsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const status = req.query.status as string | undefined;

    const consents = await prisma.consent.findMany({
      where: {
        tenantId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, hospitalNumber: true } },
      },
      orderBy: { grantedAt: 'desc' },
      take: 100,
    });

    res.json({ items: consents });
  } catch (err) {
    next(err);
  }
});

// POST /v1/consents
consentsRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { patientId, purpose, noticeVersion, language, effectiveFrom, expiresAt } = req.body;

    if (!patientId || !purpose || !noticeVersion) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }

    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) {
      res.status(404).json({ error: 'patient_not_found_in_tenant' });
      return;
    }

    // Find the current user's membership (used for capturedBy)
    const membership = await prisma.membership.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });

    const consent = await prisma.consent.create({
      data: {
        tenantId,
        patientId,
        purpose,
        noticeVersion,
        language: language ?? 'en',
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        capturedBy: membership?.id ?? null,
      },
    });

    await writeAudit({
      action: 'consent.grant',
      resourceType: 'consent',
      resourceId: consent.id,
      payload: { patientId, purpose, noticeVersion },
    });

    res.status(201).json(consent);
  } catch (err) {
    next(err);
  }
});

// POST /v1/consents/:id/revoke
consentsRouter.post('/:id/revoke', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await prisma.consent.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ error: 'consent_not_found' });
      return;
    }
    if (existing.status !== 'ACTIVE') {
      res.status(400).json({ error: 'consent_not_active' });
      return;
    }

    const updated = await prisma.consent.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: reason ?? null,
      },
    });

    await writeAudit({
      action: 'consent.revoke',
      resourceType: 'consent',
      resourceId: id,
      payload: { reason },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});