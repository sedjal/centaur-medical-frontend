import { parseApiError } from '../api/client';
import type {
  NotificationCreatePayload,
  NotificationStatus,
  NotificationType,
} from '../types';
import { roleDisplayLabel } from './labels';
import { fromDatetimeLocalValue } from './prescriptions';

export type NotificationBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'GENERAL',
  'PATIENT',
  'PRESCRIPTION',
  'MEDICAL_HISTORY',
  'REMINDER',
];

export function notificationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    GENERAL: 'Générale',
    PATIENT: 'Patient',
    PRESCRIPTION: 'Prescription',
    MEDICAL_HISTORY: 'Historique médical',
    REMINDER: 'Rappel',
  };
  return map[type] || type;
}

export function notificationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Planifiée',
    SENT: 'Envoyée',
    READ: 'Lue',
    CANCELLED: 'Annulée',
  };
  return map[status] || status;
}

export function notificationStatusVariant(status: string): NotificationBadgeVariant {
  const map: Record<string, NotificationBadgeVariant> = {
    PENDING: 'warning',
    SENT: 'info',
    READ: 'default',
    CANCELLED: 'danger',
  };
  return map[status] || 'default';
}

export function isNotificationUnread(status: NotificationStatus | string): boolean {
  return status === 'SENT' || status === 'PENDING';
}

export function formatNotificationBadgeCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  if (count > 99) return '99+';
  return String(Math.floor(count));
}

export function formatNotificationDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeNotificationTime(
  value?: string | null,
  now: Date = new Date()
): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (Math.abs(sec) < 45) return 'À l’instant';
  if (sec >= 45 && sec < 3600) return `Il y a ${Math.max(1, Math.round(sec / 60))} min`;
  if (sec >= 3600 && sec < 86400) return `Il y a ${Math.max(1, Math.round(sec / 3600))} h`;
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThen = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startNow.getTime() - startThen.getTime()) / 86_400_000);
  if (dayDiff === 1) {
    return `Hier à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return formatNotificationDate(value);
}

export function staffDirectoryLabel(user: {
  id?: string;
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
}): string {
  const first = user.first_name || user.firstName || '';
  const last = user.last_name || user.lastName || '';
  const name = `${last.toUpperCase()} ${first}`.trim();
  const role = roleDisplayLabel(user.role);
  const head = name || user.email || 'Membre du personnel';
  return role ? `${head} — ${role}` : head;
}

export type NotificationFormFieldErrors = Record<string, string>;

export function validateNotificationForm(input: {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  scheduledAtLocal?: string;
  immediate?: boolean;
  patientId?: string;
}): NotificationFormFieldErrors {
  const errors: NotificationFormFieldErrors = {};
  if (!String(input.recipientId || '').trim()) {
    errors.recipientId = 'Le destinataire est obligatoire.';
  }
  if (!NOTIFICATION_TYPES.includes(input.type as NotificationType)) {
    errors.type = 'Le type est obligatoire.';
  }
  if (!String(input.title || '').trim()) {
    errors.title = 'Le titre est obligatoire.';
  }
  if (!String(input.message || '').trim()) {
    errors.message = 'Le message est obligatoire.';
  }
  if (!input.immediate) {
    if (!String(input.scheduledAtLocal || '').trim()) {
      errors.scheduledAt = 'La date de planification est obligatoire.';
    } else if (!fromDatetimeLocalValue(input.scheduledAtLocal || '')) {
      errors.scheduledAt = 'La date de planification est invalide.';
    }
  }
  return errors;
}

export function buildNotificationPayload(input: {
  recipientId: string;
  patientId?: string;
  type: NotificationType;
  title: string;
  message: string;
  scheduledAtLocal?: string;
  immediate?: boolean;
}): NotificationCreatePayload {
  return {
    recipientId: input.recipientId.trim(),
    patientId: input.patientId?.trim() ? input.patientId.trim() : null,
    type: input.type,
    title: input.title.trim(),
    message: input.message.trim(),
    scheduledAt: input.immediate
      ? new Date().toISOString()
      : fromDatetimeLocalValue(input.scheduledAtLocal || ''),
  };
}

export function notificationApiMessage(
  err: unknown,
  context: 'load' | 'create' | 'read' | 'cancel' = 'load'
): string {
  const parsed = parseApiError(err);
  const status = parsed.status;

  if (status === 403) {
    return "Vous n'avez pas l'autorisation d'effectuer cette action.";
  }
  if (status === 404) {
    return 'Notification introuvable.';
  }
  if (status === 409) {
    if (context === 'cancel') {
      return 'Seules les notifications planifiées (PENDING) peuvent être annulées.';
    }
    if (context === 'read') {
      return 'Cette notification ne peut pas être marquée comme lue.';
    }
    return parsed.message || 'Conflit sur cette notification.';
  }
  if (status === 400) {
    return parsed.message || 'Les données de la notification sont invalides.';
  }
  if (status >= 500) {
    return context === 'load'
      ? 'Impossible de charger les notifications.'
      : "Une erreur est survenue lors de l'opération.";
  }
  return parsed.message || 'Une erreur est survenue.';
}
