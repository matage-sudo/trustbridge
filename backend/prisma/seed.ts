import { MembershipRole, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alpha = await prisma.tenant.upsert({
    where: { slug: 'demo-alpha' },
    update: {},
    create: { slug: 'demo-alpha', name: 'Demo Hospital Alpha (Synthetic)' },
  });
  const beta = await prisma.tenant.upsert({
    where: { slug: 'demo-beta' },
    update: {},
    create: { slug: 'demo-beta', name: 'Demo Hospital Beta (Synthetic)' },
  });
  const alice = await prisma.userIdentity.upsert({
    where: { email: 'alice@example.test' },
    update: {},
    create: { email: 'alice@example.test', displayName: 'Alice Synthetic' },
  });
  const bob = await prisma.userIdentity.upsert({
    where: { email: 'bob@example.test' },
    update: {},
    create: { email: 'bob@example.test', displayName: 'Bob Synthetic' },
  });
  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: alpha.id, userId: alice.id } },
    update: {},
    create: { tenantId: alpha.id, userId: alice.id, role: MembershipRole.HOSPITAL_ADMIN },
  });
  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: beta.id, userId: bob.id } },
    update: {},
    create: { tenantId: beta.id, userId: bob.id, role: MembershipRole.STAFF },
  });
  console.log(JSON.stringify({
    alpha: alpha.id,
    beta: beta.id,
    alice: alice.id,
    bob: bob.id,
  }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });