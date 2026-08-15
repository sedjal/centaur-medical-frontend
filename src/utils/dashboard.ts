import type { ServiceType } from '../types';
import { HOSPITAL_SERVICES, serviceLabel } from './permissions';

export interface ServiceCountRow {
  service: ServiceType;
  label: string;
  count: number;
}

/** Pourcentage d’occupation — utilise `percent` backend si fourni, sinon occupied/capacity. */
export function occupancyPercent(
  occupied: number,
  capacity: number,
  percent?: number | null
): number {
  if (typeof percent === 'number' && Number.isFinite(percent)) {
    return Math.max(0, Math.round(percent));
  }
  if (!capacity || capacity <= 0) return 0;
  return Math.max(0, Math.round((occupied / capacity) * 100));
}

/**
 * Liste les services hospitaliers avec le compte reçu (0 si absent).
 * Retourne [] si byService est vide / absent → EmptyState côté UI.
 */
export function serviceCountRows(
  byService: Record<string, number> | null | undefined
): ServiceCountRow[] {
  if (!byService || Object.keys(byService).length === 0) return [];
  return HOSPITAL_SERVICES.map((service) => ({
    service,
    label: serviceLabel(service),
    count: Number(byService[service] ?? 0),
  }));
}

export function formatLastUpdated(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
