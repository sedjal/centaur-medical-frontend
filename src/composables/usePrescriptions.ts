import { ref, computed } from 'vue';
import * as prescriptionsApi from '../api/prescriptions.api';
import type { PrescriptionListParams } from '../api/prescriptions.api';
import type { Prescription, PrescriptionCreatePayload } from '../types';
import { useApiError } from './useApiError';
import { prescriptionApiMessage } from '../utils/prescriptions';

const DISPLAY_PAGE_SIZE = 5;
const FETCH_CHUNK_SIZE = 50;


/**
 * État local prescriptions (pas de store Pinia).
 */
export function usePrescriptions() {
  const allPrescriptions = ref<Prescription[]>([]);
  const prescription = ref<Prescription | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const cancellingId = ref<string | null>(null);
  const totalPrescriptions = ref(0);
  const backendPage = ref(1);
  const displayPage = ref(1);
  const { error, errorMessage, setError, clearError } = useApiError();
  const actionMessage = ref<string | null>(null);

  let fetchController: AbortController | null = null;
  let lastParams: PrescriptionListParams | undefined;

  /** Items visible on current display page */
  const prescriptions = computed<Prescription[]>(() => {
    const start = (displayPage.value - 1) * DISPLAY_PAGE_SIZE;
    return allPrescriptions.value.slice(start, start + DISPLAY_PAGE_SIZE);
  });

  const currentPage = computed(() => displayPage.value);
  const pageLimit = computed(() => DISPLAY_PAGE_SIZE);

  function applyError(err: unknown, context: 'load' | 'create' | 'cancel') {
    setError(err);
    actionMessage.value = prescriptionApiMessage(err, context);
  }

  async function fetchPrescriptions(params?: PrescriptionListParams, resetBuffer = true) {
    if (fetchController) fetchController.abort();
    fetchController = new AbortController();
    loading.value = true;
    clearError();
    actionMessage.value = null;
    lastParams = params;
    const chunkPage = resetBuffer ? 1 : backendPage.value + 1;
    try {
      const result = await prescriptionsApi.getPrescriptions({
        ...params,
        page: chunkPage,
        limit: FETCH_CHUNK_SIZE,
      });
      if (resetBuffer) {
        allPrescriptions.value = result.items;
        displayPage.value = 1;
      } else {
        allPrescriptions.value = [...allPrescriptions.value, ...result.items];
      }
      totalPrescriptions.value = result.total;
      backendPage.value = result.page;
      return result;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      applyError(err, 'load');
      throw err;
    } finally {
      loading.value = false;
      fetchController = null;
    }
  }

  async function goToPage(page: number) {
    const maxDisplayable = Math.ceil(allPrescriptions.value.length / DISPLAY_PAGE_SIZE);
    const hasMoreOnBackend = allPrescriptions.value.length < totalPrescriptions.value;
    if (page > maxDisplayable && hasMoreOnBackend) {
      await fetchPrescriptions(lastParams, false);
    }
    const maxPage = Math.max(1, Math.ceil(totalPrescriptions.value / DISPLAY_PAGE_SIZE));
    displayPage.value = Math.min(page, maxPage);
  }

  async function fetchPatientPrescriptions(patientId: string) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      const items = await prescriptionsApi.getPatientPrescriptions(patientId);
      allPrescriptions.value = items;
      totalPrescriptions.value = items.length;
      displayPage.value = 1;
      backendPage.value = 1;
      return items;
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
      allPrescriptions.value = [created, ...allPrescriptions.value.filter((p) => p.id !== created.id)];
      totalPrescriptions.value += 1;
      displayPage.value = 1;
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
      allPrescriptions.value = allPrescriptions.value.map((p) => (p.id === id ? updated : p));
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
    allPrescriptions,
    prescription,
    loading,
    saving,
    cancellingId,
    totalPrescriptions,
    currentPage,
    pageLimit,
    error,
    errorMessage,
    actionMessage,
    fetchPrescriptions,
    fetchPatientPrescriptions,
    fetchPrescription,
    createPrescription,
    cancelPrescription,
    goToPage,
    clearError,
  };
}
