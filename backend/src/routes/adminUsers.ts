import { Router } from 'express';
import { prisma } from '../models/prisma';
import { pool } from '../db';
import { currentTenant } from '../middleware/tenantContext';
import { sendInviteEmail } from '../services/email';

export const adminUsersRouter = Router();

adminUsersRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { email, role, firstName, lastName } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'Missing required fields: email, role' });
      return;
    }
    
    const normalizedEmail = String(email).trim().toLowerCase();
    let patientId: string | null = null;

    // 1. If Patient, create Patient record automatically (using raw pg to match patients.ts logic)
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

    // 2. Send Invite Email & Create Auth User
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

    // 3. Insert User Identity
    const identity = await prisma.userIdentity.upsert({
      where: { id: authUserId },
      update: { email: normalizedEmail, displayName: firstName && lastName ? `${firstName} ${lastName}` : normalizedEmail.split('@')[0] },
      create: { id: authUserId, email: normalizedEmail, displayName: firstName && lastName ? `${firstName} ${lastName}` : normalizedEmail.split('@')[0] },
    });

    // 4. Insert Membership
    const existingMembership = await prisma.membership.findFirst({ where: { tenantId, userId: authUserId }});
    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          tenantId,
          userId: authUserId,
          role,
          patientId: patientId as string | undefined,
        }
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