import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';
import { SCOPES, AUTHORITY_TYPES, ADMIN_ROLES, UUID_RE, callerMembership, activeWindow } from '../services/representation';

export const meRepresentativesRouter = Router();
export const adminRepresentativesRouter = Router();

const TWO_PERSON_RULE = process.env.REPRESENTATIVE_TWO_PERSON_RULE === 'true';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseGrant(body: any): { error?: string; authorityType?: string; scope?: string[]; validUntil?: Date | null } {
  const authorityType = String(body?.authorityType ?? '');
  if (!(AUTHORITY_TYPES as readonly string[]).includes(authorityType)) return { error: 'invalid_authority_type' };

  const scope: string[] = Array.isArray(body?.scope) ? Array.from(new Set<string>(body.scope.map(String))) : [];
  if (scope.length === 0 || !scope.every((s) => (SCOPES as readonly string[]).includes(s))) {
    return { error: 'invalid_scope' };
  }

  let validUntil: Date | null = null;
  if (body?.validUntil) {
    const d = new Date(body.validUntil);
    if (isNaN(d.getTime()) || d <= new Date()) return { error: 'invalid_valid_until' };
    validUntil = d;
  }
  return { authorityType, scope, validUntil };
}

// Parent/guardian authority over a minor ends on their 18th birthday unless a date was given
function minorExpiry(authorityType: string, dob: Date | null, provided: Date | null): Date | null {
  if (provided || !dob || !['PARENT', 'LEGAL_GUARDIAN'].includes(authorityType)) return provided;
  const eighteen = new Date(dob);
  eighteen.setUTCFullYear(eighteen.getUTCFullYear() + 18);
  return eighteen > new Date() ? eighteen : provided;
}

async function namesFor(tenantId: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, { displayName: string | null; email: string | null }>();
  const ms = await prisma.membership.findMany({
    where: { tenantId, id: { in: ids } },
    include: { user: { select: { displayName: true, email: true } } },
  });
  return new Map(ms.map((m) => [m.id, { displayName: m.user?.displayName ?? null, email: m.user?.email ?? null }]));
}

async function createRepresentation(o: {
  tenantId: string;
  patientId: string;
  repMembership: { id: string; patientId: string | null };
  grant: { authorityType?: string; scope?: string[]; validUntil?: Date | null };
  initiatedBy: 'PATIENT' | 'ADMIN';
  requestedBy: string;
  approvedBy?: string;
  evidenceNote?: string | null;
}): Promise<{ code: number; body: any }> {
  if (o.repMembership.patientId === o.patientId) return { code: 400, body: { error: 'cannot_represent_self' } };

  const patient = await prisma.patient.findFirst({ where: { id: o.patientId, tenantId: o.tenantId } });
  if (!patient) return { code: 404, body: { error: 'patient_not_found' } };

  const dup = await prisma.representative.findFirst({
    where: {
      tenantId: o.tenantId,
      patientId: o.patientId,
      representativeMembershipId: o.repMembership.id,
      verificationStatus: { in: ['PENDING', 'VERIFIED'] },
    },
  });
  if (dup) return { code: 409, body: { error: 'representation_already_exists' } };

  const verified = o.approvedBy !== undefined;
  const rep = await prisma.representative.create({
    data: {
      tenantId: o.tenantId,
      patientId: o.patientId,
      representativeMembershipId: o.repMembership.id,
      authorityType: o.grant.authorityType!,
      scope: o.grant.scope!,
      validUntil: minorExpiry(o.grant.authorityType!, patient.dateOfBirth, o.grant.validUntil ?? null),
      verificationStatus: verified ? 'VERIFIED' : 'PENDING',
      initiatedBy: o.initiatedBy,
      requestedByMembershipId: o.requestedBy,
      approvedByMembershipId: verified ? o.approvedBy : null,
      approvedAt: verified ? new Date() : null,
      evidenceNote: o.evidenceNote ?? null,
    },
  });

  await writeAudit({
    action: verified ? 'representative.created_verified' : 'representative.requested',
    resourceType: 'representative',
    resourceId: rep.id,
    payload: { patientId: o.patientId, authorityType: rep.authorityType, scope: rep.scope },
  });
  return { code: 201, body: rep };
}

// ---------------------------------------------------------------- patient side

