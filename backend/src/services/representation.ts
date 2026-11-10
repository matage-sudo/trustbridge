import type { Request } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from './audit';

export const SCOPES = ['VIEW_PROFILE', 'EDIT_PROFILE', 'VIEW_DOCUMENTS', 'UPLOAD_DOCUMENTS'] as const;
export type Scope = (typeof SCOPES)[number];
export const AUTHORITY_TYPES = ['PARENT', 'LEGAL_GUARDIAN', 'NEXT_OF_KIN', 'POWER_OF_ATTORNEY'] as const;
export const ADMIN_ROLES = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'];
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function callerMembership() {
  const { tenantId, userId } = currentTenant();
  const m = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!m || (m as any).active === false) return null;
  return m;
}

// A representation only counts while it is VERIFIED and inside its validity window
export function activeWindow(now: Date = new Date()) {
  return {
    verificationStatus: 'VERIFIED',
    validFrom: { lte: now },
    OR: [{ validUntil: null }, { validUntil: { gt: now } }],
  };
}

export type Resolved =
  | { ok: true; patientId: string; actingAs: 'SELF' | 'REPRESENTATIVE'; representationId?: string }
  | { ok: false; status: number; error: string };

/**
 * Decide which patient a /me/... request is about.
 * - no x-acting-for header: the caller's own linked patient
 * - x-acting-for: only if a VERIFIED, in-window grant held by the caller's membership has the scope
 */
export async function resolvePatient(req: Request, scope: Scope): Promise<Resolved> {
  const { tenantId } = currentTenant();
  const me = await callerMembership();
  if (!me) return { ok: false, status: 403, error: 'no_membership' };

  const raw = req.header('x-acting-for');
  if (!raw) {
    if (!me.patientId) return { ok: false, status: 403, error: 'no_patient_linked' };
    return { ok: true, patientId: me.patientId, actingAs: 'SELF' };
  }

  if (!UUID_RE.test(raw)) return { ok: false, status: 400, error: 'invalid_acting_for' };
  if (raw === me.patientId) return { ok: true, patientId: raw, actingAs: 'SELF' };

  const rep = await prisma.representative.findFirst({
    where: {
      tenantId,
      patientId: raw,
      representativeMembershipId: me.id,
      scope: { has: scope },
      ...activeWindow(),
    },
  });

  if (!rep) {
    await writeAudit({
      action: 'representative.access_denied',
      resourceType: 'patient',
      resourceId: raw,
      outcome: 'deny',
      reasonCode: 'no_valid_representation',
      payload: { scope },
    });
    // Same answer whether the patient exists or not
    return { ok: false, status: 403, error: 'not_authorised_for_patient' };
  }

  await writeAudit({
    action: 'representative.acted',
    resourceType: 'patient',
    resourceId: raw,
    payload: { representationId: rep.id, authorityType: rep.authorityType, scope },
  });
  return { ok: true, patientId: raw, actingAs: 'REPRESENTATIVE', representationId: rep.id };
}