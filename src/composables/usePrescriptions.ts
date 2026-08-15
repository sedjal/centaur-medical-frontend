import { ref } from 'vue';
import * as prescriptionsApi from '../api/prescriptions.api';
import type { PrescriptionListParams } from '../api/prescriptions.api';
import type { Prescription, PrescriptionCreatePayload } from '../types';
import { useApiError } from './useApiError';
import { prescriptionApiMessage } from '../utils/prescriptions';

/**
 * État local prescriptions (pas de store Pinia).
 */
export function usePrescriptions() {
  const prescriptions = ref<Prescription[]>([]);
  const prescription = ref<Prescription | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const cancellingId = ref<string | null>(null);
  const { error, errorMessage, setError, clearError } = useApiError();
  const actionMessage = ref<string | null>(null);

  function applyError(err: unknown, context: 'load' | 'create' | 'cancel') {
    setError(err);
    actionMessage.value = prescriptionApiMessage(err, context);
  }

  async function fetchPrescriptions(params?: PrescriptionListParams) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      prescriptions.value = await prescriptionsApi.getPrescriptions(params);
      return prescriptions.value;
    } catch (err) {
      applyError(err, 'load');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPatientPrescriptions(patientId: string) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      prescriptions.value = await prescriptionsApi.getPatientPrescriptions(patientId);
      return prescriptions.value;
    } catch (err) {
      applyError(err, 'load');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPrescription(id: string) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      prescription.value = await prescriptionsApi.getPrescription(id);
      return prescription.value;
    } catch (err) {
      applyError(err, 'load');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createPrescription(payload: PrescriptionCreatePayload) {
    saving.value = true;
    clearError();
    actionMessage.value = null;
    try {
      const created = await prescriptionsApi.createPrescription(payload);
      prescriptions.value = [created, ...prescriptions.value.filter((p) => p.id !== created.id)];
      return created;
    } catch (err) {
      applyError(err, 'create');
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function cancelPrescription(id: string) {
    cancellingId.value = id;
    clearError();
    actionMessage.value = null;
    try {
      const updated = await prescriptionsApi.cancelPrescription(id);
      prescriptions.value = prescriptions.value.map((p) => (p.id === id ? updated : p));
      if (prescription.value?.id === id) prescription.value = updated;
      return updated;
    } catch (err) {
      applyError(err, 'cancel');
      throw err;
    } finally {
      cancellingId.value = null;
    }
  }

  return {
    prescriptions,
    prescription,
    loading,
    saving,
    cancellingId,
    error,
    errorMessage,
    actionMessage,
    fetchPrescriptions,
    fetchPatientPrescriptions,
    fetchPrescription,
    createPrescription,
    cancelPrescription,
    clearError,
  };
}
