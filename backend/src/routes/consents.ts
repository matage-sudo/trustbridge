import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { requireRole } from '../middleware/requireRole';
import { callerMembership } from '../services/representation';
import { writeAudit } from '../services/audit';

export const consentsRouter = Router();

const MANAGER_ROLES = ['HOSPITAL_ADMIN', 'SUPER_ADMIN', 'PRIVACY_OFFICER'];
const manage = requireRole(...MANAGER_ROLES);
const STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseDate(v: unknown): Date | null | 'invalid' {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? 'invalid' : d;
}

// A patient sees only their own consents.
consentsRouter.get('/mine', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me || !me.patientId) { res.status(403).json({ error: 'no_patient_linked' }); return; }
    const items = await prisma.consent.findMany({
      where: { tenantId, patientId: me.patientId },
      orderBy: { grantedAt: 'desc' },
      take: 100,
      select: { id: true, purpose: true, noticeVersion: true, status: true, grantedAt: true, expiresAt: true, revokedAt: true },
    });
    res.json({ items });
  } catch (err) { next(err); }
});

// Oversight roles see all consents in the hospital.
consentsRouter.get('/', manage, async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const status = req.query.status ? String(req.query.status) : undefined;
    if (status && !STATUSES.includes(status)) { res.status(400).json({ error: 'invalid_status' }); return; }

    const consents = await prisma.consent.findMany({
      where: { tenantId, ...(status ? { status: status as any } : {}) },
      include: { patient: { select: { id: true, firstName: true, lastName: true, hospitalNumber: true } } },
      orderBy: { grantedAt: 'desc' },
      take: 100,
    });
    res.json({ items: consents });
  } catch (err) { next(err); }
});

// Record a consent (oversight roles only).
consentsRouter.post('/', manage, async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const patientId = String(req.body?.patientId ?? '');
    const purpose = String(req.body?.purpose ?? '').trim();
    const noticeVersion = String(req.body?.noticeVersion ?? '').trim();
    const language = req.body?.language ? String(req.body.language).slice(0, 10) : 'en';
    const effectiveFrom = parseDate(req.body?.effectiveFrom);
    const expiresAt = parseDate(req.body?.expiresAt);

    if (!UUID_RE.test(patientId) || !purpose || purpose.length > 500 || !noticeVersion || noticeVersion.length > 50) {
      res.status(400).json({ error: 'missing_or_invalid_fields' });
      return;
    }
    if (effectiveFrom === 'invalid' || expiresAt === 'invalid') { res.status(400).json({ error: 'invalid_date' }); return; }

    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId }, select: { id: true } });
    if (!patient) { res.status(404).json({ error: 'patient_not_found_in_tenant' }); return; }

    const membership = await prisma.membership.findFirst({ where: { tenantId, userId }, select: { id: true } });

    const consent = await prisma.consent.create({
      data: {
        tenantId, patientId, purpose, noticeVersion, language,
        effectiveFrom: effectiveFrom ?? new Date(),
        expiresAt: expiresAt ?? null,
        capturedBy: membership?.id ?? null,
      },
    });

    await writeAudit({ action: 'consent.grant', resourceType: 'consent', resourceId: consent.id, payload: { patientId, purpose, noticeVersion } });
    res.status(201).json(consent);
  } catch (err) { next(err); }
});

// Revoke: an oversight role, or the patient who owns the consent.
consentsRouter.post('/:id/revoke', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const id = String(req.params.id ?? '');
    if (!UUID_RE.test(id)) { res.status(400).json({ error: 'invalid_id' }); return; }

    const me = await callerMembership();
    if (!me) { res.status(403).json({ error: 'no_membership' }); return; }

    const existing = await prisma.consent.findFirst({ where: { id, tenantId } });
    const isManager = MANAGER_ROLES.includes(String(me.role));
    const isOwner = me.role === 'PATIENT' && !!me.patientId && existing?.patientId === me.patientId;
    if (!existing || (!isManager && !isOwner)) { res.status(404).json({ error: 'consent_not_found' }); return; }
    if (existing.status !== 'ACTIVE') { res.status(400).json({ error: 'consent_not_active' }); return; }

    const reason = req.body?.reason ? String(req.body.reason).slice(0, 500) : null;
    const updated = await prisma.consent.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date(), revocationReason: reason },
    });

    await writeAudit({ action: 'consent.revoke', resourceType: 'consent', resourceId: id, payload: { reason, revokedBy: isOwner ? 'patient' : 'staff' } });
    res.json(updated);
  } catch (err) { next(err); }
});