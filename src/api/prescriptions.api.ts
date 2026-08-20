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
  const { data } = await api.get<PrescriptionListResult | Prescription[]>('/prescriptions', { params });
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, limit: data.length || 50 };
  }
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total ?? 0),
    page: Number(data?.page ?? 1),
    limit: Number(data?.limit ?? 50),
  };
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
