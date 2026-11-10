import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const profileRouter = Router();

async function currentMembership() {
  const { tenantId, userId } = currentTenant();
  const m = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!m) throw new Error('membership_not_found');
  return m;
}

// GET /v1/me/profile — return the caller's linked patient record
profileRouter.get('/', async (_req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();

    if (!me.patientId) {
      res.status(404).json({ error: 'no_patient_linked' });
      return;
    }

    const patient = await prisma.patient.findFirst({
      where: { id: me.patientId, tenantId },
    });
    if (!patient) {
      res.status(404).json({ error: 'patient_not_found' });
      return;
    }

    // Mask the national ID for the response
    const masked = patient.nationalId
      ? `${'*'.repeat(Math.max(0, patient.nationalId.length - 4))}${patient.nationalId.slice(-4)}`
      : null;

    res.json({
      ...patient,
      nationalId: masked,
      nationalIdIsMasked: true,
    });
  } catch (err) { next(err); }
});

// PATCH /v1/me/profile — update permitted fields
profileRouter.patch('/', async (req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();

    if (!me.patientId) {
      res.status(404).json({ error: 'no_patient_linked' });
      return;
    }

    const existing = await prisma.patient.findFirst({
      where: { id: me.patientId, tenantId },
    });
    if (!existing) {
      res.status(404).json({ error: 'patient_not_found' });
      return;
    }

    // Only these fields are patient-editable. National ID, hospital number,
    // and identity verification require admin review.
    const editable = [
      'phone',
      'email',
      'emergencyContactName',
      'emergencyContactPhone',
      'gender',
    ];

    const updates: Record<string, any> = {};
    for (const key of editable) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'no_valid_fields_to_update' });
      return;
    }

    updates.lastProfileUpdateAt = new Date();

    const updated = await prisma.patient.update({
      where: { id: me.patientId },
      data: updates,
    });

    await writeAudit({
      action: 'patient.profile.updated',
      resourceType: 'patient',
      resourceId: me.patientId,
      payload: { changedFields: Object.keys(updates).filter((k) => k !== 'lastProfileUpdateAt') },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// POST /v1/me/profile/request-verification — patient asks for national-ID verification
profileRouter.post('/request-verification', async (_req, res, next) => {
  try {
    const me = await currentMembership();
    const { tenantId } = currentTenant();

    if (!me.patientId) {
      res.status(404).json({ error: 'no_patient_linked' });
      return;
    }

    await writeAudit({
      action: 'patient.verification.requested',
      resourceType: 'patient',
      resourceId: me.patientId,
      payload: { tenantId },
    });

    res.json({ requested: true });
  } catch (err) { next(err); }
});