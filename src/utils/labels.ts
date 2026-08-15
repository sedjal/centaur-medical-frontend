/** Display labels for system roles (UI only — access is permission-based). */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  MEDECIN: 'Médecin',
  SECRETAIRE: 'Secrétaire',
  MEDECIN_URGENCE: 'Médecin urgence',
};

export function roleDisplayLabel(role?: string): string {
  if (!role) return '';
  return ROLE_LABELS[role] || role;
}
