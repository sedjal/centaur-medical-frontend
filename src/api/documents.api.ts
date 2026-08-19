import { ApiError, handleUnauthorized, parseApiError } from './client';
import type { DocumentType, PatientDocument } from '../types';

const baseURL = String(process.env.VUE_APP_API_URL || '/api').replace(/\/$/, '');

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('centaur_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function throwIfNotOk(res: Response, fallbackUrl: string): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) handleUnauthorized(fallbackUrl);
  let data: { error?: string; message?: string } | undefined;
  try {
    data = (await res.json()) as { error?: string; message?: string };
  } catch {
    data = undefined;
  }
  throw parseApiError({
    response: { status: res.status, data },
  });
}

export async function listPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const url = `${baseURL}/patients/${encodeURIComponent(patientId)}/documents`;
  const res = await fetch(url, { headers: authHeaders() });
  await throwIfNotOk(res, url);
  return (await res.json()) as PatientDocument[];
}

export async function uploadPatientDocument(
  patientId: string,
  type: DocumentType,
  file: File
): Promise<PatientDocument> {
  const url = `${baseURL}/patients/${encodeURIComponent(patientId)}/documents`;
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  await throwIfNotOk(res, url);
  return (await res.json()) as PatientDocument;
}

export interface DocumentFileBlob {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export async function downloadPatientDocumentFile(
  patientId: string,
  documentId: string
): Promise<DocumentFileBlob> {
  const url = `${baseURL}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/file`;
  const res = await fetch(url, { headers: authHeaders() });
  await throwIfNotOk(res, url);
  const blob = await res.blob();
  const disp = res.headers.get('content-disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disp);
  const filename = match?.[1] || 'document';
  const mimeType = res.headers.get('content-type') || blob.type || 'application/octet-stream';
  return { blob, filename, mimeType };
}

export async function deletePatientDocument(patientId: string, documentId: string): Promise<void> {
  const url = `${baseURL}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`;
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
  await throwIfNotOk(res, url);
}

export { ApiError };
