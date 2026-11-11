import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';
import { createClient } from '@supabase/supabase-js';

export const staffRouter = Router();

// GET /v1/staff - list memberships (staff) for current tenant
staffRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const search = req.query.search as string | undefined;

    const memberships = await prisma.membership.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              user: {
                OR: [
                  { email: { contains: search, mode: 'insensitive' } },
                  { displayName: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ items: memberships });
  } catch (err) {
    next(err);
  }
});

// GET /v1/staff/departments - list departments for current tenant
staffRouter.get('/departments', async (_req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const departments = await prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    res.json({ items: departments });
  } catch (err) {
    next(err);
  }
});

// POST /v1/staff/create-account - securely create a new user in Supabase + Prisma
staffRouter.post('/create-account', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { email, password, displayName, role } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'email_and_password_required' });
      return;
    }

    // 1. Create in Supabase using the Admin Service Role Key
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    // 2. Create in Prisma Database
    const identity = await prisma.userIdentity.create({
      data: {
        email,
        displayName: displayName || email.split('@')[0],
        memberships: {
          create: {
            tenantId,
            role: role || 'STAFF',
          }
        }
      }
    });

    await writeAudit({
      action: 'staff.create',
      resourceType: 'membership',
      resourceId: identity.id,
      payload: { email, role: role || 'STAFF' },
    });

    res.json({ success: true, userId: identity.id });
  } catch (err) {
    next(err);
  }
});

// POST /v1/staff/reset-password - trigger a Supabase password reset email
staffRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) { 
      res.status(400).json({ error: 'email_required' }); 
      return; 
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);

    if (error) { 
      res.status(400).json({ error: error.message }); 
      return; 
    }
    
    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/staff/:membershipId - update role, department, employment status
staffRouter.patch('/:membershipId', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { membershipId } = req.params;
    const { role, departmentId, employmentStatus } = req.body;

    // Verify the membership belongs to this tenant
    const existing = await prisma.membership.findFirst({
      where: { id: membershipId, tenantId },
    });
    if (!existing) {
      res.status(404).json({ error: 'membership_not_found' });
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

    await writeAudit({
      action: 'staff.update',
      resourceType: 'membership',
      resourceId: membershipId,
      payload: { role, departmentId, employmentStatus },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});