// GET /v1/me/representatives/acting-for : patients the caller may act for right now
meRepresentativesRouter.get('/acting-for', async (_req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me) { res.status(403).json({ error: 'no_membership' }); return; }

    const reps = await prisma.representative.findMany({
      where: { tenantId, representativeMembershipId: me.id, ...activeWindow() },
      orderBy: { createdAt: 'desc' },
    });
    const patients = await prisma.patient.findMany({
      where: { tenantId, id: { in: reps.map((r) => r.patientId) } },
      select: { id: true, firstName: true, lastName: true, hospitalNumber: true },
    });
    const byId = new Map(patients.map((p) => [p.id, p]));
    res.json({
      items: reps.map((r) => ({
        id: r.id,
        patient: byId.get(r.patientId) ?? null,
        authorityType: r.authorityType,
        scope: r.scope,
        validUntil: r.validUntil,
      })),
    });
  } catch (err) { next(err); }
});

// GET /v1/me/representatives : who can act for me
meRepresentativesRouter.get('/', async (_req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me?.patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }

    const reps = await prisma.representative.findMany({
      where: { tenantId, patientId: me.patientId },
      orderBy: { createdAt: 'desc' },
    });
    const names = await namesFor(tenantId, reps.map((r) => r.representativeMembershipId));
    res.json({
      items: reps.map((r) => ({ ...r, representative: names.get(r.representativeMembershipId) ?? null })),
    });
  } catch (err) { next(err); }
});

// POST /v1/me/representatives : ask for someone to be able to act for me (PENDING until an admin verifies)
meRepresentativesRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me?.patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }

    const grant = parseGrant(req.body);
    if (grant.error) { res.status(400).json({ error: grant.error }); return; }

    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'invalid_email' }); return; }

    const repMembership = await prisma.membership.findFirst({
      where: { tenantId, user: { email: { equals: email, mode: 'insensitive' } } },
    });
    if (!repMembership) { res.status(404).json({ error: 'representative_not_found' }); return; }

    const r = await createRepresentation({
      tenantId,
      patientId: me.patientId,
      repMembership,
      grant,
      initiatedBy: 'PATIENT',
      requestedBy: me.id,
      evidenceNote: req.body?.evidenceNote ? String(req.body.evidenceNote).slice(0, 500) : null,
    });
    res.status(r.code).json(r.body);
  } catch (err) { next(err); }
});

// POST /v1/me/representatives/:id/revoke : the patient withdraws a grant
meRepresentativesRouter.post('/:id/revoke', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me?.patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }
    if (!UUID_RE.test(req.params.id)) { res.status(400).json({ error: 'invalid_id' }); return; }

    const rep = await prisma.representative.findFirst({
      where: { id: req.params.id, tenantId, patientId: me.patientId },
    });
    if (!rep) { res.status(404).json({ error: 'not_found' }); return; }
    if (!['PENDING', 'VERIFIED'].includes(rep.verificationStatus)) {
      res.status(409).json({ error: 'not_revocable' });
      return;
    }

    const updated = await prisma.representative.update({
      where: { id: rep.id },
      data: { verificationStatus: 'REVOKED', revokedAt: new Date() },
    });
    await writeAudit({
      action: 'representative.revoked',
      resourceType: 'representative',
      resourceId: rep.id,
      payload: { by: 'PATIENT', patientId: rep.patientId },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// ----------------------------------------------------------------- admin side

async function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const me = await callerMembership();
    if (!me || !ADMIN_ROLES.includes(me.role as unknown as string)) {
      await writeAudit({ action: 'representative.admin_action', outcome: 'deny', reasonCode: 'not_admin' });
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    res.locals.me = me;
    next();
  } catch (err) { next(err); }
}
adminRepresentativesRouter.use(requireAdmin);

// GET /v1/admin/representatives?status=PENDING
adminRepresentativesRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status && !['PENDING', 'VERIFIED', 'REJECTED', 'REVOKED'].includes(status)) {
      res.status(400).json({ error: 'invalid_status' });
      return;
    }
    const reps = await prisma.representative.findMany({
      where: { tenantId, ...(status ? { verificationStatus: status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const names = await namesFor(tenantId, reps.map((r) => r.representativeMembershipId));
    const patients = await prisma.patient.findMany({
      where: { tenantId, id: { in: reps.map((r) => r.patientId) } },
      select: { id: true, firstName: true, lastName: true, hospitalNumber: true },
    });
    const byId = new Map(patients.map((p) => [p.id, p]));
    res.json({
      items: reps.map((r) => ({
        ...r,
        representative: names.get(r.representativeMembershipId) ?? null,
        patient: byId.get(r.patientId) ?? null,
      })),
    });
  } catch (err) { next(err); }
});

// POST /v1/admin/representatives : admin creates AND verifies (e.g. a parent for a child), evidence note required
adminRepresentativesRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const admin = res.locals.me;

    const patientId = String(req.body?.patientId ?? '');
    if (!UUID_RE.test(patientId)) { res.status(400).json({ error: 'invalid_patient_id' }); return; }
    const grant = parseGrant(req.body);
    if (grant.error) { res.status(400).json({ error: grant.error }); return; }
    const evidenceNote = String(req.body?.evidenceNote ?? '').trim();
    if (evidenceNote.length < 5) { res.status(400).json({ error: 'evidence_note_required' }); return; }
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'invalid_email' }); return; }

    const repMembership = await prisma.membership.findFirst({
      where: { tenantId, user: { email: { equals: email, mode: 'insensitive' } } },
    });
    if (!repMembership) { res.status(404).json({ error: 'representative_not_found' }); return; }
    if (repMembership.id === admin.id) { res.status(403).json({ error: 'cannot_self_approve' }); return; }

    const r = await createRepresentation({
      tenantId,
      patientId,
      repMembership,
      grant,
      initiatedBy: 'ADMIN',
      requestedBy: admin.id,
      approvedBy: admin.id,
      evidenceNote: evidenceNote.slice(0, 500),
    });
    res.status(r.code).json(r.body);
  } catch (err) { next(err); }
});

