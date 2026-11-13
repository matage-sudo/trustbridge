import { Router } from 'express';
import { prisma } from '../models/prisma';
import { pool } from '../db';
import { currentTenant } from '../middleware/tenantContext';
import { sendInviteEmail } from '../services/email';
import { createClient } from '@supabase/supabase-js';

export const adminUsersRouter = Router();

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
      res.status(400).json({ error: 'Email and role are required.' });
      return;
    }
    
    const normalizedEmail = String(email).trim().toLowerCase();

    // SECURITY CHECK: Only SUPER_ADMIN can create another SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only a Super Admin can create another Super Admin.' });
      return;
    }

    // 1. CHECK IF USER ALREADY EXISTS
    const existingIdentity = await prisma.userIdentity.findUnique({ where: { email: normalizedEmail } });
    
    if (existingIdentity) {
      // Check if they are already in this specific hospital
      const existingMembership = await prisma.membership.findFirst({ 
        where: { tenantId, userId: existingIdentity.id } 
      });
      if (existingMembership) {
        res.status(400).json({ error: 'This email is already registered and has access to this hospital.' });
        return;
      } else {
        res.status(400).json({ error: 'This email is registered in the system but not in this hospital. Please contact support.' });
        return;
      }
    }

    // 2. CREATE PATIENT RECORD IF NEEDED
    let patientId: string | null = null;
    if (role === 'PATIENT') {
      if (!firstName || !lastName) {
        res.status(400).json({ error: 'First name and last name are required for patients.' });
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

    // 3. SEND INVITE & CREATE AUTH USER
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
      res.status(400).json({ error: 'Failed to send invite email. Please check the email address.', detail: inviteError });
      return;
    }

    // 4. CREATE IDENTITY & MEMBERSHIP
    const identity = await prisma.userIdentity.create({
      data: { id: authUserId, email: normalizedEmail, displayName: firstName && lastName ? `${firstName} ${lastName}` : normalizedEmail.split('@')[0] }
    });

    await prisma.membership.create({
      data: { tenantId, userId: identity.id, role, patientId: patientId as string | undefined }
    });

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
    const { role: requesterRole } = currentTenant(); 
    
    const identity = await prisma.userIdentity.findUnique({ 
      where: { email: normalizedEmail },
      include: { memberships: { where: { active: true } } }
    });
    
    if (!identity) {
      res.status(404).json({ error: 'User identity not found in local DB' });
      return;
    }

    const targetRole = identity.memberships[0]?.role;
    if (targetRole === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden: Only a Super Admin can reset another Super Admin\'s MFA.' });
      return;
    }

    await prisma.passkeyCredential.deleteMany({ where: { userId: identity.id } });
    await prisma.recoveryCode.deleteMany({ where: { userId: identity.id } });

    const admin = supabaseAdmin();
    const { data: factorsData, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: identity.id });

    if (!listError && factorsData) {
      for (const factor of factorsData) {
        await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: identity.id });
      }
    }

    const adminId = req.header('x-user-id');
    if (adminId) {
      await prisma.auditEvent.create({
        data: { actorUserId: adminId, action: 'ADMIN_RESET_MFA', resourceType: 'MFA', outcome: 'SUCCESS', payload: { targetUserEmail: normalizedEmail, targetRole } }
      });
    }

    res.json({ success: true, message: 'MFA reset successfully for ' + normalizedEmail });
  } catch (err: any) {
    next(err);
  }
});