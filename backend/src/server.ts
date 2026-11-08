import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { env } from './config/env';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { tenantRouter } from './routes/tenant';
import { auditRouter } from './routes/audit';

const log = pino({ level: env.LOG_LEVEL });
export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger: log }));

app.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'trustbridge-api', time: new Date().toISOString() });
});

const v1 = express.Router();
v1.use(tenantMiddleware);
v1.use('/tenants', tenantRouter);
v1.use('/audit-events', auditRouter);
app.use('/v1', v1);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error({ err }, 'unhandled');
  res.status(500).json({ error: 'internal_error' });
});

if (require.main === module) {
  app.listen(env.PORT, () => {
    log.info(`TrustBridge API listening on http://localhost:${env.PORT}/v1`);
  });
}