import api from './client';
import type { Prescription, PrescriptionCreatePayload, PrescriptionStatus } from '../types';

export interface PrescriptionListParams {
  patientId?: string;
  service?: string;
  status?: PrescriptionStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PrescriptionListResult {
  items: Prescription[];
  total: number;
  page: number;
  limit: number;
}

export async function getPrescriptions(params?: PrescriptionListParams): Promise<PrescriptionListResult> {
  const { data } = await api.get<PrescriptionListResult>('/prescriptions', { params });
  return data;
}

export async function getPrescription(id: string) {
  const { data } = await api.get<Prescription>(`/prescriptions/${id}`);
  return data;
}

export async function getPatientPrescriptions(patientId: string) {
  const { data } = await api.get<Prescription[]>(`/patients/${patientId}/prescriptions`);
  return data;
}

export async function createPrescription(payload: PrescriptionCreatePayload) {
  const { data } = await api.post<Prescription>('/prescriptions', payload);
  return data;
}

export async function cancelPrescription(id: string) {
  const { data } = await api.patch<Prescription>(`/prescriptions/${id}/cancel`);
  return data;
}
