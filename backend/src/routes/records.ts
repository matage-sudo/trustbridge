import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const recordsRouter = Router();

const READ_ROLES = ['PATIENT', 'STAFF', 'HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR'];
const WRITE_ROLES = ['STAFF', 'HOSPITAL_ADMIN'];

async function resolveContext(req: any, res: any) {
  const { tenantId, userId } = currentTenant();
  const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!membership) { res.status(403).json({ error: 'membership_not_found' }); return null; }
  if (!READ_ROLES.includes(membership.role as string)) { res.status(403).json({ error: 'read_forbidden' }); return null; }

  let patientId: string | null = null;
  if (membership.role === 'PATIENT') {
    patientId = (membership as any).patientId || null;
    if (!patientId) { res.status(403).json({ error: 'no_patient_linked' }); return null; }
  } else {
    patientId = (req.query.patientId as string) || (req.body?.patientId as string) || null;
    if (!patientId) { res.status(400).json({ error: 'patientId_required' }); return null; }
  }
  return { tenantId, userId, membership, patientId };
}

// ---- LABS ----
recordsRouter.get('/labs', async (req, res, next) => {
  try {
    const ctx = await resolveContext(req, res); if (!ctx) return;
    const items = await prisma.labResult.findMany({ where: { tenantId: ctx.tenantId, patientId: ctx.patientId }, orderBy: { orderedAt: 'desc' }, take: 100 });
    res.json({ items });
  } catch (err) { next(err); }
});
recordsRouter.post('/labs', async (req, res, next) => {
  try {
    const ctx = await resolveContext(req, res); if (!ctx) return;
    if (!WRITE_ROLES.includes(ctx.membership.role as string)) { res.status(403).json({ error: 'write_forbidden' }); return; }
    const { testName, resultValue, referenceRange, status, notes, completedAt } = req.body;
    if (!testName) { res.status(400).json({ error: 'testName_required' }); return; }
    const item = await prisma.labResult.create({ data: { tenantId: ctx.tenantId, patientId: ctx.patientId, testName, resultValue, referenceRange, notes, status: status || 'PENDING', completedAt: completedAt ? new Date(completedAt) : null } });
    await writeAudit({ action: 'lab_result.create', resourceType: 'lab_result', resourceId: item.id, payload: { patientId: ctx.patientId } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// ---- PRESCRIPTIONS ----
recordsRouter.get('/prescriptions', async (req, res, next) => {
  try {
    const ctx = await resolveContext(req, res); if (!ctx) return;
    const items = await prisma.prescription.findMany({ where: { tenantId: ctx.tenantId, patientId: ctx.patientId }, orderBy: { prescribedAt: 'desc' }, take: 100 });
    res.json({ items });
  } catch (err) { next(err); }
});
recordsRouter.post('/prescriptions', async (req, res, next) => {
  try {
    const ctx = await resolveContext(req, res); if (!ctx) return;
    if (!WRITE_ROLES.includes(ctx.membership.role as string)) { res.status(403).json({ error: 'write_forbidden' }); return; }
    const { medication, dosage, frequency, duration, instructions, status, prescribedBy } = req.body;
    if (!medication || !dosage || !frequency) { res.status(400).json({ error: 'missing_required_fields' }); return; }
    const item = await prisma.prescription.create({ data: { tenantId: ctx.tenantId, patientId: ctx.patientId, medication, dosage, frequency, duration, instructions, status: status || 'ACTIVE', prescribedBy } });
    await writeAudit({ action: 'prescription.create', resourceType: 'prescription', resourceId: item.id, payload: { patientId: ctx.patientId } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// ---- DIAGNOSES ----
recordsRouter.get('/diagnoses', async (req, res, next) => {
  try {
    const ctx = await resolveContext(req, res); if (!ctx) return;
    const items = await prisma.diagnosis.findMany({ where: { tenantId: ctx.tenantId, patientId: ctx.patientId }, orderBy: { diagnosedAt: 'desc' }, take: 100 });
    res.json({ items });
  } catch (err) { next(err); }
});
recordsRouter.post('/diagnoses', async (req, res, next) => {
  try {
    const ctx = await resolveContext(req, res); if (!ctx) return;
    if (!WRITE_ROLES.includes(ctx.membership.role as string)) { res.status(403).json({ error: 'write_forbidden' }); return; }
    const { condition, code, severity, status, diagnosedBy, notes } = req.body;
    if (!condition) { res.status(400).json({ error: 'condition_required' }); return; }
    const item = await prisma.diagnosis.create({ data: { tenantId: ctx.tenantId, patientId: ctx.patientId, condition, code, severity, diagnosedBy, notes, status: status || 'ACTIVE' } });
    await writeAudit({ action: 'diagnosis.create', resourceType: 'diagnosis', resourceId: item.id, payload: { patientId: ctx.patientId } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// ---- VITALS ----
recordsRouter.get('/vitals', async (req, res, next) => {
  try {
    const ctx = await resolveContext(req, res); if (!ctx) return;
    const items = await prisma.vitals.findMany({ where: { tenantId: ctx.tenantId, patientId: ctx.patientId }, orderBy: { recordedAt: 'desc' }, take: 100 });
    res.json({ items });
  } catch (err) { next(err); }
});
recordsRouter.post('/vitals', async (req, res, next) => {
  try {
    const ctx = await resolveContext(req, res); if (!ctx) return;
    if (!WRITE_ROLES.includes(ctx.membership.role as string)) { res.status(403).json({ error: 'write_forbidden' }); return; }
    const { bloodPressure, heartRate, temperature, weight, height, oxygenSat, recordedBy } = req.body;
    const item = await prisma.vitals.create({ data: { tenantId: ctx.tenantId, patientId: ctx.patientId, bloodPressure, heartRate: heartRate ? Number(heartRate) : null, temperature: temperature ? Number(temperature) : null, weight: weight ? Number(weight) : null, height: height ? Number(height) : null, oxygenSat: oxygenSat ? Number(oxygenSat) : null, recordedBy } });
    await writeAudit({ action: 'vitals.create', resourceType: 'vitals', resourceId: item.id, payload: { patientId: ctx.patientId } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});