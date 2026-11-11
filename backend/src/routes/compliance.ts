import { Router } from 'express';
import { currentTenant } from '../middleware/tenantContext';
import { callerMembership } from '../services/representation';
import { Pool } from 'pg';

export const complianceRouter = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

complianceRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Compliance API is running. Use /controls for data.' });
});

const DPA_CONTROLS = [
  { id: 'LAW-1', section: 'Lawful Processing', title: 'Lawful basis identified and documented for each processing activity', },
  { id: 'LAW-2', section: 'Lawful Processing', title: 'Consent records maintained where consent is the basis', },
  { id: 'LAW-3', section: 'Lawful Processing', title: 'Special category data handled per Section 33', },
  { id: 'PUR-1', section: 'Purpose Limitation', title: 'Data collected for specific, explicit, and legitimate purposes', },
  { id: 'MIN-1', section: 'Data Minimisation', title: 'Only data necessary for the stated purpose is collected', },
  { id: 'ACC-1', section: 'Accuracy', title: 'Mechanisms in place for correcting inaccurate data', },
  { id: 'RET-1', section: 'Storage Limitation', title: 'Retention periods defined and enforced', },
  { id: 'SEC-1', section: 'Security', title: 'Appropriate technical measures against unauthorised access', },
  { id: 'SEC-2', section: 'Security', title: 'Encryption in transit and at rest', },
  { id: 'SEC-3', section: 'Security', title: 'Access controls and audit logging enabled', },
  { id: 'DSR-1', section: 'Data Subject Rights', title: 'Access request process documented and tested', },
  { id: 'DSR-2', section: 'Data Subject Rights', title: 'Correction request process documented and tested', },
  { id: 'DSR-3', section: 'Data Subject Rights', title: 'Erasure process documented (where legally applicable)', },
  { id: 'BRC-1', section: 'Breach Notification', title: '72-hour breach notification procedure in place', },
  { id: 'DPO-1', section: 'Governance', title: 'Data Protection Officer appointed and contactable', },
  { id: 'IMP-1', section: 'Governance', title: 'Data Protection Impact Assessment completed for high-risk processing', },
];

complianceRouter.get('/controls', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const me = await callerMembership();
    if (!me) { res.status(403).json({ error: 'no_membership' }); return; }

    const existing = await pool.query(
      `SELECT "controlId", "status", "evidence", "updatedAt"
         FROM public.compliance_assessments WHERE "tenantId" = $1`,
      [tenantId]
    );
    const byId = new Map(existing.rows.map((r: any) => [r.controlId, r]));

    const items = DPA_CONTROLS.map((c) => {
      const r = byId.get(c.id);
      return {
        id: c.id,
        section: c.section,
        title: c.title,
        status: r?.status ?? 'NOT_ASSESSED',
        evidence: r?.evidence ?? null,
        updatedAt: r?.updatedAt ?? null,
      };
    });

    res.json({ framework: 'DPA_2019', items });
  } catch (err) { next(err); }
});

complianceRouter.put('/controls/:id', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const me = await callerMembership();
    if (!me || !['HOSPITAL_ADMIN', 'PRIVACY_OFFICER'].includes(me.role as string)) {
      res.status(403).json({ error: 'forbidden' }); return;
    }

    const id = String(req.params.id ?? '');
    if (!DPA_CONTROLS.find((c) => c.id === id)) {
      res.status(404).json({ error: 'unknown_control' }); return;
    }

    const status = String(req.body?.status ?? '');
    if (!['COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE', 'NOT_ASSESSED'].includes(status)) {
      res.status(400).json({ error: 'invalid_status' }); return;
    }
    const evidence = req.body?.evidence ? String(req.body.evidence).slice(0, 1000) : null;

    await pool.query(
      `INSERT INTO public.compliance_assessments
         ("tenantId","framework","controlId","status","evidence","updatedBy")
       VALUES ($1,'DPA_2019',$2,$3,$4,$5)
       ON CONFLICT ("tenantId","controlId") DO UPDATE
         SET "status" = EXCLUDED."status",
             "evidence" = EXCLUDED."evidence",
             "updatedBy" = EXCLUDED."updatedBy",
             "updatedAt" = now()`,
      [tenantId, id, status, evidence, userId]
    );

    res.json({ ok: true, id, status, evidence });
  } catch (err) { next(err); }
});