import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const appointmentsRouter = Router();

appointmentsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const status = req.query.status as string | undefined;

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, hospitalNumber: true } },
        staff: {
          select: {
            id: true,
            user: { select: { displayName: true, email: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });

    res.json({ items: appointments });
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.post('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { patientId, staffId, scheduledAt, durationMins, reason } = req.body;

    if (!patientId || !staffId || !scheduledAt) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }

    const [patient, staff] = await Promise.all([
      prisma.patient.findFirst({ where: { id: patientId, tenantId } }),
      prisma.membership.findFirst({ where: { id: staffId, tenantId } }),
    ]);
    if (!patient || !staff) {
      res.status(404).json({ error: 'patient_or_staff_not_found_in_tenant' });
      return;
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        patientId,
        staffId,
        scheduledAt: new Date(scheduledAt),
        durationMins: durationMins ?? 30,
        reason: reason ?? null,
      },
    });

    await writeAudit({
      action: 'appointment.create',
      resourceType: 'appointment',
      resourceId: appointment.id,
      payload: { patientId, staffId, scheduledAt },
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const { id } = req.params;
    const { status } = req.body;

    const existing = await prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ error: 'appointment_not_found' });
      return;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { ...(status ? { status } : {}) },
    });

    await writeAudit({
      action: 'appointment.update_status',
      resourceType: 'appointment',
      resourceId: id,
      payload: { status },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});