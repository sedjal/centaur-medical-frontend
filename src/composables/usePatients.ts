import { ref } from 'vue';
import * as patientsApi from '../api/patients.api';
import type { Patient, PatientFormModel } from '../types';
import type { PatientListParams } from '../api/patients.api';
import { useApiError } from './useApiError';

/**
 * État local patients (pas de store Pinia).
 */
export function usePatients() {
  const patients = ref<Patient[]>([]);
  const patient = ref<Patient | null>(null);
  const loading = ref(false);
  const { error, errorMessage, setError, clearError } = useApiError();

  async function fetchPatients(params?: PatientListParams) {
    loading.value = true;
    clearError();
    try {
      patients.value = await patientsApi.getPatients(params);
      return patients.value;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPatient(id: string) {
    loading.value = true;
    clearError();
    try {
      patient.value = await patientsApi.getPatient(id);
      return patient.value;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createPatient(payload: PatientFormModel) {
    loading.value = true;
    clearError();
    try {
      const created = await patientsApi.createPatient(payload);
      return created;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updatePatient(id: string, payload: PatientFormModel) {
    loading.value = true;
    clearError();
    try {
      const updated = await patientsApi.updatePatient(id, payload);
      patient.value = updated;
      return updated;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deletePatient(id: string) {
    loading.value = true;
    clearError();
    try {
      await patientsApi.deletePatient(id);
      patients.value = patients.value.filter((p) => p.id !== id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    patients,
    patient,
    loading,
    error,
    errorMessage,
    fetchPatients,
    fetchPatient,
    createPatient,
    updatePatient,
    deletePatient,
    clearError,
  };
}
