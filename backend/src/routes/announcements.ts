import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { callerMembership } from '../services/representation';
import { writeAudit } from '../services/audit';

export const announcementsRouter = Router();

const AUDIENCES = ['EVERYONE', 'ALL_PATIENTS', 'ALL_STAFF', 'PATIENT', 'STAFF_MEMBER'];
const SENDER_ROLES = ['HOSPITAL_ADMIN', 'SUPER_ADMIN'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What a recipient is allowed to see: only announcements addressed to them.
announcementsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me) { res.status(403).json({ error: 'no_membership' }); return; }

    const or: any[] = [{ audience: 'EVERYONE' }];
    if (me.role === 'PATIENT') {
      or.push({ audience: 'ALL_PATIENTS' });
      if (me.patientId) or.push({ audience: 'PATIENT', targetPatientId: me.patientId });
    } else {
      or.push({ audience: 'ALL_STAFF' });
      or.push({ audience: 'STAFF_MEMBER', targetMembershipId: me.id });
    }

    const items = await prisma.announcement.findMany({
      where: { tenantId, OR: or },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, title: true, content: true, audience: true, createdAt: true },
    });
    res.json({ items });
  } catch (err) { next(err); }
});

// Admin view: everything that has been sent.
announcementsRouter.get('/sent', async (req, res, next) => {
  try {
    const { tenantId, role } = currentTenant();
    if (!SENDER_ROLES.includes(String(role))) { res.status(403).json({ error: 'forbidden' }); return; }
    const items = await prisma.announcement.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, title: true, content: true, audience: true, targetPatientId: true, targetMembershipId: true, createdAt: true },
    });
    res.json({ items });
  } catch (err) { next(err); }
});

// Admin sends an announcement to a chosen audience.
announcementsRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId, userId, role } = currentTenant();
    if (!SENDER_ROLES.includes(String(role))) { res.status(403).json({ error: 'forbidden' }); return; }

    const title = String(req.body?.title ?? '').trim();
    const content = String(req.body?.content ?? '').trim();
    const audience = String(req.body?.audience ?? '');
    if (!title || title.length > 200) { res.status(400).json({ error: 'invalid_title' }); return; }
    if (!content || content.length > 5000) { res.status(400).json({ error: 'invalid_content' }); return; }
    if (!AUDIENCES.includes(audience)) { res.status(400).json({ error: 'invalid_audience' }); return; }

    let targetPatientId: string | null = null;
    let targetMembershipId: string | null = null;

    if (audience === 'PATIENT') {
      const id = String(req.body?.targetPatientId ?? '');
      if (!UUID_RE.test(id)) { res.status(400).json({ error: 'invalid_target_patient' }); return; }
      const p = await prisma.patient.findFirst({ where: { id, tenantId }, select: { id: true } });
      if (!p) { res.status(404).json({ error: 'patient_not_found' }); return; }
      targetPatientId = p.id;
    }

    if (audience === 'STAFF_MEMBER') {
      const id = String(req.body?.targetMembershipId ?? '');
      if (!UUID_RE.test(id)) { res.status(400).json({ error: 'invalid_target_staff' }); return; }
      const m = await prisma.membership.findFirst({ where: { id, tenantId, role: { not: 'PATIENT' } }, select: { id: true } });
      if (!m) { res.status(404).json({ error: 'staff_not_found' }); return; }
      targetMembershipId = m.id;
    }

    const item = await prisma.announcement.create({
      data: { tenantId, title, content, audience, targetPatientId, targetMembershipId, createdByUserId: userId },
      select: { id: true, title: true, audience: true, createdAt: true },
    });

    await writeAudit({ action: 'announcement.create', resourceType: 'announcement', resourceId: item.id, payload: { audience, targetPatientId, targetMembershipId } });
    res.status(201).json(item);
  } catch (err) { next(err); }
});