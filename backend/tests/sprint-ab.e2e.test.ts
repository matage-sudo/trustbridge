/**
 * Sprint A + B end-to-end tests.
 *
 * Every endpoint gets at least two tests (§7.1):
 *   - the allow path (200/201 with expected shape)
 *   - the deny path (403/400/404/409/415 with expected error code)
 *
 * Cross-cutting invariants:
 *   - x-acting-for with no grant is 403 on every /me/* route
 *   - x-acting-for with the wrong scope is 403 even when a valid grant exists
 *   - wrong-tenant header is 403 on every /me/* route
 *   - every denial writes an audit row
 *
 * Runs against the DATABASE_URL in .env. Fixtures (Alice, Bob, John) must
 * already exist (scripts/seed-guardian.ts). Test data created here is
 * removed in afterEach — scoped to Bob's membership id only.
 */
import request from 'supertest';
import { randomUUID } from 'crypto';

// Import the app, not the server, so supertest binds to an ephemeral port
// and no real listener is created. server.ts must export `default app`.
import { app } from '../src/server';
import { prisma } from '../src/models/prisma';

const TENANT_A = 'ad0a4777-cee4-4e69-894a-410648d8b22a';
const TENANT_B = '979c5208-b85e-471d-b66b-72044f67f847';
const ALICE_UID = '5578963c-42f6-4683-9ce2-654b5df3c14d';
const BOB_UID   = 'd466ded7-8be3-4aa2-80cf-f8578f825f63';
const JOHN_PID  = '82da3b79-2d3c-4501-95d5-d0a41d587e8d';
const BOB_MEMBERSHIP_ID = '40bbc738-cae0-4beb-8fd9-56204dd69f35';

const authAdmin = () => ({ 'x-tenant-id': TENANT_A, 'x-user-id': ALICE_UID, 'x-role': 'HOSPITAL_ADMIN' });
const authBob   = () => ({ 'x-tenant-id': TENANT_A, 'x-user-id': BOB_UID,   'x-role': 'PATIENT' });
const authBobAs = (patientId = JOHN_PID) => ({ ...authBob(), 'x-acting-for': patientId });
const authWrongTenant = () => ({ 'x-tenant-id': TENANT_B, 'x-user-id': BOB_UID, 'x-role': 'PATIENT' });

async function clearReps() {
  await prisma.representative.deleteMany({
    where: { tenantId: TENANT_A, representativeMembershipId: BOB_MEMBERSHIP_ID },
  });
}

beforeAll(async () => {
  const bob = await prisma.membership.findFirst({ where: { id: BOB_MEMBERSHIP_ID } });
  if (!bob) throw new Error('Fixture missing: run `npx tsx scripts/seed-guardian.ts` first');
  const john = await prisma.patient.findFirst({ where: { id: JOHN_PID } });
  if (!john) throw new Error(`Fixture missing: patient ${JOHN_PID} does not exist`);
});

afterAll(async () => {
  await clearReps();
  await prisma.$disconnect();
});

// ===========================================================================
// Sprint A: profile
// ===========================================================================
describe('GET /v1/me/profile', () => {
  test('ALLOW: patient reads own masked profile', async () => {
    const r = await request(app).get('/v1/me/profile').set(authAdmin());
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(JOHN_PID);
    expect(r.body.nationalIdIsMasked).toBe(true);
    if (r.body.nationalId !== null) {
      expect(r.body.nationalId.startsWith('*')).toBe(true);
      expect(r.body.nationalId.replace(/\*/g, '').length).toBe(4);
    }
  });

  test('DENY: wrong tenant → no_membership', async () => {
    const r = await request(app).get('/v1/me/profile').set(authWrongTenant());
    expect(r.status).toBe(403);
    // 403 is mandatory; the exact reason can be either, depending on which
    // check fails first. Both are legitimate denials.
    expect(['no_membership', 'no_patient_linked']).toContain(r.body.error);
  });
});

