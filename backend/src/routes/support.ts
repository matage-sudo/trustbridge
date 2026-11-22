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
    const owned = await prisma.supportTicket.findFirst({ where: { id: req.params.id, tenantId }, select: { id: true } }); // hardening:support-tenant
    if (!owned) { res.status(404).json({ error: 'ticket_not_found' }); return; }
        const ticket = await prisma.supportTicket.update({ where: { id: owned.id }, data: { adminReply, status: status || 'IN_PROGRESS', resolvedAt: status === 'RESOLVED' ? new Date() : undefined } });
    await writeAudit({ action: 'support_ticket.reply', resourceType: 'support_ticket', resourceId: ticket.id });

    // FIX: Email the patient that their ticket has a reply
    try {
      const ticketOwner = await prisma.membership.findFirst({
        where: { tenantId, userId: ticket.userId },
        include: { user: true },
      });
      if (ticketOwner?.user?.email) {
        const { sendEmail } = await import('../services/email');
        await sendEmail(
          ticketOwner.user.email,
          `Reply to your support ticket: ${ticket.subject}`,
          `<p>Hello,</p>
           <p>Hospital administration has replied to your support ticket <strong>"${ticket.subject}"</strong>.</p>
           <p style="background:#f1f5f9;padding:12px;border-left:3px solid #1e40af;margin:12px 0;"><strong>Reply:</strong><br/>${ticket.adminReply}</p>
           <p><strong>New Status:</strong> ${ticket.status}</p>
           <p>You can view the full conversation in the TrustBridge patient portal.</p>`
        );
      }
    } catch (emailErr) {
      req.log?.warn({ err: emailErr }, 'Failed to send support reply email');
    }

    res.json(ticket);
  } catch (err) { next(err); }
});