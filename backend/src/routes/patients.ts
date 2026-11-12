import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { requireRole } from '../middleware/requireRole';
import { writeAudit } from '../services/audit';
import { evaluatePatientAccess } from '../services/policyEngine';
import { pool } from '../db';
import { sendInviteEmail } from '../services/email';

export const patientsRouter = Router();

patientsRouter.get('/me/access-history', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership) { res.status(403).json({ error: 'membership_not_found' }); return; }
    const patientId = (membership as any).patientId;
    if (!patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }
    const events = await prisma.auditEvent.findMany({
      where: { tenantId, OR: [ { resourceType: 'patient', resourceId: patientId }, { payload: { path: ['patientId'], equals: patientId } } ] },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
    const actorIds = Array.from(new Set(events.map(e => e.actorUserId).filter(Boolean))) as string[];
    const actors = actorIds.length ? await prisma.userIdentity.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true, displayName: true } }) : [];
    const roles = actorIds.length ? await prisma.membership.findMany({ where: { tenantId, userId: { in: actorIds } }, select: { userId: true, role: true, department: { select: { name: true } } } }) : [];
    const actorMap = new Map(actors.map(a => [a.id, a]));
    const roleMap = new Map(roles.map(r => [r.userId, r]));
    res.json({ items: events.map(e => {
      const a = e.actorUserId ? actorMap.get(e.actorUserId) : null;
      const r = e.actorUserId ? roleMap.get(e.actorUserId) : null;
      return { id: e.id, action: e.action, outcome: e.outcome, createdAt: e.createdAt,
        actor: a ? { displayName: a.displayName || a.email.split('@')[0], email: a.email, role: r?.role ?? 'UNKNOWN', department: r?.department?.name ?? null } : null };
    })});
  } catch (err) { next(err); }
});

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
    const patients = await prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ items: patients });
  } catch (err) { next(err); }
});

patientsRouter.get('/:id', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;
    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership) { res.status(403).json({ error: 'membership_not_found' }); return; }
    const decision = await evaluatePatientAccess(tenantId, membership.id, id);
    if (decision.decision !== 'ALLOW') {
      await writeAudit({ action: 'patient.access_denied', resourceType: 'patient', resourceId: id, outcome: 'deny', reasonCode: decision.reason });
      res.status(403).json({ error: 'access_denied', reason: decision.reason, decision: decision.decision });
      return;
    }
    const patient = await prisma.patient.findFirst({ where: { id, tenantId } });
    if (!patient) { res.status(404).json({ error: 'not_found' }); return; }
    await writeAudit({ action: 'patient.viewed', resourceType: 'patient', resourceId: id, payload: { decisionReason: decision.reason, grantId: decision.grantId } });
    res.json(patient);
  } catch (err) { next(err); }
});

patientsRouter.get('/:id/access-history', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;
    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership) { res.status(403).json({ error: 'membership_not_found' }); return; }
    const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR'];
    const isBroad = broadRoles.includes(membership.role);
    const isOwnPatient = membership.role === 'PATIENT' && (membership as any).patientId === id;
    if (!isBroad && !isOwnPatient) { res.status(403).json({ error: 'not_authorised_to_view_history' }); return; }
    const events = await prisma.auditEvent.findMany({
      where: { tenantId, OR: [ { resourceType: 'patient', resourceId: id }, { payload: { path: ['patientId'], equals: id } } ] },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
    const actorIds = Array.from(new Set(events.map((e) => e.actorUserId).filter(Boolean)));
    const actors = actorIds.length ? await prisma.userIdentity.findMany({ where: { id: { in: actorIds as string[] } }, select: { id: true, email: true, displayName: true } }) : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));
    const memberRoles = actorIds.length ? await prisma.membership.findMany({ where: { tenantId, userId: { in: actorIds as string[] } }, select: { userId: true, role: true, department: { select: { name: true } } } }) : [];
    const roleMap = new Map(memberRoles.map((m) => [m.userId, m]));
    res.json({ items: events.map((e) => {
      const actor = e.actorUserId ? actorMap.get(e.actorUserId) : null;
      const roleInfo = e.actorUserId ? roleMap.get(e.actorUserId) : null;
      return {
        id: e.id, action: e.action, outcome: e.outcome, resourceType: e.resourceType, reasonCode: e.reasonCode, createdAt: e.createdAt, payload: e.payload,
        actor: actor ? { displayName: actor.displayName || actor.email.split('@')[0], email: actor.email, role: roleInfo?.role ?? 'UNKNOWN', department: roleInfo?.department?.name ?? null } : null,
      };
    })});
  } catch (err) { next(err); }
});

patientsRouter.post('/', requireRole('HOSPITAL_ADMIN'), async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { firstName, lastName, dateOfBirth, hospitalNumber, email } = req.body;
    if (!firstName || !lastName || !dateOfBirth || !hospitalNumber) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }
    const patient = await prisma.patient.create({
      data: { tenantId, firstName, lastName, dateOfBirth: new Date(dateOfBirth), hospitalNumber },
    });

    if (email) {
      try {
        await pool.query(`UPDATE patients SET email = $1, "updatedAt" = NOW() WHERE id = $2`, [String(email).trim().toLowerCase(), patient.id]);
      } catch (e: any) { req.log?.warn({ err: e?.message }, 'failed to persist patient email'); }
    }

    let authUserId: string | null = null;
    let emailSent = false;
    let inviteError: string | null = null;

    if (email) {
      try {
        const invite = await sendInviteEmail(String(email).trim().toLowerCase(), 'patient');
        authUserId = invite.userId;
        emailSent = invite.emailSent;
        if (authUserId) {
          await prisma.userIdentity.upsert({
            where: { id: authUserId },
            update: { email: String(email).trim().toLowerCase(), displayName: `${firstName} ${lastName}` },
            create: { id: authUserId, email: String(email).trim().toLowerCase(), displayName: `${firstName} ${lastName}` },
          });
          const existing = await prisma.membership.findFirst({ where: { tenantId, userId: authUserId } });
          if (!existing) {
            await prisma.membership.create({ data: { tenantId, userId: authUserId, role: 'PATIENT', patientId: patient.id } as any });
          } else if (!(existing as any).patientId) {
            await prisma.membership.update({ where: { id: existing.id }, data: { patientId: patient.id } as any });
          }
        }
      } catch (e: any) {
        inviteError = e?.message ?? 'invite_failed';
        req.log?.error({ err: inviteError, email }, 'patient invite failed');
      }
    }

    await writeAudit({ action: 'patient.create', resourceType: 'patient', resourceId: patient.id, payload: { hospitalNumber, invited: !!email, emailSent, authUserId } });

    res.status(201).json({ ...patient, authUserId, emailSent, inviteError });
  } catch (err) { next(err); }
});