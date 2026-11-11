import { Resend } from 'resend';
import { prisma } from '../models/prisma';
import { createNotification, NotificationType } from './notification-store';

// ---------------------------------------------------------------------------
// Channel senders
// ---------------------------------------------------------------------------

let _resend: Resend | null = null;
function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const client = resendClient();
  if (!client) {
    // No RESEND_API_KEY configured — log a warning, don't pretend it sent.
    // eslint-disable-next-line no-console
    console.warn(`[notify] RESEND_API_KEY missing — email to ${to} NOT sent (subject: ${subject})`);
    return;
  }
  try {
    await client.emails.send({
      from: process.env.RESEND_FROM ?? 'TrustBridge <noreply@trustbridge.local>',
      to,
      subject,
      text: body,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(`[notify] Resend send failed for ${to}:`, err?.message ?? err);
    // Do NOT re-throw — the in-app notification is the primary channel.
  }
}

// SMS is deferred — no provider configured yet (Twilio/Africa's Talking later).
// Kept as an explicit no-op so callers can stay unchanged when we add it.
async function sendSms(_to: string, _body: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.warn('[notify] SMS channel not implemented — skipping (add Twilio or Africa\'s Talking later)');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type { NotificationType };

export async function notifyPatient(o: {
  tenantId: string;
  patientId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
}) {
  // 1. Always write the in-app notification first — this is the reliable channel.
  const notif = await createNotification(o);

  // 2. Look up the patient's contact details (email/phone are on the Patient row)
  let email: string | null = null;
  let phone: string | null = null;
  try {
    const p = await prisma.patient.findUnique({
      where: { id: o.patientId },
      select: { email: true, phone: true },
    });
    email = p?.email ?? null;
    phone = p?.phone ?? null;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn(`[notify] Could not load patient contact details:`, err?.message ?? err);
  }

  // 3. Fan out to external channels (fire and forget, never block the request)
  if (email) {
    void sendEmail(email, o.title, o.message);
  }
  if (phone) {
    void sendSms(phone, o.message);
  }

  return notif;
}