import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { env } from './config/env';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { tenantRouter } from './routes/tenant';
import { auditRouter } from './routes/audit';
import { dashboardRouter } from './routes/dashboard';
import { patientsRouter } from './routes/patients';
import { staffRouter } from './routes/staff';

const log = pino({ level: env.LOG_LEVEL });
export const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ 
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true 
}));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger: log }));

app.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'trustbridge-api', time: new Date().toISOString() });
});

const v1 = express.Router();
v1.use(tenantMiddleware);
v1.use('/tenants', tenantRouter);
v1.use('/audit-events', auditRouter);
v1.use('/dashboard', dashboardRouter);
v1.use('/patients', patientsRouter);
v1.use('/staff', staffRouter);
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