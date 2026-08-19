import api from './client';
import type { ClinicalNote, ClinicalNoteCreatePayload } from '../types';

export async function listPatientClinicalNotes(patientId: string) {
  const { data } = await api.get<ClinicalNote[]>(`/patients/${patientId}/clinical-notes`);
  return data;
}

export async function getPatientClinicalNote(patientId: string, noteId: string) {
  const { data } = await api.get<ClinicalNote>(`/patients/${patientId}/clinical-notes/${noteId}`);
  return data;
}

export async function createPatientClinicalNote(patientId: string, payload: ClinicalNoteCreatePayload) {
  const { data } = await api.post<ClinicalNote>(`/patients/${patientId}/clinical-notes`, payload);
  return data;
}

export async function deletePatientClinicalNote(patientId: string, noteId: string) {
  await api.delete(`/patients/${patientId}/clinical-notes/${noteId}`);
}