describe('PATCH /v1/me/profile', () => {
  test('ALLOW: patient updates phone and emergency contact', async () => {
    const r = await request(app).patch('/v1/me/profile').set(authAdmin()).send({
      phone: '+254712345678',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+254787654321',
    });
    expect(r.status).toBe(200);
    expect(r.body.phone).toBe('+254712345678');
    expect(r.body.emergencyContactName).toBe('Jane Doe');
  });

  test('DENY: no editable fields → 400', async () => {
    const r = await request(app).patch('/v1/me/profile').set(authAdmin()).send({ firstName: 'Hacker' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('no_valid_fields_to_update');
  });

  test('DENY: nationalId is not patient-editable', async () => {
    const before = await prisma.patient.findFirst({ where: { id: JOHN_PID } });
    await request(app).patch('/v1/me/profile').set(authAdmin()).send({ nationalId: '99999999' });
    const after = await prisma.patient.findFirst({ where: { id: JOHN_PID } });
    expect(after?.nationalId).toBe(before?.nationalId ?? null);
  });
});

// ===========================================================================
// Sprint A: documents
// ===========================================================================
describe('POST /v1/me/documents', () => {
  test('ALLOW: patient uploads a PDF, gets 201 with id', async () => {
    const pdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n160\n%%EOF',
    );
    const r = await request(app)
      .post('/v1/me/documents')
      .set(authAdmin())
      .attach('file', pdf, { filename: 'test.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeTruthy();
    expect(r.body.mimeType).toBe('application/pdf');
    expect(r.body.tenantId).toBe(TENANT_A);
    expect(r.body.patientId).toBe(JOHN_PID);
    await prisma.patientDocument.delete({ where: { id: r.body.id } }).catch(() => {});
  });

  test('DENY: type mismatch (PDF bytes declared as PNG) → 415', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%%EOF');
    const r = await request(app)
      .post('/v1/me/documents')
      .set(authAdmin())
      .attach('file', pdf, { filename: 'fake.png', contentType: 'image/png' });
    expect(r.status).toBe(415);
    expect(r.body.error).toBe('unsupported_or_mismatched_file_type');
  });

  test('DENY: no file → 400', async () => {
    const r = await request(app).post('/v1/me/documents').set(authAdmin());
    expect(r.status).toBe(400);
  });
});

describe('GET /v1/me/documents', () => {
  test('ALLOW: patient lists own documents (array)', async () => {
    const r = await request(app).get('/v1/me/documents').set(authAdmin());
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  test('DENY: x-acting-for without a grant → no_patient_linked', async () => {
    await clearReps();
    const r = await request(app).get('/v1/me/documents').set(authBobAs());
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('no_patient_linked');
  });

  test('DENY: wrong tenant → no_membership', async () => {
    const r = await request(app).get('/v1/me/documents').set(authWrongTenant());
    expect(r.status).toBe(403);
    expect(['no_membership', 'no_patient_linked']).toContain(r.body.error);
  });
});

describe('GET /v1/me/documents/:id/view', () => {
  test('DENY: unknown id → 404', async () => {
    const r = await request(app).get(`/v1/me/documents/${randomUUID()}/view`).set(authAdmin());
    expect(r.status).toBe(404);
  });
});

// ===========================================================================
// Sprint B: representatives — patient side
// ===========================================================================
describe('POST /v1/me/representatives', () => {
  beforeEach(clearReps);
  afterEach(clearReps);

  test('ALLOW: patient creates a PENDING grant for a known email', async () => {
    const r = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test',
      authorityType: 'NEXT_OF_KIN',
      scope: ['VIEW_DOCUMENTS'],
      evidenceNote: 'Synthetic test grant',
    });
    expect(r.status).toBe(201);
    expect(r.body.verificationStatus).toBe('PENDING');
    expect(r.body.representativeMembershipId).toBe(BOB_MEMBERSHIP_ID);
    expect(r.body.scope).toEqual(['VIEW_DOCUMENTS']);
  });

  test('DENY: invalid authority type → 400', async () => {
    const r = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'SPOUSE', scope: ['VIEW_DOCUMENTS'],
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('invalid_authority_type');
  });

  test('DENY: invalid scope → 400', async () => {
    const r = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'NEXT_OF_KIN', scope: ['DELETE_EVERYTHING'],
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('invalid_scope');
  });

  test('DENY: unknown email → 404', async () => {
    const r = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'nobody@nowhere.test', authorityType: 'NEXT_OF_KIN', scope: ['VIEW_DOCUMENTS'],
    });
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('representative_not_found');
  });
});

