import api from './api';
import type { Patient, PatientFormModel, DashboardStats, AuditLog } from '../types';

export async function listPatients(params?: { service?: string; search?: string }) {
  const { data } = await api.get<Patient[]>('/patients', { params });
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

export async function getDashboardStats() {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}

export async function getAuditLogs() {
  const { data } = await api.get<AuditLog[]>('/audit-logs');
  return data;
}
