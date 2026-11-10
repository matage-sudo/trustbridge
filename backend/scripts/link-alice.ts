import { prisma } from '../src/models/prisma';

const TENANT = 'ad0a4777-cee4-4e69-894a-410648d8b22a';
const USER = '5578963c-42f6-4683-9ce2-654b5df3c14d';
const PATIENT = '82da3b79-2d3c-4501-95d5-d0a41d587e8d';

async function main() {
  const patient = await prisma.patient.findFirst({ where: { id: PATIENT, tenantId: TENANT } });
  if (!patient) throw new Error('John Doe not found in demo-alpha');

  const before = await prisma.membership.findMany({ where: { tenantId: TENANT, userId: USER } });
  console.log('Memberships found:', before.map((m) => ({ id: m.id, role: m.role, patientId: m.patientId })));
  if (before.length === 0) throw new Error('No membership for Alice in demo-alpha');

  const r = await prisma.membership.updateMany({
    where: { tenantId: TENANT, userId: USER },
    data: { patientId: PATIENT },
  });
  console.log('Updated memberships:', r.count);
}

main()
  .catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());