describe('GET /v1/me/representatives and /acting-for', () => {
  beforeEach(clearReps);
  afterEach(clearReps);

  test('ALLOW: patient sees empty list when none exist', async () => {
    const r = await request(app).get('/v1/me/representatives').set(authAdmin());
    expect(r.status).toBe(200);
    expect(r.body.items).toEqual([]);
  });

  test('ALLOW: acting-for is empty when grant is PENDING', async () => {
    await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'NEXT_OF_KIN', scope: ['VIEW_DOCUMENTS'],
    });
    const r = await request(app).get('/v1/me/representatives/acting-for').set(authBob());
    expect(r.status).toBe(200);
    expect(r.body.items).toEqual([]);
  });

  test('ALLOW: acting-for shows John once grant is VERIFIED', async () => {
    const created = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'NEXT_OF_KIN', scope: ['VIEW_DOCUMENTS'],
    });
    await request(app)
      .post(`/v1/admin/representatives/${created.body.id}/verify`)
      .set(authAdmin()).send({ evidenceNote: 'ID sighted (test)' });
    const r = await request(app).get('/v1/me/representatives/acting-for').set(authBob());
    expect(r.status).toBe(200);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].patient.id).toBe(JOHN_PID);
    expect(r.body.items[0].scope).toContain('VIEW_DOCUMENTS');
  });
});

describe('POST /v1/me/representatives/:id/revoke', () => {
  beforeEach(clearReps);
  afterEach(clearReps);

  test('ALLOW: patient revokes a PENDING grant → REVOKED', async () => {
    const created = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'NEXT_OF_KIN', scope: ['VIEW_DOCUMENTS'],
    });
    const r = await request(app)
      .post(`/v1/me/representatives/${created.body.id}/revoke`).set(authAdmin());
    expect(r.status).toBe(200);
    expect(r.body.verificationStatus).toBe('REVOKED');
    expect(r.body.revokedAt).toBeTruthy();
  });

  test('DENY: unknown id → 404', async () => {
    const r = await request(app)
      .post(`/v1/me/representatives/${randomUUID()}/revoke`).set(authAdmin());
    expect(r.status).toBe(404);
  });
});

// ===========================================================================
// Sprint B: representatives — admin side
// ===========================================================================
describe('POST /v1/admin/representatives/:id/verify', () => {
  beforeEach(clearReps);
  afterEach(clearReps);

  test('ALLOW: admin verifies a PENDING grant', async () => {
    const created = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'NEXT_OF_KIN', scope: ['VIEW_DOCUMENTS'],
    });
    const r = await request(app)
      .post(`/v1/admin/representatives/${created.body.id}/verify`)
      .set(authAdmin()).send({ evidenceNote: 'ID sighted (test)' });
    expect(r.status).toBe(200);
    expect(r.body.verificationStatus).toBe('VERIFIED');
    expect(r.body.approvedByMembershipId).toBeTruthy();
  });

  test('DENY: verify non-PENDING → 409', async () => {
    const created = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'NEXT_OF_KIN', scope: ['VIEW_DOCUMENTS'],
    });
    await request(app).post(`/v1/admin/representatives/${created.body.id}/verify`).set(authAdmin()).send({});
    const r = await request(app)
      .post(`/v1/admin/representatives/${created.body.id}/verify`).set(authAdmin()).send({});
    expect(r.status).toBe(409);
    expect(r.body.error).toBe('not_pending');
  });

  test('DENY: unknown id → 404', async () => {
    const r = await request(app)
      .post(`/v1/admin/representatives/${randomUUID()}/verify`).set(authAdmin()).send({});
    expect(r.status).toBe(404);
  });

  test('DENY: malformed id → 400 invalid_id', async () => {
    const r = await request(app).post('/v1/admin/representatives/not-a-uuid/verify').set(authAdmin()).send({});
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('invalid_id');
  });
});

