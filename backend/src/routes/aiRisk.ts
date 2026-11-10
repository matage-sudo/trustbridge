import { Router } from 'express';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';

export const aiRiskRouter = Router();

function calculateAge(dateOfBirth: Date | string): number {
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return Math.max(0, age);
}

function riskLevelFromScore(score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (score >= 75) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 35) return 'MODERATE';
  return 'LOW';
}

function buildRisk(patient: { id: string; firstName: string; lastName: string; dateOfBirth: Date | string; hospitalNumber: string }) {
  const age = calculateAge(patient.dateOfBirth);
  let score = 0;
  const factors: string[] = [];

  if (age >= 65) {
    score += 35;
    factors.push('Age 65+');
  }
  if (age >= 80) {
    score += 15;
    factors.push('Age 80+');
  }
  if (age >= 90) {
    score += 10;
    factors.push('Age 90+');
  }

  const riskLevel = riskLevelFromScore(score);
  return {
    id: patient.id,
    patientId: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    hospitalNumber: patient.hospitalNumber,
    age,
    riskScore: Math.min(score, 100),
    riskLevel,
    riskFactors: factors.length ? factors : ['No elevated age-risk factors'],
  };
}

aiRiskRouter.get('/patients', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const patients = await prisma.patient.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { hospitalNumber: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        hospitalNumber: true,
      },
    });

    const items = patients.map(buildRisk).sort((a, b) => b.riskScore - a.riskScore || a.lastName.localeCompare(b.lastName));
    const summary = {
      total: items.length,
      low: items.filter((item) => item.riskLevel === 'LOW').length,
      moderate: items.filter((item) => item.riskLevel === 'MODERATE').length,
      high: items.filter((item) => item.riskLevel === 'HIGH').length,
      critical: items.filter((item) => item.riskLevel === 'CRITICAL').length,
    };

    res.json({
      generatedAt: new Date().toISOString(),
      items,
      summary,
    });
  } catch (err) {
    next(err);
  }
});
