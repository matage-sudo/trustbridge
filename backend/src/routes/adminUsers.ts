import { Router } from 'express';
import { prisma } from '../models/prisma';
import { pool } from '../db';
import { currentTenant } from '../middleware/tenantContext';
import { sendInviteEmail } from '../services/email';
import { createClient } from '@supabase/supabase-js';

export const adminUsersRouter = Router();

// Helper to get Supabase Admin client (same as in email.ts)
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

adminUsersRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId, role: requesterRole } = currentTenant();
    const { email, role, firstName, lastName } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'Missing required fields: email, role' });
      return;
    }

    // SECURITY CHECK: Only SUPER_ADMIN can create another SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only a Super Admin can create another Super Admin.' });
      return;
    }
    
    const normalizedEmail = String(email).trim().toLowerCase();
    let patientId: string | null = null;

    if (role === 'PATIENT') {
      if (!firstName || !lastName) {
        res.status(400).json({ error: 'First name and last name required for patients' });
        return;
      }
      const hospitalNumber = `HN-${Math.floor(100000 + Math.random() * 900000)}`;
      const patRes = await pool.query(
        `INSERT INTO patients ("tenantId", "firstName", "lastName", "dateOfBirth", "hospitalNumber", email, "updatedAt") 
         VALUES ($1, $2, $3, '1990-01-01', $4, $5, NOW()) RETURNING id`,
        [tenantId, firstName, lastName, hospitalNumber, normalizedEmail]
      );
      patientId = patRes.rows[0].id;
    }

    let authUserId: string | null = null;
    let emailSent = false;
    let inviteError: string | null = null;

    try {
      const invite = await sendInviteEmail(normalizedEmail, role === 'PATIENT' ? 'patient' : 'staff');
      authUserId = invite.userId;
      emailSent = invite.emailSent;
    } catch (e: any) {
      inviteError = e?.message ?? 'invite_failed';
    }

    if (!authUserId) {
      res.status(400).json({ error: 'auth_invite_failed', detail: inviteError });
      return;
    }

    const identity = await prisma.userIdentity.upsert({
      where: { id: authUserId },
      update: { email: normalizedEmail, displayName: firstName && lastName ? `${firstName} ${lastName}` : normalizedEmail.split('@')[0] },
      create: { id: authUserId, email: normalizedEmail, displayName: firstName && lastName ? `${firstName} ${lastName}` : normalizedEmail.split('@')[0] },
    });

    const existingMembership = await prisma.membership.findFirst({ where: { tenantId, userId: authUserId }});
    if (!existingMembership) {
      await prisma.membership.create({
        data: { tenantId, userId: authUserId, role, patientId: patientId as string | undefined }
      });
    } else if (patientId && !(existingMembership as any).patientId) {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { patientId: patientId }
      });
    }

    res.status(201).json({ success: true, userId: identity.id, patientId, emailSent, inviteError });
  } catch (err) {
    next(err);
  }
});

// NEW ROUTE: Reset MFA for a specific user
adminUsersRouter.post('/reset-mfa', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const { role: requesterRole } = currentTenant(); // Get the role of the person clicking the button
    
    // 1. Find the UserIdentity in our Prisma DB
    const identity = await prisma.userIdentity.findUnique({ 
      where: { email: normalizedEmail },
      include: { memberships: { where: { active: true } } }
    });
    
    if (!identity) {
      res.status(404).json({ error: 'User identity not found in local DB' });
      return;
    }

    // 2. SECURITY CHECK: Prevent Hospital Admins from resetting Super Admins
    const targetRole = identity.memberships[0]?.role;
    if (targetRole === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only a Super Admin can reset another Super Admin\'s MFA.' });
      return;
    }

    // 3. Delete Passkeys and Recovery Codes from Prisma
    await prisma.passkeyCredential.deleteMany({ where: { userId: identity.id } });
    await prisma.recoveryCode.deleteMany({ where: { userId: identity.id } });

    // 4. Delete TOTP factors from Supabase Auth
    const admin = supabaseAdmin();
    const { data: factorsData, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: identity.id });

    if (!listError && factorsData) {
      for (const factor of factorsData) {
        await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: identity.id });
      }
    }

    // 5. Log the Audit Event
    const adminId = req.header('x-user-id');
    if (adminId) {
      await prisma.auditEvent.create({
        data: {
          actorUserId: adminId,
          action: 'ADMIN_RESET_MFA',
          resourceType: 'MFA',
          outcome: 'SUCCESS',
          payload: { targetUserEmail: normalizedEmail, targetRole }
        }
      });
    }

    res.json({ success: true, message: 'MFA reset successfully for ' + normalizedEmail });
  } catch (err: any) {
    next(err);
  }
});
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    // 1. Find the UserIdentity in our Prisma DB
    const identity = await prisma.userIdentity.findUnique({ where: { email: normalizedEmail } });
    
    if (!identity) {
      res.status(404).json({ error: 'User identity not found in local DB' });
      return;
    }

    // 2. Delete Passkeys and Recovery Codes from Prisma
    await prisma.passkeyCredential.deleteMany({ where: { userId: identity.id } });
    await prisma.recoveryCode.deleteMany({ where: { userId: identity.id } });

    // 3. Delete TOTP factors from Supabase Auth
    const admin = supabaseAdmin();
    
    // List factors for this user
    const { data: factorsData, error: listError } = await admin.auth.admin.mfa.listFactors({
      userId: identity.id
    });

    if (listError) {
      console.warn('Failed to list Supabase MFA factors:', listError.message);
    } else if (factorsData) {
      // Delete all factors (TOTP or otherwise)
      for (const factor of factorsData) {
        await admin.auth.admin.mfa.deleteFactor({
          id: factor.id,
          userId: identity.id
        });
      }
    }

    // 4. Log the Audit Event
    const adminId = req.header('x-user-id');
    if (adminId) {
      await prisma.auditEvent.create({
        data: {
          actorUserId: adminId,
          action: 'ADMIN_RESET_MFA',
          resourceType: 'MFA',
          outcome: 'SUCCESS',
          payload: { targetUserEmail: normalizedEmail }
        }
      });
    }

    res.json({ success: true, message: 'MFA reset successfully for ' + normalizedEmail });
  } catch (err: any) {
    next(err);
  }
});