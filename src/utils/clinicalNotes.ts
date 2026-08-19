import { parseApiError } from '../api/client';

export const CLINICAL_NOTE_TITLE_MAX = 120;
export const CLINICAL_NOTE_BODY_MAX = 10_000;

export function validateClinicalNoteForm(title: string, body: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const cleanTitle = String(title || '').trim();
  const cleanBody = String(body || '').trim();
  if (!cleanTitle) errors.title = 'Le titre est obligatoire.';
  else if (cleanTitle.length > CLINICAL_NOTE_TITLE_MAX) {
    errors.title = `Le titre ne peut pas dépasser ${CLINICAL_NOTE_TITLE_MAX} caractères.`;
  }
  if (!cleanBody) errors.body = 'Le compte rendu ne peut pas être vide.';
  else if (cleanBody.length > CLINICAL_NOTE_BODY_MAX) {
    errors.body = `Le compte rendu ne peut pas dépasser ${CLINICAL_NOTE_BODY_MAX} caractères.`;
  }
  return errors;
}

export function clinicalNotesApiMessage(err: unknown, context: 'load' | 'create' | 'delete'): string {
  const parsed = parseApiError(err);
  const status = parsed.status;
  if (status === 403) {
    if (context === 'create') return "Vous n'avez pas l'autorisation d'écrire un compte rendu.";
    if (context === 'delete') return "Vous n'avez pas l'autorisation de supprimer un compte rendu.";
    return "Vous n'avez pas l'autorisation de consulter les comptes rendus.";
  }
  if (status === 404) return 'Compte rendu ou patient introuvable.';
  if (status === 400) return parsed.message || 'Titre ou contenu invalide.';
  if (status >= 500) {
    if (context === 'create') return "Impossible d'enregistrer le compte rendu.";
    if (context === 'delete') return 'Impossible de supprimer le compte rendu.';
    return 'Impossible de charger les comptes rendus.';
  }
  return parsed.message || 'Une erreur est survenue.';
}
