import { computed, ref } from 'vue';
import { parseApiError, type ApiError } from '../api/client';

/**
 * Normalise l’affichage des erreurs API (pas d’appels HTTP).
 */
export function useApiError() {
  const error = ref<ApiError | null>(null);

  const errorMessage = computed(() => error.value?.message || null);
  const errorStatus = computed(() => error.value?.status ?? null);

  function setError(err: unknown) {
    error.value = parseApiError(err);
  }

  function clearError() {
    error.value = null;
  }

  return {
    error,
    errorMessage,
    errorStatus,
    setError,
    clearError,
  };
}
