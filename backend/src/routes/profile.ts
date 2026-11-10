import { Router } from 'express';
import { prisma } from '../models/prisma';
import { writeAudit } from '../services/audit';
import { resolvePatient } from '../services/representation';

export const profileRouter = Router();

const mask = (id: string | null) =>
  id ? `${'*'.repeat(Math.max(0, id.length - 4))}${id.slice(-4)}` : null;

// GET /v1/me/profile (own record, or a represented patient via x-acting-for)
profileRouter.get('/', async (req, res, next) => {
  try {
    const r = await resolvePatient(req, 'VIEW_PROFILE');
    if (!r.ok) {
      res.status(r.status).json({ error: r.error });
      return;
    }
    const { currentTenant } = await import('../middleware/tenantContext');
    const { tenantId } = currentTenant();

    const patient = await prisma.patient.findFirst({ where: { id: r.patientId, tenantId } });
    if (!patient) {
      res.status(404).json({ error: 'patient_not_found' });
      return;
    }
    res.json({
      ...patient,
      nationalId: mask(patient.nationalId),
      nationalIdIsMasked: true,
      actingAs: r.actingAs,
    });
  } catch (err) { next(err); }
});

// PATCH /v1/me/profile: only these fields are patient-editable
profileRouter.patch('/', async (req, res, next) => {
  try {
    const r = await resolvePatient(req, 'EDIT_PROFILE');
    if (!r.ok) {
      res.status(r.status).json({ error: r.error });
      return;
    }
    const { currentTenant } = await import('../middleware/tenantContext');
    const { tenantId } = currentTenant();

    const existing = await prisma.patient.findFirst({ where: { id: r.patientId, tenantId } });
    if (!existing) {
      res.status(404).json({ error: 'patient_not_found' });
      return;
    }

    const editable = ['phone', 'email', 'emergencyContactName', 'emergencyContactPhone', 'gender'];
    const updates: Record<string, any> = {};
    for (const key of editable) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'no_valid_fields_to_update' });
      return;
    }
    updates.lastProfileUpdateAt = new Date();

    const updated = await prisma.patient.update({ where: { id: r.patientId }, data: updates });

    await writeAudit({
      action: 'patient.profile.updated',
      resourceType: 'patient',
      resourceId: r.patientId,
      payload: {
        changedFields: Object.keys(updates).filter((k) => k !== 'lastProfileUpdateAt'),
        actingAs: r.actingAs,
        representationId: r.representationId ?? null,
      },
    });

    res.json({ ...updated, nationalId: mask(updated.nationalId), nationalIdIsMasked: true });
  } catch (err) { next(err); }
});

// POST /v1/me/profile/request-verification
profileRouter.post('/request-verification', async (req, res, next) => {
  try {
    const r = await resolvePatient(req, 'EDIT_PROFILE');
    if (!r.ok) {
      res.status(r.status).json({ error: r.error });
      return;
    }
    await writeAudit({
      action: 'patient.verification.requested',
      resourceType: 'patient',
      resourceId: r.patientId,
      payload: { actingAs: r.actingAs },
    });
    res.json({ requested: true });
  } catch (err) { next(err); }
});