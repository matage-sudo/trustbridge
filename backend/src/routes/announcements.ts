import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';

export const announcementsRouter = Router();

announcementsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const items = await prisma.staffAnnouncement.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, title: true, content: true, createdAt: true } });
    res.json({ items });
  } catch (err) { next(err); }
});