import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';
import { sendInviteEmail, sendResetEmail } from '../services/email';

export const staffRouter = Router();

staffRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const search = req.query.search as string | undefined;
    const memberships = await prisma.membership.findMany({
      where: {
        tenantId,
        ...(search ? { user: { OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ] } } : {}),
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ items: memberships });
  } catch (err) { next(err); }
});

staffRouter.get('/departments', async (_req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const departments = await prisma.department.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
    res.json({ items: departments });
  } catch (err) { next(err); }
});

staffRouter.post('/create-account', async (req, res, next) => {
  try {
    const { tenantId, role: requesterRole } = currentTenant();
    const { email, displayName, role } = req.body;
    if (!email) { res.status(400).json({ error: 'email_required' }); return; }

    // SECURITY CHECK: Only SUPER_ADMIN can create another SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only a Super Admin can create another Super Admin.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    let authUserId: string | null = null;
    let emailSent = false;
    let inviteError: string | null = null;

    try {
      const invite = await sendInviteEmail(normalizedEmail, 'staff');
      authUserId = invite.userId;
      emailSent = invite.emailSent;
    } catch (e: any) { inviteError = e?.message ?? 'invite_failed'; }

    if (!authUserId) {
      res.status(400).json({ error: 'auth_invite_failed', detail: inviteError });
      return;
    }

    const identity = await prisma.userIdentity.upsert({
      where: { id: authUserId },
      update: { email: normalizedEmail, displayName: displayName || normalizedEmail.split('@')[0] },
      create: { id: authUserId, email: normalizedEmail, displayName: displayName || normalizedEmail.split('@')[0] },
    });

    const existing = await prisma.membership.findFirst({ where: { tenantId, userId: authUserId } });
    if (!existing) {
      await prisma.membership.create({ data: { tenantId, userId: authUserId, role: role || 'STAFF' } });
    }

    await writeAudit({ action: 'staff.create', resourceType: 'membership', resourceId: identity.id, payload: { email: normalizedEmail, role: role || 'STAFF', emailSent } });

    res.status(201).json({ success: true, userId: identity.id, emailSent, inviteError });
  } catch (err) { next(err); }
});

staffRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'email_required' }); return; }
    const result = await sendResetEmail(String(email).trim().toLowerCase());
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.', emailSent: result.emailSent });
  } catch (err) { next(err); }
});

staffRouter.patch('/:membershipId', async (req, res, next) => {
  try {
    const { tenantId, role: requesterRole } = currentTenant();
    const { membershipId } = req.params;
    const { role, departmentId, employmentStatus } = req.body;

    const existing = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!existing) { res.status(404).json({ error: 'membership_not_found' }); return; }

    // SECURITY CHECK 1: Only SUPER_ADMIN can modify another SUPER_ADMIN
    if (existing.role === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only a Super Admin can modify another Super Admin.' });
      return;
    }

    // SECURITY CHECK 2: Only SUPER_ADMIN can assign the SUPER_ADMIN role
    if (role === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only a Super Admin can assign the Super Admin role.' });
      return;
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(role ? { role } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(employmentStatus ? { employmentStatus } : {}),
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        department: { select: { id: true, name: true } },
      },
    });
    
    await writeAudit({ action: 'staff.update', resourceType: 'membership', resourceId: membershipId, payload: { role, departmentId, employmentStatus } });
    res.json(updated);
  } catch (err) { next(err); }
});