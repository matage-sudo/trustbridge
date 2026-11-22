import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { requireRole } from '../middleware/requireRole';
import { writeAudit } from '../services/audit';
import { evaluatePatientAccess } from '../services/policyEngine';
import { pool } from '../db';
import { sendInviteEmail } from '../services/email';

export const patientsRouter = Router();

patientsRouter.get('/me/notes', requireRole('PATIENT'), async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership) { res.status(403).json({ error: 'membership_not_found' }); return; }
    const patientId = (membership as any).patientId;
    if (!patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }

    const items = await prisma.patientNote.findMany({
      where: { tenantId, patientId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ items });
  } catch (err) { next(err); }
});
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

patientsRouter.get('/', requireRole('STAFF', 'HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR', 'SUPER_ADMIN'), async (req, res, next) => { // hardening:patients-list
  try {
    const { tenantId } = currentTenant();
    const search = req.query.search as string | undefined;
    const where: any = { tenantId };
    // SECURITY: staff/nurses only see patients assigned to them
    const ctx = currentTenant();
    if (ctx.role === 'STAFF') { // hardening:patients-nurse
      const myMembership = await prisma.membership.findFirst({ where: { tenantId, userId: ctx.userId } });
      if (!myMembership) { res.json({ items: [] }); return; }
      where.primaryDoctorId = myMembership.id;
    }
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
      include: {
        primaryDoctor: {
          include: { user: { select: { displayName: true, email: true } } }
        }
      }
    });
    res.json({ items: patients });
  } catch (err) { next(err); }
});

patientsRouter.get('/search', requireRole('STAFF', 'HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR', 'SUPER_ADMIN'), async (req, res, next) => { // hardening:patients-search
  try {
    const { tenantId, userId, role } = currentTenant();
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    if (q.length < 2) { res.json({ items: [] }); return; }
    const where: any = { tenantId, OR: [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { hospitalNumber: { contains: q, mode: 'insensitive' } },
    ] };
    if (role === 'STAFF') {
      const me = await prisma.membership.findFirst({ where: { tenantId, userId }, select: { id: true } });
      if (!me) { res.json({ items: [] }); return; }
      where.primaryDoctorId = me.id;
    }
    const items = await prisma.patient.findMany({ where, take: 10, select: { id: true, firstName: true, lastName: true, hospitalNumber: true } });
    res.json({ items });
  } catch (err) { next(err); }
});

patientsRouter.post('/:id/notes', requireRole('STAFF', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;
    const { type, title, content } = req.body;
    const myMembership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!myMembership) { res.status(403).json({ error: 'membership_not_found' }); return; }

    const note = await prisma.patientNote.create({
      data: { tenantId, patientId: id, doctorId: myMembership.id, type, title, content }
    });

    await writeAudit({ action: 'patient.add_note', resourceType: 'patient', resourceId: id, payload: { noteId: note.id, type } });
    res.status(201).json(note);
  } catch (err) { next(err); }
});

patientsRouter.get('/:id', requireRole('STAFF', 'HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR', 'SUPER_ADMIN'), async (req, res, next) => { // hardening:patients-get
  try {
    const { tenantId, userId } = currentTenant();
    const { id } = req.params;
    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership) { res.status(403).json({ error: 'membership_not_found' }); return; }

    // Check if STAFF is the primary doctor
    let isPrimaryDoctor = false;
    if (membership.role === 'STAFF') {
       const p = await prisma.patient.findFirst({ where: { id, tenantId, primaryDoctorId: membership.id } });
       if (p) isPrimaryDoctor = true;
    }

    const decision = await evaluatePatientAccess({ tenantId, membership, patientId: id, requiredScope: 'VIEW_PROFILE' });
    
    if (decision.decision !== 'ALLOW' && !isPrimaryDoctor) {
      await writeAudit({ action: 'patient.access_denied', resourceType: 'patient', resourceId: id, outcome: 'deny', reasonCode: decision.reason });
      res.status(403).json({ error: 'access_denied', reason: decision.reason, decision: decision.decision });
      return;
    }

    const patient = await prisma.patient.findFirst({ 
      where: { id, tenantId },
      include: {
        representatives: true,
        primaryDoctor: { include: { user: { select: { displayName: true, email: true } } } }
      }
    });
    if (!patient) { res.status(404).json({ error: 'not_found' }); return; }

    // Manually fetch the representative's user details
    const repIds = patient.representatives.map(r => r.representativeMembershipId);
    const repMemberships = await prisma.membership.findMany({
      where: { id: { in: repIds } },
      include: { user: { select: { displayName: true, email: true } } }
    });
    const repMap = new Map(repMemberships.map(m => [m.id, m]));

    const enrichedRepresentatives = patient.representatives.map(r => ({
      ...r,
      representativeMembership: repMap.get(r.representativeMembershipId) || null
    }));
    
    // Fetch recent medical notes/medications
    const notes = await prisma.patientNote.findMany({ where: { patientId: id, tenantId }, orderBy: { createdAt: 'desc' }, take: 20 });
    
    await writeAudit({ action: 'patient.viewed', resourceType: 'patient', resourceId: id, payload: { decisionReason: decision.reason } });
    res.json({ ...patient, representatives: enrichedRepresentatives, medicalNotes: notes });
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
    // FIX: Check if the email already exists as a staff member to prevent duplicate identities
    if (email) {
      const existingStaffIdentity = await prisma.userIdentity.findUnique({
        where: { email: String(email).trim().toLowerCase() },
        include: { memberships: { where: { tenantId } } }
      });
      
      if (existingStaffIdentity && existingStaffIdentity.memberships.length > 0) {
        const isStaff = existingStaffIdentity.memberships.some(m => m.role !== 'PATIENT');
        if (isStaff) {
          res.status(409).json({ error: 'This email belongs to a staff member. Please link accounts or use a different email.' });
          return;
        }
      }
    }

    // FIX: Check if the email already exists as a staff member to prevent duplicate identities
    if (email) {
      const existingStaffIdentity = await prisma.userIdentity.findUnique({
        where: { email: String(email).trim().toLowerCase() },
        include: { memberships: { where: { tenantId, active: true } } }
      });
      
      if (existingStaffIdentity && existingStaffIdentity.memberships.length > 0) {
        const isStaff = existingStaffIdentity.memberships.some(m => m.role !== 'PATIENT');
        if (isStaff) {
          res.status(409).json({ error: 'This email belongs to a staff member. Please link accounts or use a different email.' });
          return;
        }
      }
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
