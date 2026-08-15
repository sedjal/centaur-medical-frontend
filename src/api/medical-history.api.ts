import api from './client';
import type {
  MedicalHistoryEventType,
  MedicalHistoryList,
  ServiceType,
} from '../types';

export interface MedicalHistoryListParams {
  patientId?: string;
  service?: ServiceType | string;
  type?: MedicalHistoryEventType | string;
  from?: string;
  to?: string;
}

export async function getMedicalHistory(params?: MedicalHistoryListParams) {
  const { data } = await api.get<MedicalHistoryList>('/medical-history', { params });
  return data;
}

export async function getPatientMedicalHistory(patientId: string) {
  const { data } = await api.get<MedicalHistoryList>(
    `/patients/${patientId}/medical-history`
  );
  return data;
}
