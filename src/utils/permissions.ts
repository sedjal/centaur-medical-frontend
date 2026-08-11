import type { Permission } from '../types';

export function can(permissions: Permission[] | undefined, permission: Permission): boolean {
  return Boolean(permissions?.includes(permission));
}

export function serviceLabel(service: string): string {
  const map: Record<string, string> = {
    GENERAL: 'Chirurgie Générale',
    URGENCE: 'Urgence',
    ONCOLOGIE: 'Oncologie',
    CARDIOLOGIE: 'Cardiologie',
  };
  return map[service] || service;
}

export function initials(first?: string, last?: string): string {
  return `${(first || '?')[0]}${(last || '')[0] || ''}`.toUpperCase();
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

export function isCritical(status?: string): boolean {
  return String(status || '').toUpperCase() === 'CRITICAL';
}