async function pending(req: Request, res: Response) {
  const { tenantId } = currentTenant();
  if (!UUID_RE.test(req.params.id)) { res.status(400).json({ error: 'invalid_id' }); return null; }
  const rep = await prisma.representative.findFirst({ where: { id: req.params.id, tenantId } });
  if (!rep) { res.status(404).json({ error: 'not_found' }); return null; }
  return rep;
}

// POST /v1/admin/representatives/:id/verify
adminRepresentativesRouter.post('/:id/verify', async (req, res, next) => {
  try {
    const admin = res.locals.me;
    const rep = await pending(req, res);
    if (!rep) return;
    if (rep.verificationStatus !== 'PENDING') { res.status(409).json({ error: 'not_pending' }); return; }
    if (rep.representativeMembershipId === admin.id) { res.status(403).json({ error: 'cannot_self_approve' }); return; }
    if (TWO_PERSON_RULE && rep.requestedByMembershipId === admin.id) {
      res.status(403).json({ error: 'two_person_rule' });
      return;
    }
    const updated = await prisma.representative.update({
      where: { id: rep.id },
      data: {
        verificationStatus: 'VERIFIED',
        approvedByMembershipId: admin.id,
        approvedAt: new Date(),
        evidenceNote: req.body?.evidenceNote ? String(req.body.evidenceNote).slice(0, 500) : rep.evidenceNote,
      },
    });
    await writeAudit({
      action: 'representative.verified',
      resourceType: 'representative',
      resourceId: rep.id,
      payload: { patientId: rep.patientId, authorityType: rep.authorityType, scope: rep.scope },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /v1/admin/representatives/:id/reject  { reason }
adminRepresentativesRouter.post('/:id/reject', async (req, res, next) => {
  try {
    const admin = res.locals.me;
    const reason = String(req.body?.reason ?? '').trim();
    if (reason.length < 3) { res.status(400).json({ error: 'reason_required' }); return; }
    const rep = await pending(req, res);
    if (!rep) return;
    if (rep.verificationStatus !== 'PENDING') { res.status(409).json({ error: 'not_pending' }); return; }
    const updated = await prisma.representative.update({
      where: { id: rep.id },
      data: { verificationStatus: 'REJECTED', rejectionReason: reason.slice(0, 500), approvedByMembershipId: admin.id, approvedAt: new Date() },
    });
    await writeAudit({
      action: 'representative.rejected',
      resourceType: 'representative',
      resourceId: rep.id,
      payload: { patientId: rep.patientId },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /v1/admin/representatives/:id/revoke
adminRepresentativesRouter.post('/:id/revoke', async (req, res, next) => {
  try {
    const rep = await pending(req, res);
    if (!rep) return;
    if (!['PENDING', 'VERIFIED'].includes(rep.verificationStatus)) { res.status(409).json({ error: 'not_revocable' }); return; }
    const updated = await prisma.representative.update({
      where: { id: rep.id },
      data: { verificationStatus: 'REVOKED', revokedAt: new Date() },
    });
    await writeAudit({
      action: 'representative.revoked',
      resourceType: 'representative',
      resourceId: rep.id,
      payload: { by: 'ADMIN', patientId: rep.patientId },
    });
    res.json(updated);
  } catch (err) { next(err); }
});