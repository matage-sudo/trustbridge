import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../src/server';
const prisma = new PrismaClient();
let ALPHA: string;
let BETA: string;
let ALICE: string;
let BOB: string;
beforeAll(async () => {
  const alpha = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'demo-alpha' } });
  const beta = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'demo-beta' } });
  const alice = await prisma.userIdentity.findUniqueOrThrow({ where: { email: 'alice@example.test' } });
  const bob = await prisma.userIdentity.findUniqueOrThrow({ where: { email: 'bob@example.test' } });
  ALPHA = alpha.id; BETA = beta.id; ALICE = alice.id; BOB = bob.id;
});
afterAll(async () => { await prisma.$disconnect(); });
const as = (tenantId: string, userId: string, role: string) => ({
  'x-tenant-id': tenantId, 'x-user-id': userId, 'x-role': role,
});
describe('tenant isolation (e2e)', () => {
  it('rejects requests without tenant context', async () => {
    await request(app).get('/v1/tenants/me/memberships').expect(401);
  });
  it('rejects malformed tenant id', async () => {
    await request(app).get('/v1/tenants/me/memberships')
      .set({ 'x-tenant-id': 'not-a-uuid', 'x-user-id': 'x', 'x-role': 'y' })
      .expect(401);
  });
  it('alpha admin only sees alpha memberships', async () => {
    const res = await request(app).get('/v1/tenants/me/memberships')
      .set(as(ALPHA, ALICE, 'HOSPITAL_ADMIN')).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const row of res.body) expect(row.tenantId).toBe(ALPHA);
  });
  it('alpha cannot read beta tenant by id', async () => {
    await request(app).get(`/v1/tenants/${BETA}`)
      .set(as(ALPHA, ALICE, 'HOSPITAL_ADMIN')).expect(404);
  });
  it('beta staff cannot read alpha tenant by id', async () => {
    await request(app).get(`/v1/tenants/${ALPHA}`)
      .set(as(BETA, BOB, 'STAFF')).expect(404);
  });
  it('audit write is tenant-scoped and beta stays isolated', async () => {
    await request(app).post('/v1/tenants/probe/audit')
      .set(as(ALPHA, ALICE, 'HOSPITAL_ADMIN')).expect(201);
    const alphaAudit = await request(app).get('/v1/audit-events?limit=10')
      .set(as(ALPHA, ALICE, 'HOSPITAL_ADMIN')).expect(200);
    expect(alphaAudit.body.items.length).toBeGreaterThan(0);
    for (const e of alphaAudit.body.items) expect(e.tenantId).toBe(ALPHA);
    const betaAudit = await request(app).get('/v1/audit-events?limit=10')
      .set(as(BETA, BOB, 'STAFF')).expect(200);
    for (const e of betaAudit.body.items) expect(e.tenantId).toBe(BETA);
  });
});