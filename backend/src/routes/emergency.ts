import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';
import { callerMembership } from '../services/representation';
import { notifyPatient } from '../services/notify';
import { UUID_RE } from '../services/representation';

export const emergencyRouter = Router();

const EMERGENCY_DURATION_MINUTES = 30;
const VALID_PURPOSES = ['LIFE_THREATENING', 'SERIOUS_HARM', 'UNCONSCIOUS_PATIENT', 'CRITICAL_CARE'];
const VALID_SCOPES = ['VIEW_PROFILE', 'VIEW_DOCUMENTS', 'VIEW_HISTORY'];

function error(res: Response, status: number, code: string, msg?: string) {
  res.status(status).json({ error: code, message: msg });
}

// POST /v1/emergency/access
emergencyRouter.post('/access', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const me = await callerMembership();
    if (!me) { error(res, 403, 'no_membership'); return; }

    const patientId = String(req.body?.patientId ?? '');
    if (!UUID_RE.test(patientId)) { error(res, 400, 'invalid_patient_id'); return; }

    const purpose = String(req.body?.purpose ?? '');
    if (!VALID_PURPOSES.includes(purpose)) { error(res, 400, 'invalid_purpose', `allowed: ${VALID_PURPOSES.join(',')}`); return; }

    const justification = String(req.body?.justification ?? '').trim();
    if (justification.length < 20) { error(res, 400, 'justification_too_short', 'minimum 20 characters'); return; }

    const scope = Array.isArray(req.body?.scope) ? req.body.scope.map(String) : [];
    if (scope.length === 0 || !scope.every((s: string) => VALID_SCOPES.includes(s))) {
      error(res, 400, 'invalid_scope', `allowed: ${VALID_SCOPES.join(',')}`); return;
    }

    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) { error(res, 404, 'patient_not_found'); return; }

    // Already have active emergency access for this patient?
    const existing = await prisma.emergencyAccess.findFirst({
      where: {
        tenantId, patientId, staffMemberId: userId,
        revokedAt: null,
        validUntil: { gt: new Date() },
      },
    });
    if (existing) { error(res, 409, 'already_active', 'active emergency grant exists; revoke it first'); return; }

    const validUntil = new Date(Date.now() + EMERGENCY_DURATION_MINUTES * 60 * 1000);
    const grant = await prisma.emergencyAccess.create({
      data: {
        tenantId, patientId, staffMemberId: userId,
        justification, purpose, scope, validUntil,
      },
    });

    // Immediate alert to all admins in this tenant
    await writeAudit({
      action: 'emergency_access.created',
      resourceType: 'patient', resourceId: patientId,
      payload: { grantId: grant.id, purpose, scope, expiresAt: validUntil.toISOString() },
    });

    // Notify patient immediately
    await notifyPatient({
      tenantId, patientId,
      type: 'access.granted',
      title: 'Emergency access used',
      message: 'A staff member used emergency break-glass access to your record. An audit trail has been created for review.',
      resourceType: 'emergency_access', resourceId: grant.id,
    });

    res.status(201).json({
      grant,
      warning: `Emergency access expires in ${EMERGENCY_DURATION_MINUTES} minutes. Every action is audited.`,
    });
  } catch (err) { next(err); }
});

// GET /v1/emergency/access?patientId=...
emergencyRouter.get('/access', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me) { error(res, 403, 'no_membership'); return; }

    const where: any = { tenantId, revokedAt: null, validUntil: { gt: new Date() } };
    if (typeof req.query.patientId === 'string' && UUID_RE.test(req.query.patientId)) {
      where.patientId = req.query.patientId;
    }
    // Non-admin can only see their own
    if (!['HOSPITAL_ADMIN','PRIVACY_OFFICER'].includes(me.role as string)) {
      where.staffMemberId = me.userId;
    }

    const grants = await prisma.emergencyAccess.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
    });
    res.json({ items: grants });
  } catch (err) { next(err); }
});

// POST /v1/emergency/access/:id/revoke
emergencyRouter.post('/access/:id/revoke', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const me = await callerMembership();
    if (!me) { error(res, 403, 'no_membership'); return; }
    if (!UUID_RE.test(req.params.id ?? '')) { error(res, 400, 'invalid_id'); return; }

    const grant = await prisma.emergencyAccess.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!grant) { error(res, 404, 'not_found'); return; }
    if (grant.revokedAt) { error(res, 409, 'already_revoked'); return; }

    // Caller can revoke if: they own the grant, or they're admin/privacy
    const isOwner = grant.staffMemberId === userId;
    const isAdmin = ['HOSPITAL_ADMIN','PRIVACY_OFFICER'].includes(me.role as string);
    if (!isOwner && !isAdmin) { error(res, 403, 'forbidden'); return; }

    const updated = await prisma.emergencyAccess.update({
      where: { id: grant.id },
      data: { revokedAt: new Date(), revokedBy: userId },
    });
    await writeAudit({
      action: 'emergency_access.revoked',
      resourceType: 'emergency_access', resourceId: grant.id,
      payload: { patientId: grant.patientId, revokedBy: isOwner ? 'SELF' : 'ADMIN' },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /v1/admin/emergency/access/:id/review
emergencyRouter.post('/admin/access/:id/review', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const me = await callerMembership();
    if (!me || !['HOSPITAL_ADMIN','PRIVACY_OFFICER'].includes(me.role as string)) {
      error(res, 403, 'forbidden'); return;
    }
    if (!UUID_RE.test(req.params.id ?? '')) { error(res, 400, 'invalid_id'); return; }

    const outcome = String(req.body?.outcome ?? '');
    if (!['JUSTIFIED', 'NEEDS_FOLLOW_UP', 'MISUSE_SUSPECTED'].includes(outcome)) {
      error(res, 400, 'invalid_outcome'); return;
    }

    const grant = await prisma.emergencyAccess.findFirst({
      where: { id: req.params.id, tenantId, reviewedAt: null },
    });
    if (!grant) { error(res, 404, 'not_found_or_already_reviewed'); return; }

    const updated = await prisma.emergencyAccess.update({
      where: { id: grant.id },
      data: { reviewedAt: new Date(), reviewedBy: userId, reviewOutcome: outcome },
    });
    await writeAudit({
      action: 'emergency_access.reviewed',
      resourceType: 'emergency_access', resourceId: grant.id,
      payload: { patientId: grant.patientId, outcome },
    });
    res.json(updated);
  } catch (err) { next(err); }
});