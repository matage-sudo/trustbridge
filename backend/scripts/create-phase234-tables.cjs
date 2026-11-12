require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const patientMatch = schemaContent.match(/model Patient \{[\s\S]*?@@schema\("([^"]+)"\)/);
const schemaName = patientMatch ? patientMatch[1] : 'public';
console.log('Patient schema: ' + schemaName + '\n');

const TABLES = ['lab_results','prescriptions','diagnoses','vitals','support_tickets'];

const CREATE_SQL = `
CREATE TABLE "lab_results" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "testName" TEXT NOT NULL,
  "resultValue" TEXT,
  "referenceRange" TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  "orderedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX lab_results_tenant_patient_idx ON "lab_results"("tenantId","patientId");

CREATE TABLE "prescriptions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  medication TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  "prescribedBy" TEXT,
  "prescribedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX prescriptions_tenant_patient_idx ON "prescriptions"("tenantId","patientId");

CREATE TABLE "diagnoses" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  condition TEXT NOT NULL,
  code TEXT,
  severity TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  "diagnosedBy" TEXT,
  notes TEXT,
  "diagnosedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX diagnoses_tenant_patient_idx ON "diagnoses"("tenantId","patientId");

CREATE TABLE "vitals" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "bloodPressure" TEXT,
  "heartRate" INTEGER,
  temperature DOUBLE PRECISION,
  weight DOUBLE PRECISION,
  height DOUBLE PRECISION,
  "oxygenSat" INTEGER,
  "recordedBy" TEXT,
  "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX vitals_tenant_patient_idx ON "vitals"("tenantId","patientId");

CREATE TABLE "support_tickets" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "patientId" UUID,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  "adminReply" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX support_tickets_tenant_status_idx ON "support_tickets"("tenantId",status);
CREATE INDEX support_tickets_tenant_user_idx ON "support_tickets"("tenantId","userId");
`;

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`SET search_path TO "${schemaName}", public`);

    console.log('=== Existing tables (before) ===');
    for (const t of TABLES) {
      const r = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
        [schemaName, t]
      );
      if (r.rows.length === 0) {
        console.log('  ' + t + ': (does not exist)');
      } else {
        console.log('  ' + t + ': ' + r.rows.map(c => c.column_name).join(', '));
      }
    }

    console.log('\n=== Dropping pre-existing tables (aborts if any have rows) ===');
    for (const t of TABLES) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
        [schemaName, t]
      );
      if (exists.rows.length > 0) {
        const cnt = await client.query(`SELECT COUNT(*) FROM "${t}"`);
        const n = Number(cnt.rows[0].count);
        if (n > 0) {
          console.log('  ABORT: ' + t + ' has ' + n + ' rows - stopping. Inspect manually.');
          process.exit(2);
        }
        console.log('  DROP ' + t + ' (0 rows)');
        await client.query(`DROP TABLE "${t}" CASCADE`);
      } else {
        console.log('  ' + t + ': does not exist, skipping');
      }
    }

    console.log('\n=== Creating 5 tables ===');
    await client.query(CREATE_SQL);
    console.log('  CREATE OK');

    const verify = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = ANY($2) ORDER BY table_name`,
      [schemaName, TABLES]
    );
    console.log('\n=== Verified tables present ===');
    console.log('  ' + verify.rows.map(r => r.table_name).join(', '));

    const colCheck = await client.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = ANY($2) AND column_name IN ('tenantId','patientId')
       ORDER BY table_name, column_name`,
      [schemaName, TABLES]
    );
    const groups = {};
    colCheck.rows.forEach(r => { (groups[r.table_name] = groups[r.table_name] || []).push(r.column_name); });
    console.log('\n=== camelCase columns verified ===');
    for (const t of TABLES) {
      const cols = (groups[t] || []).join(', ');
      console.log('  ' + t + ': ' + cols);
    }

    console.log('\nTABLES_OK');
  } finally {
    await client.end();
  }
})().catch((e) => { console.error('FAIL', e); process.exit(1); });