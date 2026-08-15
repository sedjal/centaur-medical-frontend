import { parseApiError } from '../api/client';
import type { MedicalHistoryEventType } from '../types';

export type MedicalHistoryBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export const MEDICAL_HISTORY_EVENT_TYPES: MedicalHistoryEventType[] = [
  'HOSPITALIZATION',
  'CONSULTATION',
  'DIAGNOSIS',
  'PRESCRIPTION',
  'RECORD_UPDATE',
];

export function medicalHistoryEventLabel(type: string): string {
  const map: Record<string, string> = {
    HOSPITALIZATION: 'Hospitalisation',
    CONSULTATION: 'Consultation',
    DIAGNOSIS: 'Diagnostic',
    PRESCRIPTION: 'Prescription',
    RECORD_UPDATE: 'Modification du dossier',
  };
  return map[type] || type;
}

export function medicalHistoryEventVariant(type: string): MedicalHistoryBadgeVariant {
  const map: Record<string, MedicalHistoryBadgeVariant> = {
    HOSPITALIZATION: 'warning',
    CONSULTATION: 'success',
    DIAGNOSIS: 'danger',
    PRESCRIPTION: 'info',
    RECORD_UPDATE: 'default',
  };
  return map[type] || 'default';
}

export function formatMedicalHistoryDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Convert HTML date (YYYY-MM-DD) to ISO bound for API filters. */
export function dateInputToIso(value: string, endOfDay = false): string | undefined {
  const trimmed = String(value || '').trim();
  if (!trimmed) return undefined;
  const iso = endOfDay ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`;
  if (Number.isNaN(Date.parse(iso))) return undefined;
  return iso;
}

export function medicalHistoryMetadataLabel(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const parts: string[] = [];
  if (typeof metadata.prescriptionId === 'string' && metadata.prescriptionId) {
    parts.push(`Ordonnance ${metadata.prescriptionId.slice(0, 8)}…`);
  }
  if (metadata.action === 'CREATED') parts.push('Création');
  if (metadata.action === 'CANCELLED') parts.push('Annulation');
  if (metadata.source === 'PATIENT_UPDATE') parts.push('Dossier patient');
  return parts.length ? parts.join(' · ') : null;
}

export function medicalHistoryApiMessage(err: unknown): string {
  const parsed = parseApiError(err);
  const status = parsed.status;

  if (status === 403) {
    return "Vous n'avez pas l'autorisation de consulter l'historique médical.";
  }
  if (status === 404) {
    return 'Patient introuvable.';
  }
  if (status === 400) {
    return parsed.message || 'Filtres invalides.';
  }
  if (status >= 500) {
    return "Impossible de charger l'historique médical.";
  }
  return parsed.message || 'Une erreur est survenue.';
}
