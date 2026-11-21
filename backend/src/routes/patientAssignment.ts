import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';

export const patientAssignmentRouter = Router();

// Admin assigns a patient to a doctor
patientAssignmentRouter.post('/assign', async (req, res, next) => {
  try {
    const { tenantId, role } = currentTenant();
    const { patientId, doctorMembershipId } = req.body;

    if (!['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(role as string)) {
      res.status(403).json({ error: 'Only admins can assign patients.' });
      return;
    }

    const doctor = await prisma.membership.findFirst({
      where: { id: doctorMembershipId, tenantId, role: { in: ['STAFF'] } }
    });
    if (!doctor) { res.status(404).json({ error: 'Doctor not found.' }); return; }

    if (!patientId || typeof patientId !== 'string') { res.status(400).json({ error: 'patientId is required.' }); return; } // hardening:assign-tenant
    const existingPatient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!existingPatient) { res.status(404).json({ error: 'Patient not found.' }); return; }
    if (existingPatient.primaryDoctorId === doctor.id) { res.status(400).json({ error: 'Patient is already assigned to this doctor.' }); return; }
    const previousDoctorId = existingPatient.primaryDoctorId;
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: { primaryDoctorId: doctor.id }
    });

    await writeAudit({ action: 'patient.assign_doctor', resourceType: 'patient', resourceId: patient.id, payload: { doctorId: doctor.id, previousDoctorId } }); // hardening:assign-audit
    res.json({ success: true, patient });
  } catch (err) { next(err); }
});

// Doctor transfers a patient to another doctor
patientAssignmentRouter.post('/transfer', async (req, res, next) => {
  try {
    const { tenantId, userId, role } = currentTenant();
    const { patientId, newDoctorMembershipId } = req.body;

    const patient = await prisma.patient.findFirst({ 
      where: { id: patientId, tenantId },
      include: { primaryDoctor: { include: { user: true } } }
    });
    if (!patient) { res.status(404).json({ error: 'Patient not found.' }); return; }

    // Optional: Add security check here to ensure only the current doctor or admin can transfer
    // SECURITY: only the assigned doctor (or an admin) may transfer
    if (role === 'STAFF') {
      const me = await prisma.membership.findFirst({ where: { tenantId, userId } });
      if (!me || patient.primaryDoctorId !== me.id) {
        res.status(403).json({ error: 'You can only transfer your own patients.' });
        return;
      }
    }

    const newDoctor = await prisma.membership.findFirst({
      where: { id: newDoctorMembershipId, tenantId, role: { in: ['STAFF'] } },
      include: { user: true }
    });
    if (!newDoctor) { res.status(404).json({ error: 'New doctor not found.' }); return; }

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: { primaryDoctorId: newDoctor.id }
    });

    // 1. Notify the Patient (if they have an account linked)
    const patientMember = await prisma.membership.findFirst({ where: { tenantId, patientId: patient.id, role: 'PATIENT' } });
    if (patientMember) {
      await prisma.notification.create({
        data: {
          tenantId,
          patientId: patient.id,
          type: 'SYSTEM',
          title: 'Care Team Update',
          message: `You have been transferred to a new doctor: Dr. ${newDoctor.user.displayName || newDoctor.user.email}.`,
        }
      });
    }

    // Admin visibility: recorded in the audit log below (patient names are never broadcast)

    await writeAudit({ action: 'patient.transfer', resourceType: 'patient', resourceId: patient.id, payload: { fromDoctor: patient.primaryDoctorId, toDoctor: newDoctor.id } });
    res.json({ success: true, patient: updatedPatient });
  } catch (err) { next(err); }
});