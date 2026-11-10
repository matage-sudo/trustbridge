import { Pool } from 'pg';
import { randomUUID } from 'crypto';

// A dedicated pool for notifications. Prisma's engine has been unreliable on
// this Windows host (P1001 on findFirst/findUnique even though pg/net connect
// work fine), so notifications use pg directly. This is isolated: no other
// code path uses this pool.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export type NotificationType =
  | 'access.granted'
  | 'access.denied'
  | 'document.uploaded'
  | 'representative.requested'
  | 'representative.verified'
  | 'representative.revoked'
  | 'dsr.updated';

export type NotificationRow = {
  id: string;
  tenantId: string;
  patientId: string;
  type: string;
  title: string;
  message: string;
  resourceType: string | null;
  resourceId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export async function createNotification(o: {
  tenantId: string;
  patientId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
}): Promise<NotificationRow> {
  const id = randomUUID();
  const r = await pool.query(
    `INSERT INTO public.notifications
       ("id","tenantId","patientId","type","title","message","resourceType","resourceId")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      id, o.tenantId, o.patientId, o.type, o.title, o.message,
      o.resourceType ?? null, o.resourceId ?? null,
    ]
  );
  return normalizeRow(r.rows[0]);
}

export async function listNotifications(o: {
  tenantId: string;
  patientId: string;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ items: NotificationRow[]; unreadCount: number }> {
  const limit = Math.min(o.limit ?? 50, 100);
  const params: any[] = [o.tenantId, o.patientId];
  let where = `"tenantId" = $1 AND "patientId" = $2`;
  if (o.unreadOnly) where += ` AND "isRead" = false`;

  const itemsResult = await pool.query(
    `SELECT * FROM public.notifications
     WHERE ${where}
     ORDER BY "createdAt" DESC
     LIMIT $3`,
    [...params, limit]
  );

  const unreadResult = await pool.query(
    `SELECT COUNT(*)::int AS n FROM public.notifications
     WHERE "tenantId" = $1 AND "patientId" = $2 AND "isRead" = false`,
    params
  );

  return {
    items: itemsResult.rows.map(normalizeRow),
    unreadCount: unreadResult.rows[0]?.n ?? 0,
  };
}

export async function markRead(o: {
  tenantId: string;
  patientId: string;
  id: string;
}): Promise<NotificationRow | null> {
  const r = await pool.query(
    `UPDATE public.notifications
       SET "isRead" = true, "readAt" = now()
     WHERE "id" = $1 AND "tenantId" = $2 AND "patientId" = $3
     RETURNING *`,
    [o.id, o.tenantId, o.patientId]
  );
  return r.rows[0] ? normalizeRow(r.rows[0]) : null;
}

export async function markAllRead(o: {
  tenantId: string;
  patientId: string;
}): Promise<number> {
  const r = await pool.query(
    `UPDATE public.notifications
       SET "isRead" = true, "readAt" = now()
     WHERE "tenantId" = $1 AND "patientId" = $2 AND "isRead" = false`,
    [o.tenantId, o.patientId]
  );
  return r.rowCount ?? 0;
}

function normalizeRow(row: any): NotificationRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    patientId: row.patientId,
    type: row.type,
    title: row.title,
    message: row.message,
    resourceType: row.resourceType ?? null,
    resourceId: row.resourceId ?? null,
    isRead: row.isRead,
    readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}