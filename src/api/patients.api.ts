import api from './client';
import type { Patient, PatientFormModel } from '../types';

export interface PatientListParams {
  service?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PatientListResult {
  items: Patient[];
  total: number;
  page: number;
  limit: number;
}

export async function getPatients(params?: PatientListParams): Promise<PatientListResult> {
  const { data } = await api.get<PatientListResult>('/patients', { params });
  return data;
}

export async function getPatient(id: string) {
  const { data } = await api.get<Patient>(`/patients/${id}`);
  return data;
}

export async function createPatient(payload: PatientFormModel) {
  const { data } = await api.post<Patient>('/patients', payload);
  return data;
}

export async function updatePatient(id: string, payload: PatientFormModel) {
  const { data } = await api.put<Patient>(`/patients/${id}`, payload);
  return data;
}

export async function deletePatient(id: string) {
  const { data } = await api.delete(`/patients/${id}`);
  return data;
}
