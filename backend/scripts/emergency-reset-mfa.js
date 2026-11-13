const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("❌ Please provide an email address. Example: node scripts/emergency-reset-mfa.js admin@hospital.com");
    process.exit(1);
  }

  console.log(`\n🚨 INITIATING EMERGENCY MFA RESET FOR: ${email}\n`);

  // 1. Find User
  const user = await prisma.userIdentity.findUnique({ where: { email } });
  if (!user) {
    console.error("❌ User not found in database.");
    process.exit(1);
  }

  // 2. Delete Passkeys & Recovery Codes
  const pk = await prisma.passkeyCredential.deleteMany({ where: { userId: user.id } });
  const rc = await prisma.recoveryCode.deleteMany({ where: { userId: user.id } });
  console.log(`✅ Deleted ${pk.count} Passkeys and ${rc.count} Recovery Codes from Database.`);

  // 3. Delete Supabase TOTP
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: factors, error } = await supabase.auth.admin.mfa.listFactors({ userId: user.id });
  
  if (factors) {
    for (const f of factors) {
      await supabase.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
    }
    console.log(`✅ Deleted ${factors.length} Authenticator Factors from Supabase.`);
  }

  // 4. Log Audit Event
  await prisma.auditEvent.create({
    data: {
      actorUserId: user.id, // Self-reset via CLI
      action: 'EMERGENCY_CLI_MFA_RESET',
      resourceType: 'MFA',
      outcome: 'SUCCESS',
      payload: { note: 'Triggered manually via backend CLI' }
    }
  });

  console.log(`\n🎉 SUCCESS! ${email} can now log in with just their password.\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());