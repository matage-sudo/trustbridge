import { pool } from '../db';

export async function calculatePatientRisk(tenantId: string, patientId: string) {
  const patientRes = await pool.query('SELECT * FROM patients WHERE id = $1 AND "tenantId" = $2', [patientId, tenantId]);
  if (!patientRes.rows.length) return null;
  const patient = patientRes.rows[0];

  const appts = await pool.query('SELECT id FROM tb_appointments WHERE "patientId" = $1', [patientId]);
  const emergencies = await pool.query('SELECT id FROM emergency_access WHERE "patientId" = $1', [patientId]);

  let score = 0;
  const factors = [];

  // 1. Age Factor
  const age = Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / 31557600000);
  if (age > 70) { score += 30; factors.push('Age > 70'); }
  else if (age > 60) { score += 15; factors.push('Age > 60'); }
  else if (age < 5) { score += 20; factors.push('Pediatric (Age < 5)'); }

  // 2. Visit Frequency Factor
  if (appts.rows.length > 3) { score += 30; factors.push('High visit frequency'); }
  else if (appts.rows.length > 1) { score += 10; factors.push('Moderate visits'); }

  // 3. Emergency History Factor
  if (emergencies.rows.length > 0) { score += 40; factors.push('Prior emergency access'); }

  // Clamp score
  score = Math.min(score, 100);
  let level = 'LOW';
  if (score >= 75) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 25) level = 'MEDIUM';

  return { score, level, factors, age, patientName: `${patient.firstName} ${patient.lastName}`, hospitalNumber: patient.hospitalNumber };
}
