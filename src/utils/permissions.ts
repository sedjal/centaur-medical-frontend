import type { Permission, ServiceType } from '../types';
import { formatDateFr } from './dates';

export const HOSPITAL_SERVICES: ServiceType[] = [
  'GENERAL',
  'URGENCE',
  'ONCOLOGIE',
  'CARDIOLOGIE',
];

const SERVICE_PERMISSION: Record<ServiceType, Permission> = {
  GENERAL: 'service:general',
  URGENCE: 'service:urgence',
  ONCOLOGIE: 'service:oncologie',
  CARDIOLOGIE: 'service:cardiologie',
};

export function can(permissions: Permission[] | undefined, permission: Permission): boolean {
  return Boolean(permissions?.includes(permission));
}

/** Services the user may see in the UI. Backend still enforces service:*. */
export function allowedHospitalServices(permissions: Permission[] | undefined): ServiceType[] {
  return HOSPITAL_SERVICES.filter((s) => can(permissions, SERVICE_PERMISSION[s]));
}

export function serviceLabel(service: string): string {
  const map: Record<string, string> = {
    GENERAL: 'Chirurgie générale',
    URGENCE: 'Urgences',
    ONCOLOGIE: 'Oncologie',
    CARDIOLOGIE: 'Cardiologie',
  };
  return map[service] || service;
}

export function initials(first?: string, last?: string): string {
  return `${(first || '?')[0]}${(last || '')[0] || ''}`.toUpperCase();
}

export function formatDate(value?: string): string {
  return formatDateFr(value);
}

export function isCritical(status?: string): boolean {
  return String(status || '').toUpperCase() === 'CRITICAL';
}
