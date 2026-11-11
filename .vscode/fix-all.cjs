# fix-all.ps1 — TrustBridge one-shot error killer
# Safe: backs up schema.prisma + server.ts, restores on any failure.
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Bonty\trustbridge\backend'
Set-Location $root
Write-Host "=== TrustBridge: Fix All Errors ===" -ForegroundColor Cyan
Write-Host "Working dir: $root`n"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$nodeSrc = @'
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Client } = require('pg');
require('dotenv').config();

const ROOT = process.cwd();
const SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma');
const SERVER = path.join(ROOT, 'src', 'server.ts');
const COMPLIANCE_TS = path.join(ROOT, 'src', 'routes', 'compliance.ts');

async function main() {
  fs.copyFileSync(SCHEMA, SCHEMA + '.bak');
  fs.copyFileSync(SERVER, SERVER + '.bak');
  let committed = false;

  try {
    // ══════════ 1. DIAGNOSE DB ══════════
    console.log('[1/6] Diagnosing DB...');
    const c = new Client({
      connectionString: process.env.DIRECT_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    await c.connect();

    const dev = await c.query(`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name='updatedAt'
        AND table_name LIKE '%patient_device%'`);
    if (!dev.rows.length) throw new Error('PatientDevice.updatedAt not found in DB');
    const devTable = dev.rows[0].table_name;
    console.log('    PatientDevice table:', devTable);

    await c.query(`ALTER TABLE public."${devTable}" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
    console.log('    DB: updatedAt DEFAULT now() applied');

    const sess = await c.query(`
      SELECT table_name, udt_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND column_name='status'
        AND table_name LIKE '%patient_session%'`);
    if (!sess.rows.length) throw new Error('PatientSession.status not found in DB');
    const sessDataType = sess.rows[0].data_type;
    const sessUdt = sess.rows[0].udt_name;
    console.log('    PatientSession.status: data_type=', sessDataType, 'udt=', sessUdt);

    let enumName = null, enumVals = null;
    if (sessDataType === 'USER-DEFINED') {
      enumName = sessUdt;
      const vals = await c.query(`
        SELECT e.enumlabel FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = $1 ORDER BY e.enumsortorder`, [enumName]);
      enumVals = vals.rows.map(r => r.enumlabel);
      console.log('    Enum found:', enumName, '=', enumVals.join(', '));
    } else {
      console.log('    status column is not an enum — no enum fix needed');
    }
    await c.end();

    // ══════════ 2. PATCH schema.prisma ══════════
    console.log('\n[2/6] Patching schema.prisma...');
    let schema = fs.readFileSync(SCHEMA, 'utf8');

    // 2a. PatientDevice.updatedAt
    const devM = schema.match(/(model\s+PatientDevice\s*\{)([\s\S]*?)(\n\})/);
    if (!devM) throw new Error('PatientDevice model not found in schema');
    const devFixed = devM[2].replace(
      /^(\s*)updatedAt\s+DateTime\??[^\n]*$/m,
      '$1updatedAt DateTime @default(now()) @updatedAt'
    );
    if (devFixed === devM[2] && !devM[2].includes('@default(now())')) {
      throw new Error('Could not rewrite PatientDevice.updatedAt');
    }
    schema = schema.replace(devM[0], devM[1] + devFixed + devM[3]);
    console.log('    PatientDevice.updatedAt => @default(now()) @updatedAt');

    // 2b. PatientSession.status (only if DB has enum)
    if (enumName && enumVals) {
      const sessM = schema.match(/(model\s+PatientSession\s*\{)([\s\S]*?)(\n\})/);
      if (sessM) {
        if (sessM[2].includes('status ' + enumName)) {
          console.log('    PatientSession.status already uses', enumName);
        } else {
          const sessFixed = sessM[2].replace(
            /^(\s*)status\s+String[^\n]*$/m,
            '$1status ' + enumName
          );
          if (sessFixed === sessM[2]) throw new Error('Could not rewrite PatientSession.status');
          schema = schema.replace(sessM[0], sessM[1] + sessFixed + sessM[3]);
          console.log('    PatientSession.status =>', enumName);
        }
        if (!new RegExp('^enum\\s+' + enumName + '\\s*\\{', 'm').test(schema)) {
          schema += '\n\nenum ' + enumName + ' {\n' +
            enumVals.map(v => '  ' + v).join('\n') + '\n}\n';
          console.log('    Added enum block:', enumName);
        } else {
          console.log('    enum block already present');
        }
      } else {
        console.log('    WARN: PatientSession model not in schema — skipped enum');
      }
    }
    fs.writeFileSync(SCHEMA, schema);

    // ══════════ 3. PATCH server.ts ══════════
    console.log('\n[3/6] Patching server.ts for complianceRouter...');
    let server = fs.readFileSync(SERVER, 'utf8');

    if (!fs.existsSync(COMPLIANCE_TS)) {
      console.log('    WARN: src/routes/compliance.ts does not exist');
      console.log('    Skipping mount. Create the route file first (Block 5 task).');
    } else {
      const compSrc = fs.readFileSync(COMPLIANCE_TS, 'utf8');
      const defMatch = compSrc.match(/export\s+default\s+(\w+)/);
      const namedMatch = compSrc.match(/export\s+(?:const|let)\s+(\w*[Rr]outer\w*)/);
      const exportName = defMatch ? defMatch[1] : (namedMatch ? namedMatch[1] : 'complianceRouter');
      const isDefault = !!defMatch;
      console.log('    compliance.ts exports:', exportName, '(default=' + isDefault + ')');

      const alreadyImported = new RegExp(
        'import\\s+[^\\n]*\\b' + exportName + '\\b[^\\n]*from\\s+[\'"].*compliance[\'"]'
      ).test(server);

      if (!alreadyImported) {
        const importRe = /import\s+[^\n]*Router[^\n]*from\s+['"]\.\/routes\/[^'"]+['"];?/g;
        let lastM = null, m;
        while ((m = importRe.exec(server)) !== null) lastM = m;
        if (!lastM) throw new Error('No router imports found in server.ts to anchor to');
        const insertAt = lastM.index + lastM[0].length;
        const importLine = isDefault
          ? `\nimport ${exportName} from './routes/compliance';`
          : `\nimport { ${exportName} } from './routes/compliance';`;
        server = server.slice(0, insertAt) + importLine + server.slice(insertAt);
        console.log('    Import added:', exportName);
      } else {
        console.log('    Already imported:', exportName);
      }

      const mountedRe = /\.use\(\s*['"]\/v1\/compliance['"]/;
      if (!mountedRe.test(server)) {
        const mountRe = /app\.use\(\s*['"]\/v1\/[a-z0-9-]+['"]\s*,[^\n]+\);/g;
        const mounts = [...server.matchAll(mountRe)];
        if (!mounts.length) throw new Error('No existing /v1 mounts found to copy pattern');
        const template = mounts[mounts.length - 1][0];
        const chainM = template.match(/app\.use\(\s*['"]\/v1\/[a-z0-9-]+['"]\s*,\s*(.+?)\s*,?\s*\w+Router\);/);
        const chain = chainM ? chainM[1] : 'requireAuth, tenantMiddleware';
        const insertAt = mounts[mounts.length - 1].index + template.length;
        server = server.slice(0, insertAt) +
          `\n\napp.use('/v1/compliance', ${chain}, ${exportName});` + server.slice(insertAt);
        console.log('    Mounted /v1/compliance with chain:', chain);
      } else {
        console.log('    Already mounted at /v1/compliance');
      }
      fs.writeFileSync(SERVER, server);
    }

    // ══════════ 4. PRISMA GENERATE ══════════
    console.log('\n[4/6] npx prisma generate...');
    const gen = execSync('npx prisma generate', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    if (!/Generated Prisma Client/.test(gen)) throw new Error('prisma generate failed:\n' + gen);
    console.log('    Prisma client regenerated');

    // ══════════ 5. TSC ══════════
    console.log('\n[5/6] npx tsc --noEmit...');
    try {
      execSync('npx tsc --noEmit', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
      console.log('    TypeScript clean');
    } catch (e) {
      throw new Error('tsc failed:\n' + (e.stdout || '') + '\n' + (e.stderr || ''));
    }

    // ══════════ 6. COMMIT ══════════
    console.log('\n[6/6] Committing...');
    fs.unlinkSync(SCHEMA + '.bak');
    fs.unlinkSync(SERVER + '.bak');
    committed = true;
    console.log('    Backups removed');

    console.log('\n=== ALL FIXES APPLIED ===');
    console.log('NEXT:');
    console.log('  1. Stop the backend (Ctrl+C in its terminal)');
    console.log('  2. Restart it (npm run dev)');
    console.log('  3. Re-run the E2E — expect 13/16 + 3 expected 403s');
  } catch (err) {
    console.error('\nFAILED:', err.message);
    if (!committed) {
      console.error('Restoring backups...');
      try { fs.copyFileSync(SCHEMA + '.bak', SCHEMA); } catch {}
      try { fs.copyFileSync(SERVER + '.bak', SERVER); } catch {}
      try { fs.unlinkSync(SCHEMA + '.bak'); } catch {}
      try { fs.unlinkSync(SERVER + '.bak'); } catch {}
      console.error('Reverted. No changes were made.');
    }
    process.exit(1);
  }
}
main();
'@

Write-Host "[0] Writing fixer script to disk..." -ForegroundColor Yellow
$fixerPath = Join-Path $root 'fix-all.cjs'
[System.IO.File]::WriteAllText($fixerPath, $nodeSrc, $utf8NoBom)
Write-Host "    Written: $fixerPath"

Write-Host "`n[1] Running fixer..." -ForegroundColor Yellow
& node fix-all.cjs
$exit = $LASTEXITCODE
Remove-Item $fixerPath -ErrorAction SilentlyContinue

if ($exit -ne 0) {
  Write-Host "`nFixer exited with code $exit — no changes applied." -ForegroundColor Red
  exit $exit
}

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "Now: stop backend -> restart -> re-run E2E." -ForegroundColor Yellow