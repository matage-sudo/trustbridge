import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import sharp from 'sharp';
import { prisma } from '../models/prisma';
import { currentTenant } from '../middleware/tenantContext';
import { writeAudit } from '../services/audit';
import { resolvePatient } from '../services/representation';
import { notifyPatient } from '../services/notify';
import type { Scope } from '../services/representation';

export const documentsRouter = Router();

const BUCKET = 'patient-documents';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function storage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('storage_not_configured');
  return createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET);
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });

function singleFile(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'upload_failed', detail: err.code });
      return;
    }
    next();
  });
}

// Magic-byte check: never trust the client-supplied mimetype alone
function sniff(buf: Buffer): string | null {
  if (buf.subarray(0, 4).toString() === '%PDF') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.subarray(1, 4).toString() === 'PNG') return 'image/png';
  return null;
}

async function myPatientId(req: Request, scope: Scope): Promise<string | null> {
  const r = await resolvePatient(req, scope);
  return r.ok ? r.patientId : null;
}

// POST /v1/me/documents
documentsRouter.post('/', singleFile, async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const patientId = await myPatientId(req, 'UPLOAD_DOCUMENTS');
    if (!patientId) {
      await writeAudit({ action: 'document.upload', outcome: 'deny', reasonCode: 'no_patient_linked' });
      res.status(403).json({ error: 'no_patient_linked' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'no_file' });
      return;
    }

    const real = sniff(req.file.buffer);
    if (!real || !ALLOWED.has(real) || real !== req.file.mimetype) {
      await writeAudit({ action: 'document.upload', resourceType: 'patient', resourceId: patientId, outcome: 'deny', reasonCode: 'unsupported_or_mismatched_type' });
      res.status(415).json({ error: 'unsupported_or_mismatched_file_type' });
      return;
    }
    // TODO: malware scan placeholder (ClamAV in a later phase)

    const storageKey = `${tenantId}/${patientId}/${randomUUID()}`;
    const { error } = await storage().upload(storageKey, req.file.buffer, { contentType: real });
    if (error) {
      await writeAudit({ action: 'document.upload', outcome: 'error', reasonCode: 'storage_failure' });
      res.status(502).json({ error: 'storage_failure' });
      return;
    }

    const doc = await prisma.patientDocument.create({
      data: {
        tenantId,
        patientId,
        storageKey,
        filename: req.file.originalname.replace(/[^\w.\- ]/g, '_').slice(0, 120),
        mimeType: real,
        sizeBytes: req.file.size,
      },
    });

    await writeAudit({
      action: 'document.uploaded',
      resourceType: 'patient_document',
      resourceId: doc.id,
      payload: { mimeType: real, sizeBytes: req.file.size },
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// GET /v1/me/documents
documentsRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId } = currentTenant();
    const patientId = await myPatientId(req, 'VIEW_DOCUMENTS');
    if (!patientId) {
      res.status(403).json({ error: 'no_patient_linked' });
      return;
    }
    const docs = await prisma.patientDocument.findMany({
      where: { tenantId, patientId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(docs);
  } catch (err) { next(err); }
});

// GET /v1/me/documents/:id/view  (streams with a per-view watermark)
documentsRouter.get('/:id/view', async (req, res, next) => {
  try {
    const { tenantId, userId } = currentTenant();
    const patientId = await myPatientId(req, 'VIEW_DOCUMENTS');
    if (!patientId) {
      res.status(403).json({ error: 'no_patient_linked' });
      return;
    }

    // tenantId AND patientId in the filter: isolation and ownership in one query
    const doc = await prisma.patientDocument.findFirst({
      where: { id: req.params.id, tenantId, patientId, deletedAt: null },
    });
    if (!doc) {
      await writeAudit({ action: 'document.viewed', resourceType: 'patient_document', resourceId: req.params.id, outcome: 'deny', reasonCode: 'not_found_or_not_owner' });
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const { data, error } = await storage().download(doc.storageKey);
    if (error || !data) {
      res.status(502).json({ error: 'storage_failure' });
      return;
    }
    let bytes: Buffer = Buffer.from(await data.arrayBuffer());

    if (doc.watermarkEnabled) {
      const stamp = `${userId.slice(0, 8)} - ${new Date().toISOString()}`;
      if (doc.mimeType === 'application/pdf') {
        const pdf = await PDFDocument.load(bytes);
        for (const page of pdf.getPages()) {
          const { width, height } = page.getSize();
          page.drawText(stamp, {
            x: width * 0.1, y: height * 0.4, size: 28,
            color: rgb(0.6, 0.6, 0.6), opacity: 0.3, rotate: degrees(35),
          });
        }
        bytes = Buffer.from(await pdf.save());
      } else {
        const meta = await sharp(bytes).metadata();
        const w = meta.width ?? 800;
        const h = meta.height ?? 600;
        const svg = Buffer.from(
          `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
          `<text x="50%" y="50%" font-size="${Math.round(w / 20)}" fill="rgba(120,120,120,0.35)" ` +
          `text-anchor="middle" transform="rotate(-30 ${w / 2} ${h / 2})">${stamp}</text></svg>`
        );
        bytes = await sharp(bytes).composite([{ input: svg }]).toBuffer();
      }
    }

    await writeAudit({ action: 'document.viewed', resourceType: 'patient_document', resourceId: doc.id });
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store');
    res.send(bytes);
  } catch (err) { next(err); }
});