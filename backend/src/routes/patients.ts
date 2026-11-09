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

// GET /v1/patients/:id/access-history - Patient's view of who touched their data
patientsRouter.get('/:id/access-history', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;

    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership) {
      res.status(403).json({ error: 'membership_not_found' });
      return;
    }

    const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR'];
    const isBroad = broadRoles.includes(membership.role);
    const isOwnPatient = membership.role === 'PATIENT' && membership.patientId === id;

    if (!isBroad && !isOwnPatient) {
      res.status(403).json({ error: 'not_authorised_to_view_history' });
      return;
    }

    const events = await prisma.auditEvent.findMany({
      where: {
        tenantId,
        OR: [
          { resourceType: 'patient', resourceId: id },
          { payload: { path: ['patientId'], equals: id } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const actorIds = Array.from(new Set(events.map((e) => e.actorUserId).filter(Boolean)));
    const actors = actorIds.length
      ? await prisma.userIdentity.findMany({
          where: { id: { in: actorIds as string[] } },
          select: { id: true, email: true, displayName: true },
        })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const memberRoles = actorIds.length
      ? await prisma.membership.findMany({
          where: { tenantId, userId: { in: actorIds as string[] } },
          select: {
            userId: true,
            role: true,
            department: { select: { name: true } },
          },
        })
      : [];
    const roleMap = new Map(memberRoles.map((m) => [m.userId, m]));

    const enriched = events.map((e) => {
      const actor = e.actorUserId ? actorMap.get(e.actorUserId) : null;
      const roleInfo = e.actorUserId ? roleMap.get(e.actorUserId) : null;
      return {
        id: e.id,
        action: e.action,
        outcome: e.outcome,
        resourceType: e.resourceType,
        reasonCode: e.reasonCode,
        createdAt: e.createdAt,
        payload: e.payload,
        actor: actor
          ? {
              displayName: actor.displayName || actor.email.split('@')[0],
              email: actor.email,
              role: roleInfo?.role ?? 'UNKNOWN',
              department: roleInfo?.department?.name ?? null,
            }
          : null,
      };
    });

    res.json({ items: enriched });
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