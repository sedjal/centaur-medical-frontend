import { ref } from 'vue';
import * as medicalHistoryApi from '../api/medical-history.api';
import type { MedicalHistoryListParams } from '../api/medical-history.api';
import type { MedicalHistoryItem } from '../types';
import { useApiError } from './useApiError';
import { medicalHistoryApiMessage } from '../utils/medicalHistory';

/**
 * État local historique médical (pas de store Pinia).
 * Lecture seule — aucune mutation exposée.
 */
export function useMedicalHistory() {
  const items = ref<MedicalHistoryItem[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const { error, errorMessage, setError, clearError } = useApiError();
  const actionMessage = ref<string | null>(null);

  function applyError(err: unknown) {
    setError(err);
    actionMessage.value = medicalHistoryApiMessage(err);
  }

  async function fetchMedicalHistory(params?: MedicalHistoryListParams) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      const data = await medicalHistoryApi.getMedicalHistory(params);
      items.value = data.items || [];
      total.value = data.total ?? items.value.length;
      return data;
    } catch (err) {
      applyError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPatientMedicalHistory(patientId: string) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      const data = await medicalHistoryApi.getPatientMedicalHistory(patientId);
      items.value = data.items || [];
      total.value = data.total ?? items.value.length;
      return data;
    } catch (err) {
      applyError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    total,
    loading,
    error,
    errorMessage,
    actionMessage,
    fetchMedicalHistory,
    fetchPatientMedicalHistory,
    clearError,
  };
}
