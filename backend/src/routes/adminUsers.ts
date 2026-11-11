import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { pool } from '../db';
import { currentTenant } from '../middleware/tenantContext';

export const adminUsersRouter = Router();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

adminUsersRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { email, password, role, firstName, lastName } = req.body;

    if (!email || !password || !role) {
      res.status(400).json({ error: 'Missing required fields: email, password, role' });
      return;
    }

    // 1. Create Auth User in Supabase
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authErr) {
      res.status(400).json({ error: authErr.message });
      return;
    }
    const userId = authData.user.id;

    // 2. Insert User Identity
    await pool.query(
      `INSERT INTO user_identities (id, email, "displayName", "updatedAt") VALUES ($1, $2, $3, NOW())`,
      [userId, email, firstName && lastName ? `${firstName} ${lastName}` : email]
    );

    let patientId = null;
    
    // 3. If Patient, create Patient record automatically
    if (role === 'PATIENT') {
      if (!firstName || !lastName) {
         res.status(400).json({ error: 'First name and last name required for patients' });
         return;
      }
      const hospitalNumber = `HN-${Math.floor(100000 + Math.random() * 900000)}`;
      const patRes = await pool.query(
        `INSERT INTO patients ("tenantId", "firstName", "lastName", "dateOfBirth", "hospitalNumber", email, "updatedAt") 
         VALUES ($1, $2, $3, '1990-01-01', $4, $5, NOW()) RETURNING id`,
        [tenantId, firstName, lastName, hospitalNumber, email]
      );
      patientId = patRes.rows[0].id;
    }

    // 4. Insert Membership
    await pool.query(
      `INSERT INTO memberships ("tenantId", "userId", role, active, "patientId", "updatedAt") 
       VALUES ($1, $2, $3, true, $4, NOW())`,
      [tenantId, userId, role, patientId]
    );

    res.status(201).json({ success: true, userId, patientId });
  } catch (err) {
    next(err);
  }
});