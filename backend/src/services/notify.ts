import { createNotification, NotificationType } from './notification-store';

// MOCK PROVIDERS FOR DEMO
async function sendEmail(to: string, subject: string, body: string) {
  console.log(`[EMAIL PROVIDER] To: ${to} | Subject: ${subject}`);
}

async function sendSms(to: string, body: string) {
  console.log(`[SMS PROVIDER] To: ${to} | Body: ${body.slice(0, 50)}...`);
}

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
  // 1. Save to DB (in-app notification)
  const notif = await createNotification(o);
  
  // 2. Fire external channels (mocked for demo)
  // In production, fetch patient email/phone and use Twilio/SendGrid
  sendEmail("patient@example.com", o.title, o.message).catch(() => {});
  sendSms("+254700000000", o.message).catch(() => {});
  
  return notif;
}