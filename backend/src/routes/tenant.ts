import { Router } from 'express';
import { writeAudit } from '../services/audit';
import { getTenantById, listMembershipsForCurrentTenant } from '../services/tenants';
import { currentTenant } from '../middleware/tenantContext';
import { requireRole } from '../middleware/requireRole'; // hardening:tenant-import
export const tenantRouter = Router();
tenantRouter.get('/me/memberships', requireRole('HOSPITAL_ADMIN', 'PRIVACY_OFFICER', 'SECURITY_INVESTIGATOR', 'SUPER_ADMIN'), async (_req, res, next) => { // hardening:tenant-members
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
tenantRouter.post('/probe/audit', requireRole('SUPER_ADMIN'), async (_req, res, next) => { // hardening:tenant-probe
  try {
    const { tenantId, userId } = currentTenant();
    await writeAudit({ action: 'tenant.probe', resourceType: 'tenant', resourceId: tenantId });
    res.status(201).json({ recorded: true, tenantId, userId });
  } catch (err) { next(err); }
});