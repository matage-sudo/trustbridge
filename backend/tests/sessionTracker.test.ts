jest.mock('../src/models/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    patientDevice: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    securityAlert: { create: jest.fn() },
    patientSession: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('../src/middleware/tenantContext', () => ({
  currentTenant: jest.fn(),
}));

import { sessionTracker } from '../src/middleware/sessionTracker';
import { currentTenant } from '../src/middleware/tenantContext';
import { prisma } from '../src/models/prisma';

describe('sessionTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('skips tracking when tenant context is unavailable', async () => {
    (currentTenant as jest.Mock).mockImplementation(() => {
      throw new Error('Tenant context is not available');
    });

    const next = jest.fn();
    const req = {
      header: jest.fn(),
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;

    await sessionTracker(req, {} as any, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('creates a new device alert and active session for a fresh user/device', async () => {
    (currentTenant as jest.Mock).mockReturnValue({
      tenantId: 'tenant-123',
      userId: 'user-456',
      role: 'PATIENT',
      correlationId: 'corr-789',
    });

    const deviceCreate = jest.fn().mockResolvedValue({ id: 'device-1' });
    const alertCreate = jest.fn().mockResolvedValue({ id: 'alert-1' });
    const sessionCreate = jest.fn().mockResolvedValue({ id: 'session-1' });

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const tx = {
        patientDevice: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: deviceCreate,
          update: jest.fn(),
        },
        securityAlert: { create: alertCreate },
        patientSession: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
          create: sessionCreate,
        },
      };

      await callback(tx);
    });

    const req = {
      header: (name: string) => {
        if (name === 'user-agent') return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
        if (name === 'x-forwarded-for') return '203.0.113.42, 10.0.0.5';
        return undefined;
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;

    await sessionTracker(req, {} as any, jest.fn());
    await new Promise((resolve) => setImmediate(resolve));

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deviceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-123', userId: 'user-456' }),
      }),
    );
    expect(alertCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: 'NEW_DEVICE', severity: 'MEDIUM' }),
      }),
    );
    expect(sessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-123', userId: 'user-456' }),
      }),
    );
  });
});