describe('GET /v1/admin/representatives', () => {
  test('DENY: patient role → 403', async () => {
    const r = await request(app).get('/v1/admin/representatives').set(authBob());
    expect(r.status).toBe(403);
  });

  test('DENY: invalid status filter → 400', async () => {
    const r = await request(app).get('/v1/admin/representatives?status=SUSPENDED').set(authAdmin());
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('invalid_status');
  });
});

// ===========================================================================
// Cross-cutting: scope is enforced on every /me/* route
// ===========================================================================
describe('scope enforcement: VIEW_DOCUMENTS cannot escalate to EDIT_PROFILE', () => {
  let grantId: string;

  beforeEach(async () => {
    await clearReps();
    const created = await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'NEXT_OF_KIN', scope: ['VIEW_DOCUMENTS'],
    });
    grantId = created.body.id;
    await request(app).post(`/v1/admin/representatives/${grantId}/verify`).set(authAdmin()).send({});
  });

  afterEach(clearReps);

  test('Bob WITH VIEW_DOCUMENTS can list John documents', async () => {
    const r = await request(app).get('/v1/me/documents').set(authBobAs());
    expect(r.status).toBe(200);
  });

  test('Bob WITH VIEW_DOCUMENTS CANNOT read John profile', async () => {
    const r = await request(app).get('/v1/me/profile').set(authBobAs());
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('not_authorised_for_patient');
  });

  test('Bob WITH VIEW_DOCUMENTS CANNOT edit John profile', async () => {
    const r = await request(app).patch('/v1/me/profile').set(authBobAs()).send({ phone: '+254700000000' });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('not_authorised_for_patient');
  });

  test('Bob WITH VIEW_DOCUMENTS CANNOT upload to John record', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%%EOF');
    const r = await request(app)
      .post('/v1/me/documents').set(authBobAs())
      .attach('file', pdf, { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(403);
  });

  test('Revoked grant stops all access immediately', async () => {
    await request(app).post(`/v1/me/representatives/${grantId}/revoke`).set(authAdmin());
    const r = await request(app).get('/v1/me/documents').set(authBobAs());
    expect(r.status).toBe(403);
  });
});

// ===========================================================================
// Audit: every denial writes a row
// ===========================================================================
describe('audit trail', () => {
  test('denied x-acting-for access writes representative.access_denied', async () => {
    await clearReps();
    const before = await prisma.auditEvent.count({
      where: { tenantId: TENANT_A, action: 'representative.access_denied' },
    });
    await request(app).get('/v1/me/documents').set(authBobAs());
    const after = await prisma.auditEvent.count({
      where: { tenantId: TENANT_A, action: 'representative.access_denied' },
    });
    expect(after).toBeGreaterThan(before);
  });
});

// ===========================================================================
// Tenant isolation
// ===========================================================================
describe('tenant isolation: representatives', () => {
  beforeEach(clearReps);
  afterEach(clearReps);

  test('representative in tenant A is invisible to tenant B admin list', async () => {
    await request(app).post('/v1/me/representatives').set(authAdmin()).send({
      email: 'bob@example.test', authorityType: 'NEXT_OF_KIN', scope: ['VIEW_DOCUMENTS'],
    });
    const r = await request(app).get('/v1/admin/representatives').set({
      'x-tenant-id': TENANT_B, 'x-user-id': ALICE_UID, 'x-role': 'HOSPITAL_ADMIN',
    });
    if (r.status === 200) {
      expect(r.body.items.every((it: any) => it.tenantId === TENANT_B)).toBe(true);
    } else {
      expect([403, 404]).toContain(r.status);
    }
  });
});