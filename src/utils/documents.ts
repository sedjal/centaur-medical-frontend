import { parseApiError } from '../api/client';
import type { DocumentType } from '../types';

export const DOCUMENT_TYPES: DocumentType[] = ['ECG', 'CARTE_GROUPE', 'ORDONNANCE', 'AUTRE'];

export function documentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ECG: 'ECG',
    CARTE_GROUPE: 'Carte de groupage',
    ORDONNANCE: 'Ordonnance',
    AUTRE: 'Autre',
  };
  return map[type] || type;
}

export function documentFileKind(mimeType: string): 'PDF' | 'PNG' | 'JPG' | 'DOC' | 'FICHIER' {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'image/png') return 'PNG';
  if (mimeType === 'image/jpeg') return 'JPG';
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'DOC';
  }
  return 'FICHIER';
}

export function documentDisplayName(docType: string, filename: string): string {
  const type = documentTypeLabel(docType);
  const base = String(filename || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .trim();
  return base ? `${type} — ${base}` : type;
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round((bytes / 1024) * 10) / 10} Ko`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} Mo`;
}

export function canPreviewDocument(mimeType: string): boolean {
  return (
    mimeType === 'application/pdf' || mimeType === 'image/jpeg' || mimeType === 'image/png'
  );
}

export function documentsApiMessage(
  err: unknown,
  context: 'load' | 'upload' | 'delete' | 'download'
): string {
  const parsed = parseApiError(err);
  const status = parsed.status;
  if (status === 403) {
    if (context === 'upload') return "Vous n'avez pas l'autorisation d'ajouter un document.";
    if (context === 'delete') return "Vous n'avez pas l'autorisation de supprimer un document.";
    return "Vous n'avez pas l'autorisation de consulter les documents.";
  }
  if (status === 404) return 'Document ou patient introuvable.';
  if (status === 413) return 'Le fichier dépasse la taille maximale de 5 Mo.';
  if (status === 409) return 'Impossible de modifier le dossier : conflit.';
  if (status === 400) return parsed.message || 'Fichier ou type invalide.';
  if (status >= 500) {
    if (context === 'upload') return "Impossible d'enregistrer le document.";
    if (context === 'delete') return 'Impossible de supprimer le document.';
    if (context === 'download') return 'Impossible de télécharger le document.';
    return 'Impossible de charger les documents.';
  }
  return parsed.message || 'Une erreur est survenue.';
}
