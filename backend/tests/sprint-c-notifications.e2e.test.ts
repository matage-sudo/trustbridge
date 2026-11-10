import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/models/prisma';

const TENANT = 'ad0a4777-cee4-4e69-894a-410648d8b22a';
const ALICE = '5578963c-42f6-4683-9ce2-654b5df3c14d';
const authAlice = () => ({ 'x-tenant-id': TENANT, 'x-user-id': ALICE, 'x-role': 'HOSPITAL_ADMIN' });

beforeAll(async () => {
  await prisma.notification.deleteMany({ where: { tenantId: TENANT } });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { tenantId: TENANT } });
  await prisma.$disconnect();
});

describe('GET /v1/me/notifications', () => {
  test('ALLOW: returns empty list and unreadCount=0 when no notifications', async () => {
    const r = await request(app).get('/v1/me/notifications').set(authAlice());
    expect(r.status).toBe(200);
    expect(r.body.unreadCount).toBe(0);
    expect(Array.isArray(r.body.items)).toBe(true);
  });

  test('DENY: missing auth headers → 401 or 403', async () => {
    const r = await request(app).get('/v1/me/notifications');
    expect([401, 403]).toContain(r.status);
  });
});

describe('PATCH /v1/me/notifications/:id/read', () => {
  let notifId = '';

  beforeAll(async () => {
    const r = await request(app).get('/v1/me/notifications').set(authAlice());
    const list = r.body.items;
    if (list.length > 0) notifId = list[0].id;
  });

  test('DENY: invalid id → 400', async () => {
    const r = await request(app).patch('/v1/me/notifications/not-a-uuid/read').set(authAlice());
    expect(r.status).toBe(400);
  });

  test('DENY: unknown id → 404', async () => {
    const r = await request(app).patch('/v1/me/notifications/00000000-0000-0000-0000-000000000000/read').set(authAlice());
    expect(r.status).toBe(404);
  });

  if (notifId) {
    test('ALLOW: marks unread as read', async () => {
      const r = await request(app).patch(`/v1/me/notifications/${notifId}/read`).set(authAlice());
      expect(r.status).toBe(200);
      expect(r.body.isRead).toBe(true);
    });
  }
});

describe('POST /v1/me/notifications/read-all', () => {
  test('ALLOW: marks all as read (returns count)', async () => {
    const r = await request(app).post('/v1/me/notifications/read-all').set(authAlice());
    expect(r.status).toBe(200);
    expect(typeof r.body.updated).toBe('number');
  });
});