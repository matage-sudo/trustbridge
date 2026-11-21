import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit'; // hardening:audit-import
export const auditRouter = Router();
function parseRange(q: any) {
  const from = q.from ? new Date(String(q.from)) : null;
  const to = q.to ? new Date(String(q.to)) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return 'invalid' as const;
  const range: any = {};
  if (from) range.gte = from;
  if (to) range.lte = to;
  return Object.keys(range).length ? { createdAt: range } : {};
}
function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
auditRouter.get('/export', async (req, res, next) => { // hardening:audit-export
  try {
    const { tenantId } = currentTenant();
    const range = parseRange(req.query);
    if (range === 'invalid') { res.status(400).json({ error: 'invalid_date' }); return; }
    const rows = await prisma.auditEvent.findMany({ where: { tenantId, ...range }, orderBy: { createdAt: 'desc' }, take: 5000 });
    await writeAudit({ action: 'audit.export', resourceType: 'audit_event', payload: { rows: rows.length, from: req.query.from ?? null, to: req.query.to ?? null } });
    const header = ['createdAt', 'action', 'actorUserId', 'outcome', 'resourceType', 'resourceId', 'reasonCode', 'correlationId'];
    const lines = [header.join(',')].concat(rows.map((r) => [r.createdAt.toISOString(), r.action, r.actorUserId, r.outcome, r.resourceType, r.resourceId, r.reasonCode, r.correlationId].map(csvCell).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.send(lines.join('\r\n'));
  } catch (err) { next(err); }
});
auditRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const cursor = req.query.cursor as string | undefined;
    const range = parseRange(req.query); // hardening:audit-range-cursor
    if (range === 'invalid') { res.status(400).json({ error: 'invalid_date' }); return; }
    const rows = await prisma.auditEvent.findMany({
      where: { tenantId, ...range }, // hardening:audit-range-where
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;
    res.json({ items, nextCursor });
  } catch (err) { next(err); }
});