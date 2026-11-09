import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const patientsRouter = Router();

patientsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const search = req.query.search as string | undefined;

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { hospitalNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ items: patients });
  } catch (err) {
    next(err);
  }
});

patientsRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { firstName, lastName, dateOfBirth, hospitalNumber } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !hospitalNumber) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }

    const patient = await prisma.patient.create({
      data: {
        tenantId,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        hospitalNumber,
      },
    });

    await writeAudit({
      action: 'patient.create',
      resourceType: 'patient',
      resourceId: patient.id,
      payload: { hospitalNumber },
    });

    res.status(201).json(patient);
  } catch (err) {
    next(err);
  }
});