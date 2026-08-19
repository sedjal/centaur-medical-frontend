import { ref, computed } from 'vue';
import * as patientsApi from '../api/patients.api';
import type { Patient, PatientFormModel } from '../types';
import type { PatientListParams } from '../api/patients.api';
import { useApiError } from './useApiError';

const DISPLAY_PAGE_SIZE = 5;  // rows shown per page in the UI
const FETCH_CHUNK_SIZE = 50;  // rows fetched from backend per request

/**
 * État local patients.
 * Stratégie : on charge 50 par chunk depuis le backend,
 * on affiche 5 par page localement (pas de requête à chaque flip de page).
 * La recherche repart toujours du backend (chunk 1) pour couvrir tous les enregistrements.
 */
export function usePatients() {
  // full buffer fetched from backend
  const allPatients = ref<Patient[]>([]);
  const patient = ref<Patient | null>(null);
  const loading = ref(false);
  const totalPatients = ref(0);     // total reported by backend (tous enregistrements)
  const backendPage = ref(1);       // current backend chunk index
  const displayPage = ref(1);       // current UI page (1 = first 5 items)
  const { error, errorMessage, setError, clearError } = useApiError();

  let currentController: AbortController | null = null;
  // last params used — needed to fetch next backend chunk
  let lastParams: PatientListParams | undefined;

  /** Items visible on the current display page */
  const patients = computed<Patient[]>(() => {
    const start = (displayPage.value - 1) * DISPLAY_PAGE_SIZE;
    return allPatients.value.slice(start, start + DISPLAY_PAGE_SIZE);
  });

  const currentPage = computed(() => displayPage.value);
  const pageLimit = computed(() => DISPLAY_PAGE_SIZE);

  /**
   * Fetch a backend chunk. Pass resetBuffer=true when filters change
   * (search, service) to discard previous results.
   */
  async function fetchPatients(params?: PatientListParams, resetBuffer = true) {
    if (currentController) currentController.abort();
    currentController = new AbortController();
    loading.value = true;
    clearError();
    lastParams = params;
    const chunkPage = resetBuffer ? 1 : backendPage.value + 1;
    try {
      const result = await patientsApi.getPatients({
        ...params,
        page: chunkPage,
        limit: FETCH_CHUNK_SIZE,
      });
      if (resetBuffer) {
        allPatients.value = result.items;
        displayPage.value = 1;
      } else {
        allPatients.value = [...allPatients.value, ...result.items];
      }
      totalPatients.value = result.total;
      backendPage.value = result.page;
      return result;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      setError(err);
      throw err;
    } finally {
      loading.value = false;
      currentController = null;
    }
  }

  /** Navigate to a display page, fetching next backend chunk if needed. */
  async function goToPage(page: number) {
    const maxDisplayable = Math.ceil(allPatients.value.length / DISPLAY_PAGE_SIZE);
    const hasMoreOnBackend = allPatients.value.length < totalPatients.value;
    // If we need items beyond the buffered range, fetch more
    if (page > maxDisplayable && hasMoreOnBackend) {
      await fetchPatients(lastParams, false);
    }
    const maxPage = Math.max(1, Math.ceil(totalPatients.value / DISPLAY_PAGE_SIZE));
    displayPage.value = Math.min(page, maxPage);
  }

  async function fetchPatient(id: string): Promise<Patient | null> {
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
      allPatients.value = allPatients.value.filter((p) => p.id !== id);
      totalPatients.value = Math.max(0, totalPatients.value - 1);
      // Adjust display page if it's now beyond the max
      const maxPage = Math.max(1, Math.ceil(totalPatients.value / DISPLAY_PAGE_SIZE));
      if (displayPage.value > maxPage) displayPage.value = maxPage;
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
    totalPatients,
    currentPage,
    pageLimit,
    error,
    errorMessage,
    fetchPatients,
    fetchPatient,
    createPatient,
    updatePatient,
    deletePatient,
    goToPage,
    clearError,
  };
}
