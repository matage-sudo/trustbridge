import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/models/prisma';

const TENANT = 'ad0a4777-cee4-4e69-894a-410648d8b22a';
const ALICE = '5578963c-42f6-4683-9ce2-654b5df3c14d';
const JOHN = '82da3b79-2d3c-4501-95d5-d0a41d587e8d';
const auth = () => ({ 'x-tenant-id': TENANT, 'x-user-id': ALICE, 'x-role': 'HOSPITAL_ADMIN' });

const validBody = {
  patientId: JOHN,
  purpose: 'UNCONSCIOUS_PATIENT',
  justification: 'Patient arrived unconscious, unable to consent.',
  scope: ['VIEW_PROFILE', 'VIEW_DOCUMENTS'],
};

async function cleanup() {
  await prisma.emergencyAccess.deleteMany({ where: { tenantId: TENANT } });
}

describe('Emergency break-glass access', () => {
  beforeEach(async () => {
    await cleanup();
  });
  
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test('ALLOW: staff can request emergency access', async () => {
    const r = await request(app).post('/v1/emergency/access').set(auth()).send(validBody);
    expect(r.status).toBe(201);
    expect(r.body.grant.purpose).toBe('UNCONSCIOUS_PATIENT');
    expect(r.body.warning).toContain('30 minutes');
  });

  test('DENY: justification too short', async () => {
    const r = await request(app).post('/v1/emergency/access').set(auth())
      .send({ ...validBody, justification: 'short' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('justification_too_short');
  });

  test('DENY: invalid purpose', async () => {
    const r = await request(app).post('/v1/emergency/access').set(auth())
      .send({ ...validBody, purpose: 'BECAUSE_I_WANT_TO' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('invalid_purpose');
  });

  test('DENY: duplicate grant while one is active', async () => {
    await request(app).post('/v1/emergency/access').set(auth()).send(validBody);
    const r = await request(app).post('/v1/emergency/access').set(auth()).send(validBody);
    expect(r.status).toBe(409);
    expect(r.body.error).toBe('already_active');
  });

  test('ALLOW: staff can revoke own grant', async () => {
    const created = await request(app).post('/v1/emergency/access').set(auth()).send(validBody);
    const id = created.body.grant.id;
    const r = await request(app).post(`/v1/emergency/access/${id}/revoke`).set(auth());
    expect(r.status).toBe(200);
    expect(r.body.revokedAt).toBeTruthy();
  });

  test('ALLOW: admin can review (mark justified)', async () => {
    const created = await request(app).post('/v1/emergency/access').set(auth()).send(validBody);
    if (!created.body?.grant?.id) {
      console.error('CREATE FAILED:', created.status, created.body);
      throw new Error('Setup failed: could not create emergency grant');
    }
    const id = created.body.grant.id;
    const r = await request(app).post(`/v1/emergency/admin/access/${id}/review`).set(auth())
      .send({ outcome: 'JUSTIFIED' });
    expect(r.status).toBe(200);
    expect(r.body.reviewOutcome).toBe('JUSTIFIED');
  });
});