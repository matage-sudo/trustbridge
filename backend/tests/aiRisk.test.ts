jest.mock('../src/models/prisma', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../src/middleware/tenantContext', () => ({
  currentTenant: jest.fn(),
}));

import express from 'express';
import request from 'supertest';
import { aiRiskRouter } from '../src/routes/aiRisk';
import { currentTenant } from '../src/middleware/tenantContext';
import { prisma } from '../src/models/prisma';

describe('aiRiskRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (currentTenant as jest.Mock).mockReturnValue({ tenantId: 'tenant-123', userId: 'user-456', role: 'HOSPITAL_ADMIN', correlationId: 'corr-789' });
  });

  test('returns tenant-scoped AI risk scores for patients', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'patient-1',
        firstName: 'Aisha',
        lastName: 'Patel',
        hospitalNumber: 'HP-1001',
        dateOfBirth: new Date('1959-06-15T00:00:00.000Z'),
      },
      {
        id: 'patient-2',
        firstName: 'Leo',
        lastName: 'Ng',
        hospitalNumber: 'HP-1002',
        dateOfBirth: new Date('2001-01-10T00:00:00.000Z'),
      },
    ]);

    const app = express();
    app.use('/v1/ai-risk', aiRiskRouter);

    const response = await request(app).get('/v1/ai-risk/patients');

    expect(response.status).toBe(200);
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-123' }),
      }),
    );
    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ patientId: 'patient-1', riskScore: 35, riskLevel: 'MODERATE' }),
        expect.objectContaining({ patientId: 'patient-2', riskScore: 0, riskLevel: 'LOW' }),
      ]),
    );
    expect(response.body.summary.total).toBe(2);
  });
});
