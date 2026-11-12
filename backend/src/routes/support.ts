import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const supportRouter = Router();

supportRouter.post('/tickets', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership) { res.status(403).json({ error: 'membership_not_found' }); return; }
    const { subject, category, message, priority } = req.body;
    if (!subject || !message) { res.status(400).json({ error: 'subject_and_message_required' }); return; }
    const ticket = await prisma.supportTicket.create({ data: { tenantId, userId, patientId: (membership as any).patientId || null, subject, message, category: category || 'GENERAL', priority: priority || 'NORMAL' } });
    await writeAudit({ action: 'support_ticket.create', resourceType: 'support_ticket', resourceId: ticket.id, payload: { subject } });
    res.status(201).json(ticket);
  } catch (err) { next(err); }
});

supportRouter.get('/tickets', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership) { res.status(403).json({ error: 'membership_not_found' }); return; }
    const isAdmin = ['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'].includes(membership.role as string);
    const items = await prisma.supportTicket.findMany({ where: isAdmin ? { tenantId } : { tenantId, userId }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ items });
  } catch (err) { next(err); }
});

supportRouter.post('/tickets/:id/reply', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const membership = await prisma.membership.findFirst({ where: { tenantId, userId } });
    if (!membership || !['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'].includes(membership.role as string)) { res.status(403).json({ error: 'forbidden' }); return; }
    const { adminReply, status } = req.body;
    const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data: { adminReply, status: status || 'IN_PROGRESS', resolvedAt: status === 'RESOLVED' ? new Date() : undefined } });
    await writeAudit({ action: 'support_ticket.reply', resourceType: 'support_ticket', resourceId: ticket.id });
    res.json(ticket);
  } catch (err) { next(err); }
});