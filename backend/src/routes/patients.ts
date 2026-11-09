import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';
import { evaluatePatientAccess } from '../services/policyEngine';

export const patientsRouter = Router();

// GET /v1/patients - list all patients for the current tenant
patientsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const search = req.query.search as string | undefined;

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { hospitalNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ items: patients });
  } catch (err) {
    next(err);
  }
});

// GET /v1/patients/:id - detailed view, requires access grant (or broad role)
patientsRouter.get('/:id', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;

    const membership = await prisma.membership.findFirst({
      where: { tenantId, userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'membership_not_found' });
      return;
    }

    const decision = await evaluatePatientAccess(tenantId, membership.id, id);

    if (decision.decision !== 'ALLOW') {
      await writeAudit({
        action: 'patient.access_denied',
        resourceType: 'patient',
        resourceId: id,
        outcome: 'deny',
        reasonCode: decision.reason,
      });
      res.status(403).json({
        error: 'access_denied',
        reason: decision.reason,
        decision: decision.decision,
      });
      return;
    }

    const patient = await prisma.patient.findFirst({ where: { id, tenantId } });
    if (!patient) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    await writeAudit({
      action: 'patient.viewed',
      resourceType: 'patient',
      resourceId: id,
      payload: { decisionReason: decision.reason, grantId: decision.grantId },
    });

    res.json(patient);
  } catch (err) {
    next(err);
  }
});

// POST /v1/patients - create a new patient
patientsRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { firstName, lastName, dateOfBirth, hospitalNumber } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !hospitalNumber) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }

    const patient = await prisma.patient.create({
      data: {
        tenantId,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        hospitalNumber,
      },
    });

    await writeAudit({
      action: 'patient.create',
      resourceType: 'patient',
      resourceId: patient.id,
      payload: { hospitalNumber },
    });

    res.status(201).json(patient);
  } catch (err) {
    next(err);
  }
});