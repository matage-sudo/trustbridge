import { createNotification, NotificationType } from './notification-store';

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
  return createNotification(o);
}