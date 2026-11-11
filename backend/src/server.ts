import path from 'path';
import { config } from 'dotenv';
// Force synchronous load of .env from the backend root before ANY other import runs
config({ path: path.resolve(process.cwd(), '.env') });
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { env } from './config/env';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { requireAuth } from './middleware/auth';
import { requireRole } from './middleware/requireRole';
import { sessionTracker } from './middleware/sessionTracker';
import { tenantRouter } from './routes/tenant';
import { auditRouter } from './routes/audit';
import { dashboardRouter } from './routes/dashboard';
import { patientsRouter } from './routes/patients';
import { staffRouter } from './routes/staff';
import { appointmentsRouter } from './routes/appointments';
import { consentsRouter } from './routes/consents';
import { accessRequestsRouter } from './routes/accessRequests';
import { rightsRouter } from './routes/rightsRequests';
import { securityRouter } from './routes/security';
import { profileRouter } from './routes/profile';
import { documentsRouter } from './routes/documents';
import { meRepresentativesRouter, adminRepresentativesRouter } from './routes/representatives';
import { notificationsRouter } from './routes/notifications';
import { emergencyRouter } from './routes/emergency';
import { staffDashboardRouter } from './routes/staffDashboard';
import { complianceRouter } from './routes/compliance';
import { aiRiskRouter } from './routes/aiRisk';
import { prisma } from './models/prisma';

const log = pino({ level: env.LOG_LEVEL });
export const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    const localDevelopmentOrigin =
      env.NODE_ENV !== 'production' &&
      !!origin &&
      /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin);
    callback(null, !origin || allowedOrigins.includes(origin) || localDevelopmentOrigin);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger: log }));

app.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'trustbridge-api', time: new Date().toISOString() });
});

app.get('/v1/me/context', requireAuth, async (req, res, next) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      res.status(401).json({ error: 'missing_user_identity' });
      return;
    }

    const membership = await prisma.membership.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, tenantId: true, role: true },
    });
    if (!membership) {
      res.status(403).json({ error: 'no_active_membership' });
      return;
    }

    res.json(membership);
  } catch (err) {
    next(err);
  }
});

const v1 = express.Router();
v1.use(requireAuth);
v1.use(tenantMiddleware);;
v1.use(sessionTracker);
v1.use('/tenants', tenantRouter);
v1.use('/audit-events', auditRouter);
v1.use('/dashboard', dashboardRouter);
v1.use('/patients', patientsRouter);
v1.use('/staff', requireRole('HOSPITAL_ADMIN', 'STAFF'), staffRouter);
v1.use('/appointments', appointmentsRouter);
v1.use('/consents', consentsRouter);
v1.use('/access-requests', accessRequestsRouter);
v1.use('/rights-requests', rightsRouter);
v1.use('/security', securityRouter);
v1.use('/me/profile', profileRouter);
v1.use('/me/documents', documentsRouter);
v1.use('/me/notifications', notificationsRouter);
v1.use('/emergency', emergencyRouter);
v1.use('/staff/dashboard', requireRole('HOSPITAL_ADMIN', 'STAFF'), staffDashboardRouter);
v1.use('/ai-risk', aiRiskRouter);
v1.use('/staff/ai-risk', aiRiskRouter);
v1.use('/compliance', complianceRouter);
v1.use('/me/representatives', meRepresentativesRouter);
v1.use('/admin/representatives', requireRole('HOSPITAL_ADMIN', 'PRIVACY_OFFICER'), adminRepresentativesRouter);
app.use('/v1', v1);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error({ err }, 'unhandled');
  res.status(500).json({ error: String((err as Error)?.message ?? err) });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, '0.0.0.0', () => {
    log.info(`TrustBridge API listening on http://localhost:${env.PORT}/v1`);
  });
}