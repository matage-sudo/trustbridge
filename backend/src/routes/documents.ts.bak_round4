import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { pool } from '../db';
import { currentTenant } from '../middleware/tenantContext';
import { resolvePatient } from '../services/representation';

export const documentsRouter = Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

documentsRouter.post('/upload', upload.single('file'), async (req: any, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }

    const r = await resolvePatient(req, 'UPLOAD_DOCUMENTS');
    if (!r.ok) { res.status(r.status).json({ error: r.error }); return; }

    const ext = file.originalname.split('.').pop();
    const fileName = `${tenantId}/${userId}/${Date.now()}.${ext}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('patient-documents')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) throw uploadError;

    // 2. Save to DB
    const result = await pool.query(
      `INSERT INTO patient_documents ("tenantId", "patientId", "storageKey", filename, "mimeType", "sizeBytes") 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, r.patientId, fileName, file.originalname, file.mimetype, file.size]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});
