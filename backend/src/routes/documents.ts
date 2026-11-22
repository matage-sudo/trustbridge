import { prisma } from '../models/prisma';
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

    const MIME_EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }; // hardening:documents-ext
    const ext = MIME_EXT[file.mimetype];
    if (!ext) { res.status(400).json({ error: 'unsupported_file_type' }); return; }
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

    // FIX: Notify Doctor and Admin on upload
    try {
      const patient = await prisma.patient.findUnique({ 
        where: { id: r.patientId },
        include: { primaryDoctor: { include: { user: true } } }
      });
      
            if (patient?.primaryDoctor?.user?.email) {
         const { sendEmail } = await import('../services/email');
         await sendEmail(
           patient.primaryDoctor.user.email,
           `New Document Uploaded for ${patient.firstName} ${patient.lastName}`,
           `<p>Hello Dr. ${patient.primaryDoctor.user.displayName || ''},</p>
            <p>A new document has been uploaded to the vault for your patient <strong>${patient.firstName} ${patient.lastName}</strong>.</p>
            <p><strong>File:</strong> ${file.originalname}</p>
            <p>Please log in to the TrustBridge portal to review it.</p>`
         );
      }
    } catch (notifyErr) {
      req.log?.warn({ err: notifyErr }, 'Failed to send document notifications');
    }

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});