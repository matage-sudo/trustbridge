import { Router } from 'express';
import { writeAudit } from '../services/audit';
import { getTenantById, listMembershipsForCurrentTenant } from '../services/tenants';
import { currentTenant } from '../middleware/tenantContext';
export const tenantRouter = Router();
tenantRouter.get('/me/memberships', async (_req, res, next) => {
  try { res.json(await listMembershipsForCurrentTenant()); }
  catch (err) { next(err); }
});
tenantRouter.get('/:id', async (req, res, next) => {
  try {
    const tenant = await getTenantById(req.params.id);
    if (!tenant) { res.status(404).json({ error: 'not_found' }); return; }
    res.json(tenant);
  } catch (err) { next(err); }
});
tenantRouter.post('/probe/audit', async (_req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    await writeAudit({ action: 'tenant.probe', resourceType: 'tenant', resourceId: tenantId });
    res.status(201).json({ recorded: true, tenantId, userId });
  } catch (err) { next(err); }
});