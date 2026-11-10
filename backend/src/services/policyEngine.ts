import { prisma } from '../models/prisma';

export type PolicyDecision =
  | { decision: 'ALLOW'; reason: string; grantId: string }
  | { decision: 'DENY'; reason: string }
  | { decision: 'NEEDS_APPROVAL'; reason: string; requestId?: string };

/**
 * Evaluates whether a staff member may access a specific patient record.
 *
 * Rules (v1):
 * 1. HOSPITAL_ADMIN / PRIVACY_OFFICER / SECURITY_INVESTIGATOR roles are
 *    broadly allowed (still logged).
 * 2. STAFF (clinicians) require an active AccessGrant for this patient,
 *    OR must submit an AccessRequest first.
 * 3. Grants that are expired or revoked are treated as non-existent.
 */
export async function evaluatePatientAccess(
  tenantId: string,
  membershipId: string,
  patientId: string
): Promise<PolicyDecision> {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId, active: true },
  });
  if (!membership) {
    return { decision: 'DENY', reason: 'membership_inactive_or_not_in_tenant' };
  }

  // Admin-tier roles bypass per-patient grants (but are still audited)
  const broadRoles = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR'];
  if (broadRoles.includes(membership.role)) {
    return { decision: 'ALLOW', reason: `broad_role:${membership.role}`, grantId: 'broad_role' };
  }

  // Clinicians need a grant
  const grant = await prisma.accessGrant.findFirst({
    where: {
      tenantId,
      granteeId: membershipId,
      patientId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (grant) {
    return { decision: 'ALLOW', reason: 'active_grant', grantId: grant.id };
  }

  // Check if there's a pending request already
  const pending = await prisma.accessRequest.findFirst({
    where: {
      tenantId,
      requesterId: membershipId,
      patientId,
      status: 'PENDING',
    },
  });
  if (pending) {
    return {
      decision: 'NEEDS_APPROVAL',
      reason: 'pending_request_exists',
      requestId: pending.id,
    };
  }

  return { decision: 'NEEDS_APPROVAL', reason: 'no_grant_or_request' };
}