import { prisma } from '../src/models/prisma';

const TENANT = 'ad0a4777-cee4-4e69-894a-410648d8b22a';
const BOB = 'd466ded7-8be3-4aa2-80cf-f8578f825f63';

async function main() {
  const all = await prisma.membership.findMany({
    where: { tenantId: TENANT },
    include: { user: { select: { email: true } } },
  });
  console.log('Memberships in demo-alpha:', all.map((m) => ({ id: m.id, role: m.role, patientId: m.patientId, email: m.user?.email })));

  if (all.some((m) => m.userId === BOB)) {
    console.log('Bob already has a membership in demo-alpha.');
    return;
  }
  const created = await prisma.membership.create({ data: { tenantId: TENANT, userId: BOB, role: 'PATIENT' } });
  console.log('Created Bob membership in demo-alpha:', created.id);
}
main()
  .catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());