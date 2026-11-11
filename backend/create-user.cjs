const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");
require("dotenv").config();

// Usage: node create-user.cjs <email> <password> <role> [firstName] [lastName]
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log("Usage: node create-user.cjs <email> <password> <role> [firstName] [lastName]");
  console.log("Roles: HOSPITAL_ADMIN, STAFF, PATIENT, PRIVACY_OFFICER");
  process.exit(1);
}

const [email, password, role, firstName, lastName] = args;
const TENANT_ID = "ad0a4777-cee4-4e69-894a-410648d8b22a";

async function provisionUser() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const db = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });

  try {
    await db.connect();
    console.log(`Creating user: ${email}...`);

    // 1. Create Auth User
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so they can log in immediately
    });
    if (authErr) throw new Error(`Auth Error: ${authErr.message}`);
    const userId = authData.user.id;

    // 2. Create User Identity
    await db.query(
      `INSERT INTO user_identities (id, email, "displayName") VALUES ($1, $2, $3)`,
      [userId, email, firstName ? `${firstName} ${lastName}` : email]
    );

    // 3. If Patient, create Patient record
    let patientId = null;
    if (role === 'PATIENT') {
      const hospitalNumber = `HN-${Math.floor(10000 + Math.random() * 90000)}`;
      const patRes = await db.query(
        `INSERT INTO patients ("tenantId", "firstName", "lastName", "dateOfBirth", "hospitalNumber", email) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [TENANT_ID, firstName || 'Unknown', lastName || 'Unknown', '1990-01-01', hospitalNumber, email]
      );
      patientId = patRes.rows[0].id;
    }

    // 4. Create Membership
    await db.query(
      `INSERT INTO memberships ("tenantId", "userId", role, active, "patientId") VALUES ($1, $2, $3, true, $4)`,
      [TENANT_ID, userId, role, patientId]
    );

    console.log(`✅ SUCCESS! ${email} created as ${role}.`);
    if (patientId) console.log(`   Patient Record ID: ${patientId}`);
    
  } catch (err) {
    console.error(`❌ FAILED:`, err.message);
  } finally {
    await db.end();
  }
}

provisionUser();